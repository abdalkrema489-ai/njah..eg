// src/jobs/cronJobs.js
'use strict';
const cron               = require('node-cron');
const { pool }           = require('../config/postgres');
const { getRedis }       = require('../config/redis');
const { sendEmail }      = require('../services/emailService');
const { pushNotification } = require('../config/socket');
const { seedAchievements } = require('../services/achievementService');
const { askGemini }      = require('../services/geminiAI');
const logger             = require('../utils/logger');

function startCronJobs() {
  // ── Seed achievements on startup ──
  seedAchievements().then(() => logger.info('✅ Achievements seeded'));

  // ── Study reminders every 30 minutes ──
  cron.schedule('*/30 * * * *', async () => {
    try {
      const { rows } = await pool.query(`
        SELECT ss.*, u.name, u.email
        FROM study_sessions ss JOIN users u ON u.id=ss.user_id
        WHERE ss.status='planned'
          AND ss.start_time BETWEEN NOW() AND NOW()+INTERVAL '30 minutes'
      `);
      for (const s of rows) {
        const timeStr = new Date(s.start_time).toLocaleTimeString('en-EG', { hour:'2-digit', minute:'2-digit' });
        await pushNotification(s.user_id, { type:'reminder', title:'⏰ Study Reminder', body:`${s.subject} session at ${timeStr}!` });
        await pool.query(`INSERT INTO notifications (user_id,type,title,body) VALUES ($1,'reminder',$2,$3)`,
          [s.user_id, `⏰ ${s.subject} in 30 minutes`, `Your session starts at ${timeStr}`]);
        await sendEmail({ to: s.email, template:'reminder', data:{ name:s.name, sessionSubject:s.subject, sessionTime:timeStr } });
      }
      if (rows.length) logger.info(`Sent ${rows.length} reminders`);
    } catch (err) { logger.error('Reminder cron:', err); }
  });

  // ── Streak reset at midnight Cairo ──
  cron.schedule('0 0 * * *', async () => {
    try {
      const { rowCount } = await pool.query(`
        UPDATE users SET streak_days=0
        WHERE last_active::date < CURRENT_DATE-1 AND streak_days > 0
      `);
      if (rowCount) logger.info(`Reset ${rowCount} streaks`);
    } catch (err) { logger.error('Streak cron:', err); }
  }, { timezone: 'Africa/Cairo' });

  // ── Daily deadline alerts at 8 AM Cairo ──
  cron.schedule('0 8 * * *', async () => {
    try {
      const { rows } = await pool.query(`
        SELECT ss.*, u.name FROM study_sessions ss JOIN users u ON u.id=ss.user_id
        WHERE ss.status='planned' AND ss.start_time BETWEEN NOW() AND NOW()+INTERVAL '24 hours'
      `);
      for (const s of rows) {
        await pushNotification(s.user_id, { type:'deadline', title:`📋 Today: ${s.subject}`, body:`Session scheduled — don't forget!` });
        await pool.query(`INSERT INTO notifications (user_id,type,title,body) VALUES ($1,'deadline',$2,$3)`,
          [s.user_id, `📋 Upcoming: ${s.subject}`, `You have a ${s.subject} session today`]);
      }
    } catch (err) { logger.error('Deadline cron:', err); }
  }, { timezone: 'Africa/Cairo' });

  // ── Weekly summary Sundays 9 AM ──
  cron.schedule('0 9 * * 0', async () => {
    try {
      // Process in batches of 100 to avoid loading all users into memory at once
      const BATCH_SIZE = 100;
      let offset = 0;
      let totalSent = 0;

      while (true) {
        const { rows } = await pool.query(`
          SELECT u.id, u.name, u.email,
                 COUNT(ss.id) FILTER(WHERE ss.status='completed') AS sessions_done,
                 COALESCE(SUM(ss.duration) FILTER(WHERE ss.status='completed'),0) AS total_min,
                 u.streak_days, u.xp_points, u.level
          FROM users u LEFT JOIN study_sessions ss ON ss.user_id=u.id
            AND ss.created_at > NOW()-INTERVAL '7 days'
          WHERE u.is_active=true GROUP BY u.id
          LIMIT $1 OFFSET $2
        `, [BATCH_SIZE, offset]);

        if (rows.length === 0) break;

        await Promise.all(rows.map(async u => {
          if (Number(u.sessions_done) > 0) {
            await pool.query(`INSERT INTO notifications (user_id,type,title,body) VALUES ($1,'weekly_summary',$2,$3)`,
              [u.id, '📊 Weekly Summary Ready',
               `This week: ${u.sessions_done} sessions, ${Math.round(Number(u.total_min)/60)}h studied, Level ${u.level} ⭐`]);
            pushNotification(u.id, { type:'weekly_summary', title:'📊 Your Week in Review', body:`${u.sessions_done} sessions completed!` });
            totalSent++;
          }
        }));

        offset += BATCH_SIZE;
        // Brief pause between batches to avoid overwhelming DB + email service
        await new Promise(r => setTimeout(r, 1000));
      }

      logger.info(`Weekly summaries sent to ${totalSent} users`);
    } catch (err) { logger.error('Weekly summary cron:', err); }
  }, { timezone: 'Africa/Cairo' });

  // ── Weekly XP & Leaderboard Report (Fridays 8 PM Cairo) ──
  cron.schedule('0 20 * * 5', async () => {
    try {
      const { rows } = await pool.query(`
        SELECT
          u.id AS user_id,
          u.name,
          SUM(qa.score_pct)::int AS weekly_xp,
          COUNT(qa.id)::int  AS quizzes_count
        FROM users u
        JOIN quiz_attempts qa ON qa.user_id = u.id
        WHERE u.role = 'student'
          AND qa.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY u.id, u.name
        HAVING SUM(qa.score_pct) > 0
      `);

      let count = 0;
      for (const row of rows) {
        const title = '🏆 تقرير الأسبوع';
        const body  = `عاش يا ${row.name}! جمعت ${row.weekly_xp} نقطة XP من ${row.quizzes_count} اختبار هذا الأسبوع. استمر!`;

        await pool.query(
          `INSERT INTO notifications (user_id, type, title, body) VALUES ($1, 'system', $2, $3)`,
          [row.user_id, title, body]
        );

        try {
          pushNotification(row.user_id, { type: 'system', title, body });
          count++;
        } catch {}
      }
      logger.info(`✅ Weekly XP report sent to ${count} students`);
    } catch (err) { logger.error('Weekly XP cron:', err); }
  }, { timezone: 'Africa/Cairo' });

  // ── XP Batch Flush every 5 minutes ──
  cron.schedule('*/5 * * * *', async () => {
    try {
      const redis = getRedis();
      if (!redis || !redis.isOpen) return;
      const keys = await redis.keys('xp_pending:*');
      if (!keys.length) return;
      const values = await Promise.all(keys.map(k => redis.get(k)));
      const updates = keys.map((k, i) => ({
        userId: k.replace('xp_pending:', ''),
        xp: parseInt(values[i] || 0),
      })).filter(u => u.xp > 0);
      if (updates.length) {
        for (const u of updates) {
          await pool.query('UPDATE users SET xp_points=xp_points+$1 WHERE id=$2::uuid', [u.xp, u.userId]);
        }
        await Promise.all(keys.map(k => redis.del(k)));
        logger.info(`XP batch: flushed ${updates.length} users`);
      }
    } catch (e) { logger.error('XP batch cron error:', e.message); }
  });

  // ── FEAT-03: Smart AI Study Reminders — Mondays 7 AM Cairo ──────────
  cron.schedule('0 7 * * 1', async () => {
    try {
      // Find users who have sessions in the past but none planned this week
      const { rows: users } = await pool.query(`
        SELECT u.id, u.name, u.email, u.language,
          (
            SELECT subject FROM study_sessions
            WHERE user_id = u.id AND status = 'completed'
            GROUP BY subject ORDER BY COUNT(*) ASC LIMIT 1
          ) AS weakest_subject,
          (
            SELECT subject FROM study_sessions
            WHERE user_id = u.id AND status = 'completed'
            GROUP BY subject ORDER BY COUNT(*) DESC LIMIT 1
          ) AS strongest_subject,
          (
            SELECT COUNT(*) FROM study_sessions
            WHERE user_id = u.id
              AND start_time BETWEEN NOW() AND NOW() + INTERVAL '7 days'
              AND status = 'planned'
          )::int AS planned_this_week
        FROM users u
        WHERE u.is_active = true
          AND u.role IN ('student', 'university')
          AND (
            SELECT COUNT(*) FROM study_sessions
            WHERE user_id = u.id AND created_at > NOW() - INTERVAL '30 days'
          ) > 0
        LIMIT 500
      `);

      let sent = 0;
      const isAr = (u) => u.language === 'ar';

      for (const u of users) {
        // Only send if they have no planned sessions this week
        if (u.planned_this_week > 0) continue;

        let suggestion;
        try {
          // Ask Gemini for a personalised tip (30s timeout guard)
          const prompt = u.weakest_subject
            ? `A student named ${u.name} is weakest in ${u.weakest_subject} and strongest in ${u.strongest_subject || 'general'}. Write ONE concise study tip (max 2 sentences) for this Monday to help them. Language: ${u.language === 'ar' ? 'Arabic' : 'English'}.`
            : `Give a motivating Monday study tip for a student in 2 sentences. Language: ${u.language === 'ar' ? 'Arabic' : 'English'}.`;

          const resp = await Promise.race([
            askGemini(prompt, null, { maxOutputTokens: 80 }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
          ]);
          suggestion = resp?.text || resp;
        } catch {
          // Fallback template if AI unavailable
          suggestion = isAr(u)
            ? (u.weakest_subject ? `تذكر أن ${u.weakest_subject} تحتاج مزيداً من الاهتمام هذا الأسبوع!` : 'ابدأ أسبوعك بخطة دراسية واضحة.')
            : (u.weakest_subject ? `Focus on ${u.weakest_subject} this week — a little daily practice goes a long way!` : 'Plan your study sessions for this week and stay consistent!');
        }

        const title = isAr(u) ? '🧠 تذكير دراسي لهذا الأسبوع' : '🧠 Smart Study Reminder';

        await Promise.all([
          pool.query(
            `INSERT INTO notifications (user_id, type, title, body) VALUES ($1, 'reminder', $2, $3)`,
            [u.id, title, suggestion]
          ),
          pushNotification(u.id, { type: 'reminder', title, body: suggestion }).catch(() => {}),
        ]);
        sent++;
        // Throttle: 1 per 50ms to avoid thundering herd
        await new Promise(r => setTimeout(r, 50));
      }
      logger.info(`✅ FEAT-03: Smart reminders sent to ${sent}/${users.length} students`);
    } catch (err) { logger.error('Smart reminder cron:', err); }
  }, { timezone: 'Africa/Cairo' });

  logger.info('✅ Cron jobs started');
}

module.exports = { startCronJobs };

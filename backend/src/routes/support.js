'use strict';
const express    = require('express');
const router     = express.Router();
const { pool }   = require('../config/postgres');
const { authenticate } = require('../middleware/auth');
const emailService = require('../services/emailService');
const logger     = require('../utils/logger');
const { rateLimit } = require('express-rate-limit');

const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 tickets / hour
  message: { error: 'Too many support requests. Try again in 1 hour.' },
});

// POST /api/support/ticket — Submit ticket
router.post('/ticket', authenticate, supportLimiter, async (req, res) => {
  try {
    const { category = 'general', subject, message } = req.body;

    // Validation
    if (!subject?.trim()) return res.status(400).json({ error: 'Subject required' });
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
    if (subject.length > 200) return res.status(400).json({ error: 'Subject too long (max 200 chars)' });
    if (message.length > 2000) return res.status(400).json({ error: 'Message too long (max 2000 chars)' });

    // User data
    const { rows } = await pool.query(
      'SELECT name, email, role, grade, school, created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Save to DB
    const { rows: ticket } = await pool.query(`
      INSERT INTO support_tickets (user_id, user_name, user_email, category, subject, message)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `, [req.user.id, user.name, user.email, category, subject.trim(), message.trim()]);

    const ticketId = ticket[0].id.toString().slice(0, 8).toUpperCase();

    // Send email to admin
    const adminEmail = process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL || 'ahmed1abdalkrem1@gmail.com';

    const CATEGORY_LABELS = {
      general:   'عام / General',
      technical: 'مشكلة تقنية / Technical Issue',
      payment:   'مشكلة دفع / Payment Issue',
      account:   'حساب / Account',
      teacher:   'شكوى مدرس / Teacher Complaint',
      other:     'أخرى / Other',
    };

    const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
  .field { margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px; border-right: 4px solid #6366F1; }
  .label { font-size: 12px; color: #666; margin-bottom: 4px; font-weight: 600; text-transform: uppercase; }
  .value { font-size: 14px; color: #333; }
  .message { background: #f0f0ff; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
  .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <h2 style="margin:0">🎓 منصة نجاح — شكوى جديدة</h2>
    <p style="margin:8px 0 0; opacity:0.85">Ticket #${ticketId}</p>
  </div>

  <div class="field">
    <div class="label">👤 المستخدم</div>
    <div class="value"><strong>${user.name}</strong> (${user.email})</div>
  </div>

  <div class="field">
    <div class="label">📊 بيانات الحساب</div>
    <div class="value">
      الدور: ${user.role || 'student'} &nbsp;|&nbsp;
      الصف: ${user.grade || 'N/A'} &nbsp;|&nbsp;
      المدرسة: ${user.school || 'N/A'}<br>
      تاريخ التسجيل: ${new Date(user.created_at).toLocaleDateString('ar-EG')}
    </div>
  </div>

  <div class="field">
    <div class="label">🏷️ الفئة</div>
    <div class="value">${CATEGORY_LABELS[category] || category}</div>
  </div>

  <div class="field">
    <div class="label">📋 الموضوع</div>
    <div class="value"><strong>${subject}</strong></div>
  </div>

  <div class="label" style="margin-bottom:8px">💬 الرسالة</div>
  <div class="message">${message}</div>

  <div class="footer">
    <p>للرد: أرسل إيميل على <a href="mailto:${user.email}">${user.email}</a></p>
    <p>Ticket ID: ${ticket[0].id} &nbsp;|&nbsp; ${new Date().toLocaleString('ar-EG')}</p>
    <p>رابط الأدمن: <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/dashboard">لوحة التحكم</a></p>
  </div>
</div>
</body></html>`;

    await emailService.sendEmail({
      to:      adminEmail,
      subject: `[نجاح] شكوى جديدة #${ticketId}: ${subject}`,
      html:    emailHtml,
      replyTo: user.email,
    });

    // Send confirmation to user
    const confirmHtml = `
<div style="font-family:Arial;max-width:500px;margin:0 auto;padding:20px">
  <h2 style="color:#6366F1">✅ تم استلام شكواك</h2>
  <p>مرحباً <strong>${user.name}</strong>،</p>
  <p>تم استلام شكواك بنجاح. رقم التذكرة: <strong>#${ticketId}</strong></p>
  <p>سيتم الرد عليك خلال 24-48 ساعة على هذا الإيميل.</p>
  <hr>
  <p style="font-size:12px;color:#999">منصة نجاح التعليمية</p>
</div>`;

    emailService.sendEmail({
      to:      user.email,
      subject: `تأكيد استلام شكواك - Ticket #${ticketId}`,
      html:    confirmHtml,
    }).catch(e => logger.warn('Confirmation email failed:', e.message));

    logger.info('Support ticket created', { ticketId, userId: req.user.id, category });
    res.json({ success: true, ticketId, message: 'تم إرسال شكواك بنجاح' });

  } catch (err) {
    logger.error('Support ticket error:', err.message);
    res.status(500).json({ error: 'Failed to submit ticket: ' + err.message });
  }
});

// GET /api/support/my-tickets — User tickets
router.get('/my-tickets', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, category, subject, status, admin_reply, created_at
       FROM support_tickets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ tickets: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

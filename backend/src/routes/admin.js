// ═══════════════════════════════════════════════════════════════
// src/routes/admin.js — Najah Platform Owner Dashboard API (fixed)
// ═══════════════════════════════════════════════════════════════
'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const fs       = require('fs');
const path     = require('path');
const { rateLimit } = require('express-rate-limit');
const router   = express.Router();

const { pool }    = require('../config/postgres');
const Transaction = require('../models/Transaction');
const Group       = require('../models/Group');
const TopUpCode   = require('../models/TopUpCode');
const Coupon      = require('../models/Coupon');
const geminiAI    = require('../services/geminiAI');

const OWNER_EMAIL  = process.env.OWNER_EMAIL          || 'ahmed1abdalkrem1@gmail.com';
const OWNER_HASH   = process.env.OWNER_PASSWORD_HASH   || '';
const OWNER_NAME   = process.env.OWNER_NAME            || 'Ahmed AbdEl-Kareem';
const ADMIN_SECRET = (process.env.JWT_SECRET           || 'secret') + '_ADMIN_OWNER';

// ── Rate limiter for admin login ──────────────────────────────
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 15,                      // 15 attempts per window
  skipSuccessfulRequests: true, // successful logins don't count
  keyGenerator: (req) => req.ip + ':admin_login',
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function getFee() { return parseFloat(process.env.PLATFORM_FEE_PERCENT || '5'); }

// ── Admin JWT ─────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'Admin token required' });
  try {
    const decoded = jwt.verify(h.slice(7), ADMIN_SECRET);
    if (decoded.role !== 'platform_owner') return res.status(403).json({ error: 'Forbidden' });
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

// ── POST /api/admin/login ─────────────────────────────────────
router.post('/login', adminLoginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  if (email.toLowerCase().trim() !== OWNER_EMAIL.toLowerCase())
    return res.status(401).json({ error: 'Invalid credentials' });

  // bcrypt compare or plain-text fallback
  const OWNER_PASS = process.env.OWNER_PASSWORD || 'Admin@Najah2026!';
  let isValid = false;
  if (OWNER_HASH && OWNER_HASH.startsWith('$2')) {
    isValid = await bcrypt.compare(password, OWNER_HASH);
  } else {
    isValid = password === OWNER_PASS;
    if (isValid) console.warn('⚠️ SECURITY WARNING: Admin using plain-text password. Set OWNER_PASSWORD_HASH in production!');
  }

  if (!isValid)
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { role: 'platform_owner', email: OWNER_EMAIL, name: OWNER_NAME },
    ADMIN_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ success: true, token, owner: { email: OWNER_EMAIL, name: OWNER_NAME } });
});

// ── GET /api/admin/me ─────────────────────────────────────────
router.get('/me', adminAuth, (req, res) => {
  res.json({ email: OWNER_EMAIL, name: OWNER_NAME, platformFeePercent: getFee() });
});

// ── GET /api/admin/stats ──────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    // User stats (use last_active, not last_login)
    let userStats = { total_users: 0, students: 0, teachers: 0, new_this_month: 0, active_this_week: 0 };
    try {
      const { rows } = await pool.query(`
        SELECT
          COUNT(*)::int                                              AS total_users,
          COUNT(*) FILTER (WHERE role='student')::int               AS students,
          COUNT(*) FILTER (WHERE role='teacher')::int               AS teachers,
          COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '30 days')::int AS new_this_month,
          COUNT(*) FILTER (WHERE last_active  >= NOW()-INTERVAL '7 days')::int  AS active_this_week
        FROM users WHERE is_active = true
      `);
      userStats = rows[0];
    } catch (pgErr) {
      console.error('[Admin Stats] PG error (users):', pgErr.message);
    }

    // Revenue from MongoDB transactions
    const fee = getFee();
    const allTx = await Transaction.find({ status: 'success' });
    const totalRevenue     = allTx.reduce((s, t) => s + (t.amount || 0), 0);
    const platformEarnings = parseFloat((totalRevenue * fee / 100).toFixed(2));
    const listingFeeRevenue = allTx
      .filter(t => t.metadata?.listingFee)
      .reduce((s, t) => s + (t.amount || 0), 0);

    // Monthly revenue — last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyTx = await Transaction.aggregate([
      { $match: { status: 'success', createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id:     { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count:   { $sum: 1 },
          listingFees: { $sum: { $cond: [{ $eq: ['$metadata.listingFee', true] }, '$amount', 0] } },
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Gateway breakdown
    const gatewayBreakdown = await Transaction.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: '$gateway', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    // Per-group revenue (top earners)
    const groupRevenue = await Transaction.aggregate([
      { $match: { status: 'success', group: { $ne: null } } },
      { $group: { _id: '$group', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);

    // Populate group names
    const groupIds  = groupRevenue.map(g => g._id);
    const groupDocs = await Group.find({ _id: { $in: groupIds } }, 'name subject teacherName isPaid price platformFeePercent');
    const groupMap  = {};
    groupDocs.forEach(g => { groupMap[g._id.toString()] = g; });

    // Recent transactions
    const recentTx = await Transaction.find({ status: 'success' })
      .sort({ createdAt: -1 }).limit(15)
      .populate('group', 'name subject teacherName');

    // Group counts from MongoDB
    const totalGroups = await Group.countDocuments({ isActive: true });
    const paidGroups  = await Group.countDocuments({ isActive: true, isPaid: true });
    const pendingGroups = await Group.countDocuments({ status: 'pending_payment' });

    res.json({
      users: userStats,
      revenue: {
        total:              totalRevenue,
        platformEarnings,
        teacherPayouts:     parseFloat((totalRevenue - platformEarnings).toFixed(2)),
        listingFeeRevenue,
        feePercent:         fee,
        transactionCount:   allTx.length,
        monthly:            monthlyTx.map(m => ({
          label:            `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
          year:             m._id.year,
          month:            m._id.month,
          revenue:          parseFloat(m.revenue.toFixed(2)),
          platformEarnings: parseFloat((m.revenue * fee / 100).toFixed(2)),
          listingFees:      parseFloat(m.listingFees.toFixed(2)),
          count:            m.count,
        })),
      },
      groups: {
        total: totalGroups, paid: paidGroups,
        free: totalGroups - paidGroups, pending: pendingGroups,
        topEarners: groupRevenue.map(g => ({
          groupId:        g._id,
          name:           groupMap[g._id.toString()]?.name || 'Unknown',
          subject:        groupMap[g._id.toString()]?.subject || '—',
          teacherName:    groupMap[g._id.toString()]?.teacherName || '—',
          price:          groupMap[g._id.toString()]?.price || 0,
          totalRevenue:   parseFloat(g.total.toFixed(2)),
          platformCut:    parseFloat((g.total * fee / 100).toFixed(2)),
          studentCount:   g.count,
        })),
      },
      gatewayBreakdown: gatewayBreakdown.map(g => ({
        gateway: g._id, total: parseFloat(g.total.toFixed(2)), count: g.count
      })),
      recentTransactions: recentTx,
    });
  } catch (err) {
    console.error('[Admin Stats]', err);
    res.status(500).json({ error: 'Stats error: ' + err.message });
  }
});

// ── GET /api/admin/earnings ───────────────────────────────────
router.get('/earnings', adminAuth, async (req, res) => {
  try {
    const { from, to, gateway, groupId } = req.query;
    const filter = { status: 'success' };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }
    if (gateway) filter.gateway = gateway;
    if (groupId) filter.group   = groupId;

    const fee = getFee();
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .populate('group', 'name subject teacherName price');

    const summary = transactions.reduce((acc, t) => {
      acc.grossRevenue  += t.amount;
      acc.platformFee   += t.amount * (fee / 100);
      acc.teacherPayout += t.amount * (1 - fee / 100);
      acc.count++;
      return acc;
    }, { grossRevenue: 0, platformFee: 0, teacherPayout: 0, count: 0, feePercent: fee });

    // Per-teacher breakdown
    const teacherMap = {};
    for (const t of transactions) {
      const tid   = t.group?.teacherName || 'Direct';
      if (!teacherMap[tid]) teacherMap[tid] = { name: tid, gross: 0, fee: 0, payout: 0, pending: 0, count: 0 };
      teacherMap[tid].gross  += t.amount;
      teacherMap[tid].fee    += t.amount * (fee / 100);
      const owed = t.amount * (1 - fee / 100);
      teacherMap[tid].payout += owed;
      if (!t.metadata?.settled) teacherMap[tid].pending += owed;
      teacherMap[tid].count++;
    }

    // Monthly trend for filtered data
    const monthlyMap = {};
    for (const t of transactions) {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { label: key, revenue: 0, platformFee: 0, count: 0 };
      monthlyMap[key].revenue    += t.amount;
      monthlyMap[key].platformFee += t.amount * (fee / 100);
      monthlyMap[key].count++;
    }

    res.json({
      summary: {
        ...summary,
        grossRevenue:  parseFloat(summary.grossRevenue.toFixed(2)),
        platformFee:   parseFloat(summary.platformFee.toFixed(2)),
        teacherPayout: parseFloat(summary.teacherPayout.toFixed(2)),
      },
      transactions,
      teacherBreakdown: Object.values(teacherMap).sort((a, b) => b.gross - a.gross),
      monthlyTrend:     Object.values(monthlyMap).sort((a, b) => a.label.localeCompare(b.label)),
    });
  } catch (err) {
    res.status(500).json({ error: 'Earnings error: ' + err.message });
  }
});

// ── POST /api/admin/settle ───────────────────────────────────
router.post('/settle', adminAuth, async (req, res) => {
  try {
    const { teacherName } = req.body;
    if (!teacherName) return res.status(400).json({ error: 'Teacher name required' });
    
    // Find groups belonging to this teacher
    const groups = await Group.find({ teacherName });
    const groupIds = groups.map(g => g._id);
    
    // Find all unsettled transactions for this teacher's groups
    const txs = await Transaction.find({ group: { $in: groupIds }, status: 'success' });
    let settledCount = 0;
    
    for (const t of txs) {
      if (!t.metadata?.settled) {
        t.metadata = { ...t.metadata, settled: true, settledAt: new Date() };
        t.markModified('metadata');
        await t.save();
        settledCount++;
      }
    }
    
    res.json({ success: true, settledCount, message: `Settled ${settledCount} transactions.` });
  } catch (err) {
    res.status(500).json({ error: 'Settle error: ' + err.message });
  }
});

// ── POST /api/admin/advisor ──────────────────────────────────
router.post('/advisor', adminAuth, async (req, res) => {
  try {
    const { prompt, stats } = req.body;
    if (!geminiAI.isAvailable()) return res.status(400).json({ error: 'AI not available' });

    const systemContext = `You are an elite AI Financial & Business Advisor for the 'Najah' educational platform.
Current Platform Data:
${JSON.stringify(stats, null, 2)}

Analyze this data and answer the admin's question strategically.
Focus on revenue growth, user retention, and pricing optimization.
Use well-structured formatting (bullet points, clear paragraphs).`;
    
    const advice = await geminiAI.chat(`${systemContext}\n\nAdmin Question: ${prompt}`, [], 'en');
    res.json({ advice });
  } catch (err) {
    res.status(500).json({ error: 'Advisor error: ' + err.message });
  }
});

// ── GET /api/admin/codes ──────────────────────────────────────
router.get('/codes', adminAuth, async (req, res) => {
  try {
    const codes = await TopUpCode.find().sort({ createdAt: -1 }).limit(100);
    res.json({ codes });
  } catch (err) {
    res.status(500).json({ error: 'Codes error: ' + err.message });
  }
});

// ── POST /api/admin/codes/generate ───────────────────────────
router.post('/codes/generate', adminAuth, async (req, res) => {
  try {
    const { amount, count } = req.body;
    if (!amount || !count || count > 500) return res.status(400).json({ error: 'Invalid parameters' });

    const newCodes = [];
    for (let i = 0; i < count; i++) {
      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `NAJAH-${amount}-${randomString}`;
      newCodes.push({ code, amount });
    }

    await TopUpCode.insertMany(newCodes);
    res.json({ success: true, count, generated: newCodes });
  } catch (err) {
    res.status(500).json({ error: 'Generate codes error: ' + err.message });
  }
});

// ── COUPONS ───────────────────────────────────────────────────
router.get('/coupons', adminAuth, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

router.post('/coupons', adminAuth, async (req, res) => {
  try {
    const { code, type, value, maxUses, validUntil } = req.body;
    const coupon = new Coupon({
      code: code.toUpperCase(),
      type,
      value: Number(value),
      maxUses: Number(maxUses) || 0,
      validUntil: validUntil ? new Date(validUntil) : null,
      createdBy: req.user.id
    });
    await coupon.save();
    res.json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// ── GET /api/admin/branding ──────────────────────────────────
const BRANDING_PATH = path.join(__dirname, '../config/branding.json');
router.get('/branding', (req, res) => {
  try {
    const data = fs.readFileSync(BRANDING_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.json({ platformName: 'Najah', primaryColor: '#6366F1', logoEmoji: '🎓' });
  }
});

// ── POST /api/admin/branding ─────────────────────────────────
router.post('/branding', adminAuth, (req, res) => {
  try {
    const { platformName, primaryColor, logoEmoji } = req.body;
    const newBranding = { platformName: platformName || 'Najah', primaryColor: primaryColor || '#6366F1', logoEmoji: logoEmoji || '🎓' };
    fs.writeFileSync(BRANDING_PATH, JSON.stringify(newBranding, null, 2));
    res.json({ success: true, branding: newBranding });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update branding' });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;

    const params = [];
    const conds  = ['1=1'];

    if (role) {
      params.push(role);
      conds.push(`role=$${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    params.push(parseInt(limit));
    const limitIdx = params.length;

    params.push((parseInt(page) - 1) * parseInt(limit));
    const offsetIdx = params.length;

    const q = `
      SELECT id, name, email, role, created_at, last_active, is_active, xp_points, level
      FROM users
      WHERE ${conds.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const { rows } = await pool.query(q, params);

    const countParams = params.slice(0, params.length - 2);
    const countConds  = conds.slice(1);
    const countWhere  = countConds.length ? `WHERE ${countConds.join(' AND ')}` : '';
    const { rows: tot } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM users ${countWhere}`,
      countParams
    );

    res.json({ users: rows, total: tot[0].c, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Users error: ' + err.message });
  }
});

// ── PATCH /api/admin/users/:id ────────────────────────────────
router.patch('/users/:id', adminAuth, async (req, res) => {
  try {
    const { is_active, role } = req.body;
    const updates = []; const params = []; let idx = 1;
    if (is_active !== undefined) { updates.push(`is_active=$${idx++}`); params.push(is_active); }
    if (role)                    { updates.push(`role=$${idx++}`);       params.push(role); }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(',')} WHERE id=$${idx} RETURNING id,name,email,role,is_active`, params
    );
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Update user error: ' + err.message });
  }
});

// ── GET /api/admin/groups ─────────────────────────────────────
router.get('/groups', adminAuth, async (req, res) => {
  try {
    const groups = await Group.find().sort({ createdAt: -1 }).limit(200);
    const groupIds = groups.map(g => g._id);

    // Monthly revenue per group (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const earningsAgg = await Transaction.aggregate([
      { $match: { status: 'success', group: { $in: groupIds } } },
      { $group: { _id: '$group', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const monthlyAgg = await Transaction.aggregate([
      { $match: { status: 'success', group: { $in: groupIds }, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { group: '$group', year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' }
        }
      }
    ]);

    const earningsMap = {};
    earningsAgg.forEach(e => { earningsMap[e._id.toString()] = { total: e.total, count: e.count }; });

    const monthlyMap = {};
    monthlyAgg.forEach(m => {
      const gid = m._id.group.toString();
      if (!monthlyMap[gid]) monthlyMap[gid] = [];
      monthlyMap[gid].push({
        label: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
        revenue: parseFloat(m.revenue.toFixed(2)),
      });
    });

    const fee = getFee();
    res.json({
      groups: groups.map(g => {
        const id    = g._id.toString();
        const earn  = earningsMap[id] || { total: 0, count: 0 };
        return {
          ...g.toObject(),
          totalRevenue:     parseFloat(earn.total.toFixed(2)),
          platformCut:      parseFloat((earn.total * fee / 100).toFixed(2)),
          teacherPayout:    parseFloat((earn.total * (1 - fee / 100)).toFixed(2)),
          transactionCount: earn.count,
          monthlyRevenue:   (monthlyMap[id] || []).sort((a, b) => a.label.localeCompare(b.label)),
        };
      })
    });
  } catch (err) {
    res.status(500).json({ error: 'Groups error: ' + err.message });
  }
});

// ── PATCH /api/admin/settings/fee ────────────────────────────
router.patch('/settings/fee', adminAuth, (req, res) => {
  const { feePercent } = req.body;
  if (typeof feePercent !== 'number' || feePercent < 0 || feePercent > 50)
    return res.status(400).json({ error: 'Fee must be 0–50%' });
  process.env.PLATFORM_FEE_PERCENT = String(feePercent);
  res.json({ success: true, feePercent });
});

// ── GET /api/admin/withdrawals — كل طلبات السحب ──────────
router.get('/withdrawals', adminAuth, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const { rows } = await pool.query(
      `SELECT w.*, u.name AS teacher_name, u.email AS teacher_email
       FROM withdrawal_requests w JOIN users u ON w.teacher_id=u.id
       WHERE w.status=$1 ORDER BY w.requested_at ASC`,
      [status]
    );
    res.json({ withdrawals: rows });
  } catch (err) {
    res.status(500).json({ error: 'Withdrawals error: ' + err.message });
  }
});

// ── PATCH /api/admin/withdrawals/:id — الموافقة أو الرفض ──
router.patch('/withdrawals/:id', adminAuth, async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ error: 'Invalid action' });

    const { rows: wr } = await pool.query(
      'SELECT * FROM withdrawal_requests WHERE id=$1', [req.params.id]
    );
    if (!wr[0]) return res.status(404).json({ error: 'Not found' });
    const w = wr[0];
    if (w.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE withdrawal_requests SET status=$1, admin_note=$2, processed_at=NOW(), processed_by=$3
         WHERE id=$4`,
        [newStatus, note || '', req.admin.email, req.params.id]
      );

      if (action === 'approve') {
        // اخصم من الـ wallet والـ pending
        await client.query(
          `UPDATE users SET
             wallet_balance    = wallet_balance    - $1,
             pending_withdrawn = pending_withdrawn - $1
           WHERE id = $2`,
          [w.amount, w.teacher_id]
        );
      } else {
        // Reject: رجّع الـ pending بس
        await client.query(
          `UPDATE users SET pending_withdrawn = pending_withdrawn - $1 WHERE id=$2`,
          [w.amount, w.teacher_id]
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ success: true, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Withdrawal action error: ' + err.message });
  }
});

module.exports = router;

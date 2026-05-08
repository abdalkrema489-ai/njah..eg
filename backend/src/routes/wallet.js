// ═══════════════════════════════════════════════════════
// src/routes/wallet.js — Teacher Wallet & Withdrawal API
// ═══════════════════════════════════════════════════════
'use strict';

const express = require('express');
const router  = express.Router();
const { pool } = require('../config/postgres');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// ── GET /api/wallet/balance — رصيد المحفظة + إجماليات ──
router.get('/balance', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT wallet_balance, total_earned, pending_withdrawn FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];
    const balance          = parseFloat(user.wallet_balance || 0);
    const totalEarned      = parseFloat(user.total_earned || 0);
    const pendingWithdrawn = parseFloat(user.pending_withdrawn || 0);

    res.json({
      balance,
      totalEarned,
      pendingWithdrawn,
      available: parseFloat((balance - pendingWithdrawn).toFixed(2)),
    });
  } catch (err) {
    logger.error('Wallet balance error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/wallet/earnings — سجل الإيرادات التفصيلي ──
router.get('/earnings', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, groupId } = req.query;
    const params = [req.user.id];
    let where = 'teacher_id=$1';
    if (groupId) { params.push(groupId); where += ` AND group_id=$${params.length}`; }

    params.push(parseInt(limit));
    const limitIdx = params.length;
    params.push((parseInt(page) - 1) * parseInt(limit));
    const offsetIdx = params.length;

    const { rows } = await pool.query(
      `SELECT id, group_name, student_name, gross_amount, fee_percent, fee_amount, net_amount, status, earned_at
       FROM teacher_earnings WHERE ${where}
       ORDER BY earned_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );
    const { rows: tot } = await pool.query(
      `SELECT COUNT(*)::int AS c, COALESCE(SUM(net_amount),0) AS total_net FROM teacher_earnings WHERE teacher_id=$1`,
      [req.user.id]
    );

    // Monthly aggregation for chart
    const { rows: monthly } = await pool.query(
      `SELECT TO_CHAR(earned_at, 'YYYY-MM') AS month, SUM(net_amount) AS total
       FROM teacher_earnings WHERE teacher_id=$1
       GROUP BY TO_CHAR(earned_at, 'YYYY-MM')
       ORDER BY month DESC LIMIT 12`,
      [req.user.id]
    );

    res.json({
      earnings:  rows,
      total:     tot[0].c,
      totalNet:  parseFloat(tot[0].total_net || 0),
      monthly:   monthly.reverse(),
      page:      parseInt(page),
      limit:     parseInt(limit),
    });
  } catch (err) {
    logger.error('Wallet earnings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/wallet/withdrawals — سجل طلبات السحب ──
router.get('/withdrawals', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, amount, method, account_number, account_name, status, admin_note, requested_at, processed_at
       FROM withdrawal_requests WHERE teacher_id=$1 ORDER BY requested_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ withdrawals: rows });
  } catch (err) {
    logger.error('Wallet withdrawals error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/wallet/withdraw — طلب سحب جديد ──
router.post('/withdraw', authenticate, async (req, res) => {
  try {
    // المدرس بس يقدر يسحب
    if (req.user.role !== 'teacher')
      return res.status(403).json({ error: 'Teachers only' });

    const { amount, method, accountNumber, accountName } = req.body;

    // Validation
    if (!amount || amount < 50)
      return res.status(400).json({ error: 'الحد الأدنى للسحب 50 جنيه' });
    if (!['instapay', 'vodafone_cash', 'bank_transfer'].includes(method))
      return res.status(400).json({ error: 'طريقة سحب غير صحيحة' });
    if (!accountNumber)
      return res.status(400).json({ error: 'رقم الحساب مطلوب' });

    // تحقق من الرصيد المتاح
    const { rows } = await pool.query(
      'SELECT wallet_balance, pending_withdrawn FROM users WHERE id=$1',
      [req.user.id]
    );
    const available = parseFloat(rows[0].wallet_balance) - parseFloat(rows[0].pending_withdrawn);

    if (amount > available)
      return res.status(400).json({ error: `الرصيد المتاح ${available.toFixed(2)} جنيه فقط` });

    // اعمل طلب السحب وزود الـ pending
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO withdrawal_requests (teacher_id, amount, method, account_number, account_name)
         VALUES ($1,$2,$3,$4,$5)`,
        [req.user.id, amount, method, accountNumber, accountName || '']
      );
      await client.query(
        `UPDATE users SET pending_withdrawn = pending_withdrawn + $1 WHERE id = $2`,
        [amount, req.user.id]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ success: true, message: `تم إرسال طلب سحب ${amount} جنيه. سيتم المراجعة خلال 24 ساعة.` });
  } catch (err) {
    logger.error('Withdraw error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/wallet/monthly-chart ──
router.get('/monthly-chart', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(earned_at, 'YYYY-MM') AS month,
        SUM(net_amount)::float         AS earnings,
        COUNT(*)::int                  AS transactions
      FROM teacher_earnings
      WHERE teacher_id = $1
        AND earned_at >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `, [req.user.id]);

    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key   = d.toISOString().slice(0, 7);
      const found = rows.find(r => r.month === key);
      result.push({
        month:        key,
        labelAr:      d.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' }),
        labelEn:      d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        earnings:     found ? parseFloat(found.earnings) : 0,
        transactions: found ? found.transactions : 0,
      });
    }
    res.json({ chart: result });
  } catch (err) {
    logger.error('Monthly chart error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

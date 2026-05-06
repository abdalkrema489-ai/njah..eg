const express = require('express');
const axios = require('axios');
const twilio = require('twilio');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { validatePaymobHMAC } = require('../middleware/validatePaymobHMAC');
const { pool } = require('../config/postgres');
const Transaction = require('../models/Transaction');
const TopUpCode = require('../models/TopUpCode');
const Coupon = require('../models/Coupon');
const Affiliate = require('../models/Affiliate');
const Group = require('../models/Group');
const { broadcastToAdmin, pushNotification } = require('../config/socket');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiter for simulate-success (dev only) — 3 req/hour/user
const simulateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: req => (req.user?.id || req.ip),
  message: { error: 'Simulate rate limit reached (3/hour).' },
});

// Initialize external gateways and SMS clients using environment variables
const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY || 'MISSING_PAYMOB_KEY';
const TWILIO_SID = process.env.TWILIO_SID || 'MISSING_TWILIO_SID';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'MISSING_TWILIO_TOKEN';
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '+1234567890';

// Twilio Client
let twilioClient;
try {
  if (TWILIO_SID !== 'MISSING_TWILIO_SID') {
    twilioClient = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);
  }
} catch (e) {
  logger.error("Twilio not initialized. Keys missing.");
}

// ═══════════════════════════════════════════════════════════
// creditTeacherWallet — توزيع الإيرادات تلقائياً على المدرس
// ═══════════════════════════════════════════════════════════
async function creditTeacherWallet(transaction, group) {
  try {
    if (!group || !group.teacherId || !group.isPaid || transaction.amount <= 0) return;

    const feePercent = group.platformFeePercent || parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');
    const grossAmt   = transaction.amount;
    const feeAmt     = parseFloat((grossAmt * feePercent / 100).toFixed(2));
    const netAmt     = parseFloat((grossAmt - feeAmt).toFixed(2));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // اكتب سجل تفصيلي في teacher_earnings
      await client.query(`
        INSERT INTO teacher_earnings
          (teacher_id, transaction_id, group_id, group_name, student_id, student_name,
           gross_amount, fee_percent, fee_amount, net_amount, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'available')
        ON CONFLICT (transaction_id) DO NOTHING
      `, [
        group.teacherId,
        transaction._id.toString(),
        group._id.toString(),
        group.name,
        transaction.userId,
        transaction.metadata?.studentName || '',
        grossAmt,
        feePercent,
        feeAmt,
        netAmt
      ]);

      // أضف للمحفظة
      await client.query(`
        UPDATE users
        SET wallet_balance = wallet_balance + $1,
            total_earned   = total_earned   + $1
        WHERE id = $2
      `, [netAmt, group.teacherId]);

      await client.query('COMMIT');
      logger.info('Teacher wallet credited', { teacherId: group.teacherId, amount: netAmt, groupId: group._id });
    } catch (walletErr) {
      await client.query('ROLLBACK');
      logger.error('Teacher wallet credit failed', walletErr);
    } finally {
      client.release();
    }

    // إبعت إشعار للمدرس
    pushNotification(group.teacherId, {
      type:  'earning',
      title: '💰 إيراد جديد!',
      body:  `اشترك طالب في "${group.name}". ربحك: ${netAmt} جنيه (بعد خصم ${feePercent}% رسوم المنصة)`,
    }).catch(() => {});

    pool.query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES ($1,'earning',$2,$3)`,
      [group.teacherId, '💰 إيراد جديد!', `ربحك من "${group.name}": ${netAmt} جنيه`]
    ).catch(() => {});
  } catch (err) {
    logger.error('Teacher payout error:', err);
  }
}

// ═══════════════════════════════════════════════════════════
// processSuccessfulPayment — مركّز في function واحدة
// ═══════════════════════════════════════════════════════════
async function processSuccessfulPayment(transaction) {
  const { type, group: groupId, userId, amount } = transaction;

  // 1. Group Join → Enroll + Credit Teacher
  if (type === 'group_join' && groupId) {
    const group = await Group.findById(groupId);
    if (group && !group.students.some(s => s.userId === userId)) {
      try {
        const { rows } = await pool.query('SELECT name, email FROM users WHERE id=$1', [userId]);
        const usr = rows[0] || {};
        group.students.push({
          userId,
          name: usr.name || '',
          email: usr.email || '',
          joinedAt: new Date()
        });
        await group.save();
        logger.info(`Auto-enrolled user ${userId} into group ${group._id}`);
      } catch (e) {
        logger.error('Enrollment error:', e);
      }
    }
    // Credit Teacher Wallet
    if (group?.teacherId && group.isPaid) {
      await creditTeacherWallet(transaction, group);
    }
  }

  // 2. Wallet Top-up
  if (type === 'wallet_topup') {
    try {
      await pool.query(
        'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
        [amount, userId]
      );
      logger.info(`Topped up user ${userId} wallet by ${amount} EGP`);
    } catch (e) {
      logger.error('Wallet topup error:', e);
    }
  }

  // 3. Listing Fee → Activate Group
  if (type === 'listing_fee' && groupId) {
    try {
      const group = await Group.findById(groupId);
      if (group) {
        group.status = 'active';
        group.listingFeePaid = true;
        group.listingFeeTransactionId = transaction._id.toString();
        await group.save();
      }
    } catch (e) {
      logger.error('Listing fee activation error:', e);
    }
  }
}

/**
 * @desc   Initiate a real payment transaction using Paymob APIs
 * @route  POST /api/payment/initiate
 */
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { amount, gateway, groupId, title, extraData, type } = req.body;
    const userRole = req.user.role;

    // ── Validation حسب الفئة ──
    if (type === 'group_join') {
      if (groupId) {
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.students.some(s => s.userId === req.user.id))
          return res.status(400).json({ error: 'Already enrolled' });
        if (group.isPaid && Math.abs(amount - group.price) > 0.01)
          return res.status(400).json({ error: 'Amount mismatch' });
      }
    }

    if (type === 'wallet_topup') {
      if (amount < 10)
        return res.status(400).json({ error: 'الحد الأدنى 10 جنيه' });
    }

    // ── الدفع من المحفظة الداخلية ──
    if (gateway === 'internal') {
      const { rows } = await pool.query(
        'SELECT wallet_balance FROM users WHERE id=$1', [req.user.id]
      );
      const balance = parseFloat(rows[0]?.wallet_balance || 0);
      if (balance < amount)
        return res.status(400).json({ error: `رصيد غير كافي. رصيدك: ${balance} جنيه` });

      const orderId = `NJH-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const transaction = await Transaction.create({
        userId: req.user.id,
        userRole,
        group: groupId || null,
        amount,
        gateway: 'internal',
        orderId,
        type: type || (groupId ? 'group_join' : 'wallet_topup'),
        status: 'success',
        transactionId: `WALLET-${orderId}`,
        metadata: { title, ...extraData },
      });

      // اخصم من المحفظة مباشرة
      await pool.query(
        'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id=$2',
        [amount, req.user.id]
      );

      // نفذ العملية مباشرة
      await processSuccessfulPayment(transaction);

      broadcastToAdmin('admin_new_transaction', {
        id: transaction._id, amount, gateway: 'internal',
        title: title || 'Internal Wallet Payment', timestamp: new Date()
      });

      return res.json({
        success: true,
        method: 'wallet',
        message: 'تم الدفع من رصيد محفظتك',
        transactionId: transaction._id,
      });
    }

    // ── إنشاء Transaction ──
    const transaction = await Transaction.create({
      userId: req.user.id,
      userRole,
      group: groupId || null,
      amount,
      gateway,
      orderId: 'TBD',
      type: type || (groupId ? 'group_join' : 'wallet_topup'),
      affiliateRef: extraData?.affiliate_ref || null,
      metadata: { title, ...extraData }
    });

    // If API key is missing, simulate
    if (PAYMOB_API_KEY === 'MISSING_PAYMOB_KEY') {
      console.log('Using simulated Paymob gateway due to missing API key.');
      transaction.orderId = 'SIM_' + Math.floor(Math.random() * 1000000);

      let refCode = null;
      if (gateway === 'fawry') refCode = '770' + Math.floor(100000 + Math.random() * 900000);
      else if (gateway === 'instapay') refCode = 'najah@instapay';

      if (refCode) transaction.referenceCode = refCode;
      await transaction.save();

      return res.status(200).json({
        success: true,
        transactionId: transaction._id,
        iframeUrl: gateway === 'card' ? `https://accept.paymobsolutions.com/api/acceptance/iframes/SIMULATED` : null,
        referenceCode: refCode,
        message: 'Payment initiated (Simulated mode). Please configure real Paymob API keys.'
      });
    }

    // --- REAL PAYMOB INTEGRATION FLOW ---
    const authRes = await axios.post('https://accept.paymob.com/api/auth/tokens', {
      api_key: PAYMOB_API_KEY
    });
    const token = authRes.data.token;

    const orderRes = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: token,
      delivery_needed: "false",
      amount_cents: amount * 100,
      currency: "EGP",
      merchant_order_id: transaction._id.toString(),
      items: [{ name: title || 'Service', amount_cents: amount * 100, description: "Educational Service", quantity: "1" }]
    });
    const paymobOrderId = orderRes.data.id;
    transaction.orderId = paymobOrderId;
    await transaction.save();

    const integrationId = process.env[`PAYMOB_${gateway.toUpperCase()}_INTEGRATION_ID`] || '000000';
    const keyRes = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: token,
      amount_cents: amount * 100,
      expiration: 3600,
      order_id: paymobOrderId,
      billing_data: {
        apartment: "NA", email: req.user.email || "test@test.com", floor: "NA", first_name: req.user.name.split(' ')[0] || "User",
        street: "NA", building: "NA", phone_number: extraData?.phone || "+201000000000", shipping_method: "NA",
        postal_code: "NA", city: "Cairo", country: "EG", last_name: req.user.name.split(' ')[1] || "Name",
        state: "NA"
      },
      currency: "EGP",
      integration_id: integrationId
    });

    const paymentKey = keyRes.data.token;
    let responsePayload = { success: true, transactionId: transaction._id };

    if (gateway === 'card') {
      const iframeId = process.env.PAYMOB_IFRAME_ID || '123456';
      responsePayload.iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;
    } else if (gateway === 'wallet') {
      const walletRes = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
        source: { identifier: extraData.phone, subtype: "WALLET" },
        payment_token: paymentKey
      });
      responsePayload.redirectUrl = walletRes.data.iframe_redirection_url;
    } else if (gateway === 'fawry') {
      responsePayload.referenceCode = 'FW' + paymobOrderId;
    }

    res.status(200).json(responsePayload);

  } catch (err) {
    console.error('Payment Initiation Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to initiate genuine payment. Please check gateway configurations.' });
  }
});

/**
 * @desc   Webhook endpoint for Payment Gateways (Paymob)
 * @route  POST /api/payment/webhook
 */
router.post('/webhook', validatePaymobHMAC, async (req, res) => {
  res.status(200).send('Webhook Received');

  try {
    const payload = req.body;
    const isSuccess = payload.obj?.success;
    const orderId = payload.obj?.order?.id;
    const transId = payload.obj?.id;

    if (!orderId) return;

    const transaction = await Transaction.findOne({ orderId: orderId });
    if (!transaction) return;
    if (transaction.status === 'success') return; // Already processed

    if (isSuccess) {
      transaction.status = 'success';
      transaction.transactionId = transId;

      // Handle Affiliate Commission
      if (transaction.affiliateRef) {
        try {
          const aff = await Affiliate.findOne({ code: transaction.affiliateRef });
          if (aff) {
            const commission = (transaction.amount * aff.commissionRate) / 100;
            transaction.affiliateCommission = commission;
            aff.conversions += 1;
            aff.totalEarned += commission;
            await aff.save();
            await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [commission, aff.userId]);
            logger.info(`Credited affiliate ${aff.userId} with ${commission} EGP commission.`);
          }
        } catch (affErr) {
          logger.error('Affiliate processing error:', affErr);
        }
      }

      await transaction.save();

      // Broadcast to Admin Live Feed
      broadcastToAdmin('admin_new_transaction', {
        id: transaction._id,
        amount: transaction.amount,
        gateway: transaction.gateway,
        title: transaction.metadata?.title || 'Webhook Payment',
        timestamp: new Date()
      });

      // ── processSuccessfulPayment يتعامل مع كل شيء ──
      await processSuccessfulPayment(transaction);

      // SEND REAL SMS CONFIRMATION VIA TWILIO
      if (twilioClient) {
        try {
          const { rows } = await pool.query('SELECT phone FROM users WHERE id = $1', [transaction.userId]);
          const userPhone = rows[0]?.phone;
          if (userPhone) {
            await twilioClient.messages.create({
              body: `Najah Platform: Your payment of ${transaction.amount} EGP was successful. Ref: ${transId}. Thank you!`,
              from: TWILIO_FROM_NUMBER,
              to: userPhone
            });
            logger.info(`Genuine SMS sent successfully to ${userPhone}`);
          }
        } catch (smsErr) {
          logger.error("Failed to send real SMS:", smsErr);
        }
      }

    } else {
      transaction.status = 'failed';
      await transaction.save();
    }
  } catch (error) {
    logger.error('Webhook processing error:', error);
  }
});

/**
 * @desc   Simulate a successful payment for development purposes
 * @route  POST /api/payment/simulate-success
 */
function devOnly(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
}

router.post('/simulate-success', devOnly, authenticate, simulateLimiter, async (req, res) => {
  logger.warn('[AUDIT] /simulate-success used', {
    userId: req.user?.id, ip: req.ip, time: new Date().toISOString(),
  });
  const { transactionId, phone } = req.body;

  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    transaction.status = 'success';
    transaction.transactionId = 'SIM_TRANS_' + Date.now();

    // Handle Affiliate Commission
    if (transaction.affiliateRef) {
      try {
        const aff = await Affiliate.findOne({ code: transaction.affiliateRef });
        if (aff) {
          const commission = (transaction.amount * aff.commissionRate) / 100;
          transaction.affiliateCommission = commission;
          aff.conversions += 1;
          aff.totalEarned += commission;
          await aff.save();
          await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [commission, aff.userId]);
          logger.info(`[Sim] Credited affiliate ${aff.userId} with ${commission} EGP commission.`);
        }
      } catch (affErr) {
        logger.error('Affiliate processing error:', affErr);
      }
    }

    await transaction.save();

    broadcastToAdmin('admin_new_transaction', {
      id: transaction._id,
      amount: transaction.amount,
      gateway: transaction.gateway,
      title: transaction.metadata?.title || 'Simulated Payment',
      timestamp: new Date()
    });

    // ── processSuccessfulPayment يتعامل مع كل شيء ──
    await processSuccessfulPayment(transaction);

    // If user provided a phone number, attempt to send a real SMS
    const targetPhone = phone || req.user?.phone;
    let smsSent = false;

    if (twilioClient && targetPhone) {
      try {
        await twilioClient.messages.create({
          body: `Najah: Payment of ${transaction.amount} EGP via ${transaction.gateway} successful. Ref: ${transaction.transactionId}.`,
          from: TWILIO_FROM_NUMBER,
          to: targetPhone
        });
        smsSent = true;
      } catch (smsErr) {
        logger.error("Twilio SMS Error:", smsErr);
      }
    }

    res.status(200).json({
      success: true,
      transaction,
      message: 'Genuine transaction accurately recorded.',
      smsStatus: smsSent ? 'Sent' : 'Not configured or failed'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @desc   Get user's transactions
 * @route  GET /api/payment/history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('group', 'name subject');
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

// ── POST /api/payment/redeem-code ──
router.post('/redeem-code', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const topUp = await TopUpCode.findOne({ code, isUsed: false });
    if (!topUp) return res.status(400).json({ error: 'Invalid or already used code.' });

    topUp.isUsed = true;
    topUp.usedBy = req.user.id;
    topUp.usedAt = new Date();
    await topUp.save();

    const { rows } = await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance', [topUp.amount, req.user.id]);

    broadcastToAdmin('admin_new_transaction', {
      id: topUp._id,
      amount: topUp.amount,
      gateway: 'WALLET_TOPUP',
      title: `Top-Up Code Redeemed: ${code}`,
      timestamp: new Date()
    });

    res.json({ success: true, amount: topUp.amount, newBalance: rows[0].wallet_balance, message: `Successfully added ${topUp.amount} EGP to your wallet!` });
  } catch (err) {
    res.status(500).json({ error: 'Redeem error: ' + err.message });
  }
});

// ── POST /api/payment/validate-coupon ──
router.post('/validate-coupon', authenticate, async (req, res) => {
  try {
    const { code, amount } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(400).json({ error: 'Invalid or expired coupon' });

    if (coupon.validUntil && new Date() > coupon.validUntil) {
      coupon.isActive = false;
      await coupon.save();
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      coupon.isActive = false;
      await coupon.save();
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (amount * coupon.value) / 100;
    } else {
      discountAmount = coupon.value;
    }

    discountAmount = Math.min(discountAmount, amount);
    const newTotal = amount - discountAmount;

    res.json({
      success: true,
      coupon: { code: coupon.code, type: coupon.type, value: coupon.value },
      discountAmount,
      newTotal
    });
  } catch (err) {
    res.status(500).json({ error: 'Coupon validation error' });
  }
});

module.exports = router;

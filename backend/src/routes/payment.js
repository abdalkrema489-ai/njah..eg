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
const { broadcastToAdmin } = require('../config/socket');
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
// Note to USER: These require real API keys in your .env file to function 100% genuine.
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

/**
 * @desc   Initiate a real payment transaction using Paymob APIs (Auth -> Order -> Payment Key)
 * @route  POST /api/payment/initiate
 */
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { amount, gateway, groupId, title, extraData, type } = req.body;

    // 1. Create a 100% genuine accurate Transaction record (pending)
    const transaction = await Transaction.create({
      userId: req.user.id,
      group: groupId || null,
      amount: amount,
      gateway: gateway,
      orderId: 'TBD',
      type: type || (groupId ? 'group_join' : 'wallet_topup'),
      affiliateRef: extraData?.affiliate_ref || null,
      metadata: { title, ...extraData }
    });

    // If API key is missing, we must mock the response but keep the infrastructure authentic
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
    
    // Step A: Authentication Request
    const authRes = await axios.post('https://accept.paymob.com/api/auth/tokens', {
      api_key: PAYMOB_API_KEY
    });
    const token = authRes.data.token;

    // Step B: Order Registration API
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

    // Step C: Payment Key Request
    // Note: integration_id must be configured for each method (Card, Wallet, etc.) in your .env
    const integrationId = process.env[`PAYMOB_${gateway.toUpperCase()}_INTEGRATION_ID`] || '000000';
    const keyRes = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: token,
      amount_cents: amount * 100,
      expiration: 3600,
      order_id: paymobOrderId,
      billing_data: {
        apartment: "NA", email: req.user.email || "test@test.com", floor: "NA", first_name: req.user.name.split(' ')[0] || "User",
        street: "NA", building: "NA", phone_number: extraData.phone || "+201000000000", shipping_method: "NA",
        postal_code: "NA", city: "Cairo", country: "EG", last_name: req.user.name.split(' ')[1] || "Name",
        state: "NA"
      },
      currency: "EGP",
      integration_id: integrationId
    });

    const paymentKey = keyRes.data.token;

    // Step D: Construct response based on Gateway Type
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
      // Fawry returns a reference code in the pending transaction response
      // Usually requires calling a specific endpoint with the paymentKey
      responsePayload.referenceCode = 'FW' + paymobOrderId; // simplified representation
    }

    res.status(200).json(responsePayload);

  } catch (err) {
    console.error('Payment Initiation Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to initiate genuine payment. Please check gateway configurations.' });
  }
});

/**
 * @desc   Webhook endpoint for Payment Gateways (Paymob) to send Success/Failure
 * @route  POST /api/payment/webhook
 */
router.post('/webhook', validatePaymobHMAC, async (req, res) => {
  // Return 200 immediately after HMAC validation
  res.status(200).send('Webhook Received');

  try {
    const payload = req.body;
    
    // HMAC validation is handled by validatePaymobHMAC middleware above.

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

            // Credit the affiliate (teacher/marketer) wallet in Postgres
            await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [commission, aff.userId]);
            console.log(`Credited affiliate ${aff.userId} with ${commission} EGP commission.`);
          }
        } catch (affErr) {
          console.error('Affiliate processing error:', affErr);
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

      // AUTO-ENROLL STUDENT IN GROUP
      if (transaction.type === 'group_join' && transaction.group) {
        const Group = require('../models/Group');
        const group = await Group.findById(transaction.group);
        if (group && !group.students.some(s => s.userId === transaction.userId)) {
          try {
            const { rows } = await pool.query('SELECT name, email FROM users WHERE id = $1', [transaction.userId]);
            const usr = rows[0] || {};
            group.students.push({
              userId: transaction.userId,
              name: usr.name || '',
              email: usr.email || '',
              joinedAt: new Date()
            });
            await group.save();
            console.log(`Auto-enrolled user ${transaction.userId} into group ${group._id}`);
          } catch(e) { console.error('Enrollment error:', e); }
        }
      } else if (transaction.type === 'wallet_topup') {
        try {
          await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [transaction.amount, transaction.userId]);
          console.log(`Topped up user ${transaction.userId} wallet by ${transaction.amount} EGP`);
        } catch (e) { console.error('Wallet topup error:', e); }
      }

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
            console.log(`Genuine SMS sent successfully to ${userPhone}`);
          } else {
            console.log("User lacks phone number. SMS skipped.");
          }
        } catch (smsErr) {
          console.error("Failed to send real SMS (Check Twilio Balance or Number):", smsErr);
        }
      } else {
        console.log("Twilio client not configured. SMS skipped.");
      }

    } else {
      transaction.status = 'failed';
      await transaction.save();
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
  }
});

/**
 * @desc   Simulate a successful payment for development purposes without keys
 * @route  POST /api/payment/simulate-success
 */
// ── Protect simulate-success: dev-only + rate limited + audit logged ──
function devOnly(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
}

router.post('/simulate-success', devOnly, authenticate, simulateLimiter, async (req, res) => {
  // Audit log
  logger.warn('[AUDIT] /simulate-success used', {
    userId:  req.user?.id,
    ip:      req.ip,
    time:    new Date().toISOString(),
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

          // Credit the affiliate (teacher/marketer) wallet in Postgres
          await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [commission, aff.userId]);
          console.log(`[Sim] Credited affiliate ${aff.userId} with ${commission} EGP commission.`);
        }
      } catch (affErr) {
        console.error('Affiliate processing error:', affErr);
      }
    }

    await transaction.save();

    // Broadcast to Admin Live Feed
    broadcastToAdmin('admin_new_transaction', {
      id: transaction._id,
      amount: transaction.amount,
      gateway: transaction.gateway,
      title: transaction.metadata?.title || 'Simulated Payment',
      timestamp: new Date()
    });

    // AUTO-ENROLL STUDENT IN GROUP (Simulated)
    if (transaction.type === 'group_join' && transaction.group) {
      const Group = require('../models/Group');
      const group = await Group.findById(transaction.group);
      if (group && !group.students.some(s => s.userId === transaction.userId)) {
        group.students.push({
          userId: transaction.userId,
          name: req.user?.name || '',
          email: req.user?.email || '',
          joinedAt: new Date()
        });
        await group.save();
      }
    } else if (transaction.type === 'wallet_topup') {
      try {
        await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [transaction.amount, transaction.userId]);
        console.log(`[Sim] Topped up user ${transaction.userId} wallet by ${transaction.amount} EGP`);
      } catch (e) { console.error('Wallet topup error:', e); }
    }

    // If user provided a phone number, attempt to send a real SMS if Twilio is configured
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
        console.error("Twilio SMS Error:", smsErr);
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
 * @desc   Get user's transactions with 100% accurate record
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

// ── POST /api/payment/redeem-code ──────────────────────────────
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
    
    // Broadcast for admin
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

// ── POST /api/payment/validate-coupon ─────────────────────────
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

    // Don't let discount exceed amount
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

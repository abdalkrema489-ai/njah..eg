// src/middleware/validatePaymobHMAC.js
'use strict';
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Validates Paymob webhook HMAC-SHA512 signature.
 * Paymob sends ?hmac=<signature> in the query string.
 * The signature is computed over a specific ordered set of fields from payload.obj
 */
function validatePaymobHMAC(req, res, next) {
  const receivedHmac = req.query.hmac;
  const secret = process.env.PAYMOB_HMAC_SECRET;

  // If no secret configured — fail CLOSED in production, skip in dev only
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[HMAC] PAYMOB_HMAC_SECRET not set in production — rejecting webhook (fail-closed). Set this env var immediately.');
      return res.status(500).json({ error: 'Payment webhook misconfigured — contact administrator' });
    }
    logger.warn('[HMAC] PAYMOB_HMAC_SECRET not set — skipping webhook HMAC validation (DEV ONLY, INSECURE)');
    return next();
  }

  if (!receivedHmac) {
    logger.warn('[HMAC] Webhook received with no HMAC query param — rejecting');
    return res.status(401).json({ error: 'Missing HMAC signature' });
  }

  try {
    const obj = req.body?.obj || {};

    // Paymob's canonical field order for HMAC computation
    const fields = [
      'amount_cents',
      'created_at',
      'currency',
      'error_occured',
      'has_parent_transaction',
      'id',
      'integration_id',
      'is_3d_secure',
      'is_auth',
      'is_capture',
      'is_refunded',
      'is_standalone_payment',
      'is_voided',
      'order',          // order.id
      'owner',
      'pending',
      'source_data_pan',
      'source_data_sub_type',
      'source_data_type',
      'success',
    ];

    // Build concatenated string with special handling for nested fields
    const parts = fields.map(field => {
      if (field === 'order') return obj.order?.id ?? '';
      if (field === 'source_data_pan')      return obj.source_data?.pan ?? '';
      if (field === 'source_data_sub_type') return obj.source_data?.sub_type ?? '';
      if (field === 'source_data_type')     return obj.source_data?.type ?? '';
      const val = obj[field];
      if (val === null || val === undefined) return '';
      return String(val);
    });

    const concatenated = parts.join('');
    const computed = crypto
      .createHmac('sha512', secret)
      .update(concatenated)
      .digest('hex');

    if (computed !== receivedHmac) {
      logger.warn('[HMAC] Webhook HMAC mismatch — possible tampered request', {
        receivedHmac,
        computedHmac: computed,
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Invalid HMAC signature' });
    }

    next();
  } catch (err) {
    logger.error('[HMAC] Error during HMAC validation:', err);
    return res.status(401).json({ error: 'HMAC validation failed' });
  }
}

module.exports = { validatePaymobHMAC };

// ════════════════════════════════════════
// src/config/redis.js
// ════════════════════════════════════════
const { createClient } = require('redis');
const logger = require('../utils/logger');

let client;

async function connectRedis() {
  const redisOptions = {
    url: process.env.REDIS_URL,
    socket: { 
      reconnectStrategy: r => Math.min(r * 100, 3000),
      connectTimeout: 5000 // Prevents indefinite hanging
    },
  };
  if (process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== '') {
    redisOptions.password = process.env.REDIS_PASSWORD;
  } else {
    redisOptions.password = null;
  }

  try {
    client = createClient(redisOptions);
    client.on('error', e => {
      if (e.message?.includes('ENOTFOUND')) return; // DNS failure — already logged on connect
      if (e.code === 'ECONNRESET' || e.message?.includes('ECONNRESET')) {
        // TCP reset from idle proxy — auto-reconnect handles it, downgrade to warn
        logger.warn('Redis: connection reset by peer (ECONNRESET) — reconnecting...');
        return;
      }
      logger.error('Redis error:', e.message || e);
    });
    client.on('reconnecting', () => logger.warn('Redis: reconnecting...'));
    client.on('ready',        () => logger.info('✅ Redis reconnected'));
    
    await client.connect();
    logger.info('✅ Redis connected');
  } catch (e) {
    logger.error('❌ Redis Connection Failed. Running without cache.');
    // Initialize mock behavior if critical, but here we just leave client as is
    // so cacheGet/Set will fail gracefully if they check for client status
  }
}

const getRedis   = ()               => client;
const isReady    = () => client && client.isOpen;
const cacheSet   = async (k, v, ttl=300) => { if (isReady()) { try { await client.setEx(k, ttl, JSON.stringify(v)); } catch(e){} } };
const cacheGet   = async k          => { if (isReady()) { try { const v = await client.get(k); return v ? JSON.parse(v) : null; } catch(e){ return null; } } return null; };
const cacheDel   = async k                => { if (isReady()) { try { await client.del(k); } catch(e){} } };
const cacheIncr  = async (k, ttl=86400)  => { if (isReady()) { try { const v = await client.incr(k); await client.expire(k, ttl); return v; } catch(e){ return 0; } } return 0; };

module.exports = { connectRedis, getRedis, cacheSet, cacheGet, cacheDel, cacheIncr };

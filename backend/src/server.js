'use strict';
const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'production') {
  const envFile = process.env.ENV_FILE || '.env';
  dotenv.config({ path: envFile });
  console.log(`Loaded environment from: ${envFile}`);
}
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('GOOGLE_CLIENT_ID loaded:', !!process.env.GOOGLE_CLIENT_ID);
require('express-async-errors');

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const compression= require('compression');
const morgan     = require('morgan');
const passport   = require('passport');
const { createServer } = require('http');
const { Server }       = require('socket.io');

const { connectPostgres } = require('./config/postgres');
const { connectMongo }    = require('./config/mongo');
const { connectRedis }    = require('./config/redis');
const { initFirebase }    = require('./config/firebase');
const { setupPassport }   = require('./config/passport');
const { setupSocketIO }   = require('./config/socket');
const { startCronJobs }   = require('./jobs/cronJobs');
const { errorHandler }    = require('./middleware/errorHandler');
const { rateLimiter }     = require('./middleware/rateLimiter');
const logger              = require('./utils/logger');

// ── Routes ──
const authRoutes          = require('./routes/auth');
const userRoutes          = require('./routes/users');
const plannerRoutes       = require('./routes/planner');
const fileRoutes          = require('./routes/files');
const notesRoutes         = require('./routes/notes');
const boardRoutes         = require('./routes/board');
const chatRoutes          = require('./routes/chat');
const aiRoutes            = require('./routes/ai');
const notificationRoutes  = require('./routes/notifications');
const achievementRoutes   = require('./routes/achievements');
const quizRoutes          = require('./routes/quiz');
const subjectRoutes       = require('./routes/subjects');
const analyticsRoutes     = require('./routes/analytics');
const groupRoutes         = require('./routes/groups');
const toolRoutes          = require('./routes/tools');
const curriculumRoutes    = require('./routes/curriculum');
const paymentRoutes       = require('./routes/payment');
const adminRoutes         = require('./routes/admin');
const aiSearchRoutes      = require('./routes/ai-search');
const affiliateRoutes     = require('./routes/affiliates');
const walletRoutes        = require('./routes/wallet');
const supportRoutes       = require('./routes/support');

const app        = express();
app.set('trust proxy', 1); // Trust first proxy (Railway/Render load balancers)
const httpServer = createServer(app);

// ── DB Readiness Flag ──
let dbReady = false;
const io         = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      const allowed = [
        process.env.CLIENT_URL,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'https://njaheg-theta.vercel.app',
        'https://njaheg-backend-production.up.railway.app',
        'https://njaheg-production.up.railway.app',
        'https://njaheg-backend.onrender.com',
      ].filter(Boolean);
      const isVercelOrigin = origin && origin.endsWith('.vercel.app');
      // In dev allow all origins; in production enforce the allowlist or vercel.app domains
      if (!origin || allowed.includes(origin) || isVercelOrigin || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error(`Socket CORS blocked: ${origin}`));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket','polling'],
});

const path = require('path');

// ── Health check (Pre-middleware) ──
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', ts: new Date().toISOString(), env: process.env.NODE_ENV })
);

// ── Global Middleware ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'https://www.gstatic.com', 'https://apis.google.com'],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc:      ["'self'", 'data:', 'blob:', 'https://firebasestorage.googleapis.com', 'https://lh3.googleusercontent.com', 'https://storage.googleapis.com'],
      connectSrc:  ["'self'", 'https://generativelanguage.googleapis.com', 'https://api.openai.com', 'https://app.mem0.ai', 'wss:', 'ws:'],
      mediaSrc:    ["'self'", 'blob:', 'https://firebasestorage.googleapis.com'],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
      baseUri:     ["'self'"],
      formAction:  ["'self'"],
    },
    // Disable in development to allow Vite HMR etc.
    ...(process.env.NODE_ENV !== 'production' ? { directives: { defaultSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", '*'] } } : {}),
  },
  crossOriginEmbedderPolicy: false, // Needed for Firebase Storage cross-origin images
  crossOriginResourcePolicy: false, // Allow cross-origin image loads
}));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    // Build allowed list from env (production) + always allow localhost in dev
    const fromEnv = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const prodList = [
      process.env.CLIENT_URL,
      'https://njaheg-theta.vercel.app',
      'https://njaheg-backend-production.up.railway.app',
      'https://njaheg-production.up.railway.app',
      'https://njaheg-backend.onrender.com',
      ...fromEnv,
    ].filter(Boolean);

    const devPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    const isDevOrigin = !origin || devPattern.test(origin);
    const isVercelOrigin = origin && origin.endsWith('.vercel.app');

    // Allow localhost in all environments (safe: localhost cannot be spoofed from the internet)
    // and Vercel deploys + explicitly listed production origins
    if (!origin || isDevOrigin || prodList.includes(origin) || isVercelOrigin) {
      return callback(null, true);
    }
    logger.warn(`[CORS] Blocked request from unlisted origin: ${origin}`);
    return callback(new Error(`CORS policy: ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// ── Explicit OPTIONS pre-flight handler (must be before rateLimiter) ──
// Browsers send a preflight OPTIONS for DELETE/PATCH/POST+Authorization.
// Without this, the rate limiter or DB guard blocks them and CORS fails.
app.options('*', cors({
  origin: (origin, callback) => {
    const fromEnv = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const prodList = [
      process.env.CLIENT_URL,
      'https://njaheg-theta.vercel.app',
      'https://njaheg-backend-production.up.railway.app',
      ...fromEnv,
    ].filter(Boolean);
    const isVercelOrigin = origin && origin.endsWith('.vercel.app');
    if (!origin || prodList.includes(origin) || isVercelOrigin) return callback(null, true);
    callback(null, true); // permissive for preflight
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: m => logger.info(m.trim()) } }));
app.use(passport.initialize());

// ── Rate limiter on all /api routes ──
app.use('/api/', rateLimiter);

// ── DB Readiness Guard — blocks API calls during cold-start ──
// OPTIONS (CORS preflight) must always pass through — never block them.
app.use('/api/', (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  if (!dbReady && !req.path.startsWith('/auth/') && req.path !== '/health') {
    return res.status(503).json({ error: 'Server is starting up, please retry in a few seconds.' });
  }
  next();
});


// ── API Routes ──
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/planner',       plannerRoutes);
app.use('/api/files',         fileRoutes);
app.use('/api/notes',         notesRoutes);
app.use('/api/board',         boardRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/achievements',   achievementRoutes);
app.use('/api/quiz',          quizRoutes);
app.use('/api/subjects',      subjectRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/groups',        groupRoutes);
app.use('/api/tools',         toolRoutes);
app.use('/api/curriculum',    curriculumRoutes);
app.use('/api/payment',       paymentRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/ai-search',     aiSearchRoutes);
app.use('/api/affiliates',    affiliateRoutes);
app.use('/api/wallet',        walletRoutes);
app.use('/api/support',       supportRoutes);

// ── 404 ──
app.use('*', (_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ──
app.use(errorHandler);

// ── Boot sequence ──
async function start() {
  try {
    const PORT = process.env.PORT || 5000;
    const HOST = '0.0.0.0'; 
    
    // Start listening immediately so healthchecks pass
    httpServer.listen(PORT, HOST, () => {
      logger.info(`🚀 Najah API running on ${HOST}:${PORT} [${process.env.NODE_ENV || 'dev'}]`);
      logger.info('⏳ Connecting to databases in background...');
    });

    // Databases - parallel connecting
    Promise.allSettled([
      connectPostgres().catch(e => logger.warn(`⚠️  Postgres unavailable: ${e.message}`)),
      connectMongo().catch(e => logger.warn(`⚠️  MongoDB unavailable: ${e.message}`)),
      connectRedis().catch(e => logger.warn(`⚠️  Redis unavailable: ${e.message}`))
    ]).then(async () => {
      logger.info('📢 Database initialization sequence complete');
      
      // Load persisted platform fee from DB (overrides .env default)
      try {
        const { pool } = require('./config/postgres');
        const { rows: feeRows } = await pool.query(
          "SELECT value FROM platform_settings WHERE key='platform_fee_percent'"
        );
        if (feeRows[0]) {
          process.env.PLATFORM_FEE_PERCENT = String(feeRows[0].value);
          logger.info(`💰 Platform fee loaded from DB: ${feeRows[0].value}%`);
        }
      } catch (e) { logger.warn('Platform fee DB load skipped:', e.message); }

      // Mark server as ready — unblocks API routes
      dbReady = true;
      logger.info('✅ All systems ready — API now accepting requests');

      // Start non-critical services
      try { initFirebase(); } catch(e) { logger.warn('⚠️  Firebase unavailable:', e.message); }
      try { setupPassport(); } catch(e) { logger.warn('⚠️  Passport unavailable:', e.message); }
      try { setupSocketIO(io); } catch(e) { logger.warn('⚠️  Socket.IO unavailable:', e.message); }
      try { startCronJobs(); } catch(e) { logger.warn('⚠️  Cron jobs unavailable:', e.message); }
    });

  } catch (err) {
    logger.error('Fatal startup error:', err);
    process.exit(1);
  }
}

start();
module.exports = { app, io };

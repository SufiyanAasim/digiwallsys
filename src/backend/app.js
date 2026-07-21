const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const fundingRoutes = require('./routes/funding');
const notificationRoutes = require('./routes/notifications');
const paymentRequestRoutes = require('./routes/paymentRequests');
const scheduleRoutes = require('./routes/schedules');
const transactionRoutes = require('./routes/transaction');
const userRoutes = require('./routes/users');
const walletRoutes = require('./routes/wallet');
const pool = require('./db');

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : true;

app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({
  limit: '100kb',
  verify: (req, _res, buffer) => { req.rawBody = Buffer.from(buffer); },
}));
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.GLOBAL_RATE_LIMIT || 120),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

app.get('/', (_req, res) => {
  res.json({ name: 'digiwallsys', status: 'running' });
});

app.get('/api/health', (_req, res) => {
  res.json({ name: 'digiwallsys', status: 'ok', version: '1.5.5' });
});

app.get('/api/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ name: 'digiwallsys', status: 'ready' });
  } catch (_error) {
    return res.status(503).json({ name: 'digiwallsys', status: 'not_ready' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/funding', fundingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payment-requests', paymentRequestRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled request error:', error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : error.message });
});

module.exports = app;

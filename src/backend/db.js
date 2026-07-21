const { Pool } = require('pg');
require('dotenv').config();

const useSsl = process.env.DATABASE_SSL === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: Number(process.env.DATABASE_POOL_SIZE || 10),
  connectionTimeoutMillis: 5000,
});

pool.on('error', (error) => {
  console.error('Unexpected database pool error:', error);
});

module.exports = pool;

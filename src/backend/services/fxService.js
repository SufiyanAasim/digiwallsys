const pool = require('../db');

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

async function getLatestRate(client, baseCurrency, quoteCurrency) {
  if (baseCurrency === quoteCurrency) return 1;
  const direct = await client.query(
    `SELECT rate FROM fx_rates WHERE base_currency = $1 AND quote_currency = $2
     ORDER BY effective_at DESC LIMIT 1`,
    [baseCurrency, quoteCurrency]
  );
  if (direct.rowCount) return Number(direct.rows[0].rate);

  const inverse = await client.query(
    `SELECT rate FROM fx_rates WHERE base_currency = $1 AND quote_currency = $2
     ORDER BY effective_at DESC LIMIT 1`,
    [quoteCurrency, baseCurrency]
  );
  if (inverse.rowCount) return 1 / Number(inverse.rows[0].rate);

  return null;
}

async function setRate(baseCurrency, quoteCurrency, rate, setBy) {
  if (!CURRENCY_PATTERN.test(baseCurrency) || !CURRENCY_PATTERN.test(quoteCurrency) || baseCurrency === quoteCurrency) {
    const error = new Error('Provide two distinct 3-letter currency codes');
    error.status = 400;
    throw error;
  }
  if (!(rate > 0)) {
    const error = new Error('Rate must be a positive number');
    error.status = 400;
    throw error;
  }
  const result = await pool.query(
    `INSERT INTO fx_rates(base_currency, quote_currency, rate, set_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [baseCurrency, quoteCurrency, rate, setBy]
  );
  return result.rows[0];
}

async function listCurrentRates() {
  const result = await pool.query(`
    SELECT DISTINCT ON (base_currency, quote_currency)
      rateid, base_currency, quote_currency, rate, effective_at
    FROM fx_rates
    ORDER BY base_currency, quote_currency, effective_at DESC
  `);
  return result.rows;
}

module.exports = { getLatestRate, setRate, listCurrentRates, CURRENCY_PATTERN };

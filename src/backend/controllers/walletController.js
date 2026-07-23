const pool = require('../db');
const parseAmount = require('../utils/amount');
const { getLatestRate } = require('../services/fxService');
const { ensureWalletAccount, getFxSuspenseAccount, postJournal } = require('../services/ledgerService');
const { writeAudit } = require('../services/auditService');

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

async function getBalance(req, res, next) {
  const currency = String(req.query.currency || 'USD').toUpperCase();
  try {
    const result = await pool.query(
      `SELECT walletid, balance, currency FROM wallet WHERE userid = $1 AND currency = $2`,
      [req.user.userId, currency]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Wallet not found for that currency' });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function listWallets(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT walletid, balance, currency FROM wallet WHERE userid = $1 ORDER BY currency`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function addCurrencyWallet(req, res, next) {
  const currency = String(req.body.currency || '').toUpperCase();
  if (!CURRENCY_PATTERN.test(currency)) {
    return res.status(400).json({ error: 'Provide a 3-letter currency code' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const walletResult = await client.query(
      `INSERT INTO wallet(userid, balance, currency) VALUES ($1, 0, $2)
       RETURNING walletid, balance, currency`,
      [req.user.userId, currency]
    );
    await ensureWalletAccount(client, walletResult.rows[0]);
    await client.query(
      `INSERT INTO wallet_members(walletid, userid, role) VALUES ($1, $2, 'owner')`,
      [walletResult.rows[0].walletid, req.user.userId]
    );
    await client.query('COMMIT');
    return res.status(201).json(walletResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error: 'You already have a wallet in that currency' });
    return next(error);
  } finally {
    client.release();
  }
}

async function convertCurrency(req, res, next) {
  const fromCurrency = String(req.body.fromCurrency || '').toUpperCase();
  const toCurrency = String(req.body.toCurrency || '').toUpperCase();
  const amount = parseAmount(req.body.amount);
  if (!CURRENCY_PATTERN.test(fromCurrency) || !CURRENCY_PATTERN.test(toCurrency) || fromCurrency === toCurrency) {
    return res.status(400).json({ error: 'Provide two distinct 3-letter currency codes' });
  }
  if (amount === null) {
    return res.status(400).json({ error: 'Amount must be positive with at most two decimals' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rate = await getLatestRate(client, fromCurrency, toCurrency);
    if (rate === null) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: `No exchange rate is available for ${fromCurrency} to ${toCurrency}` });
    }

    const fromWalletResult = await client.query(
      `SELECT * FROM wallet WHERE userid = $1 AND currency = $2 FOR UPDATE`,
      [req.user.userId, fromCurrency]
    );
    if (!fromWalletResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `You do not have a ${fromCurrency} wallet` });
    }
    const fromWallet = fromWalletResult.rows[0];
    if (Number(fromWallet.balance) < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    let toWalletResult = await client.query(
      `SELECT * FROM wallet WHERE userid = $1 AND currency = $2 FOR UPDATE`,
      [req.user.userId, toCurrency]
    );
    if (!toWalletResult.rowCount) {
      toWalletResult = await client.query(
        `INSERT INTO wallet(userid, balance, currency) VALUES ($1, 0, $2) RETURNING *`,
        [req.user.userId, toCurrency]
      );
      await client.query(
        `INSERT INTO wallet_members(walletid, userid, role) VALUES ($1, $2, 'owner')`,
        [toWalletResult.rows[0].walletid, req.user.userId]
      );
    }
    const toWallet = toWalletResult.rows[0];

    const convertedAmount = Math.round(amount * rate * 100) / 100;

    const fromAccount = await ensureWalletAccount(client, fromWallet);
    const fromSuspense = await getFxSuspenseAccount(client, fromCurrency);
    await postJournal(client, {
      journalType: 'fx_conversion_out',
      description: `Convert ${fromCurrency} to ${toCurrency}`,
      createdBy: req.user.userId,
      metadata: { fromCurrency, toCurrency, amount, rate },
      entries: [
        { accountId: fromAccount, entryType: 'debit', amount },
        { accountId: fromSuspense, entryType: 'credit', amount },
      ],
    });

    const toAccount = await ensureWalletAccount(client, toWallet);
    const toSuspense = await getFxSuspenseAccount(client, toCurrency);
    await postJournal(client, {
      journalType: 'fx_conversion_in',
      description: `Convert ${fromCurrency} to ${toCurrency}`,
      createdBy: req.user.userId,
      metadata: { fromCurrency, toCurrency, amount, rate },
      entries: [
        { accountId: toSuspense, entryType: 'debit', amount: convertedAmount },
        { accountId: toAccount, entryType: 'credit', amount: convertedAmount },
      ],
    });

    await client.query('UPDATE wallet SET balance = balance - $1 WHERE walletid = $2', [amount, fromWallet.walletid]);
    await client.query('UPDATE wallet SET balance = balance + $1 WHERE walletid = $2', [convertedAmount, toWallet.walletid]);

    const conversionResult = await client.query(
      `INSERT INTO currency_conversions(userid, from_currency, to_currency, from_amount, to_amount, rate)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.userId, fromCurrency, toCurrency, amount, convertedAmount, rate]
    );

    await writeAudit(client, {
      actorUserId: req.user.userId,
      action: 'wallet.converted',
      resourceType: 'currency_conversion',
      resourceId: conversionResult.rows[0].conversionid,
      metadata: { fromCurrency, toCurrency, amount, convertedAmount, rate },
      ipAddress: req.ip,
    });

    await client.query('COMMIT');
    return res.json(conversionResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

async function listConversions(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT * FROM currency_conversions WHERE userid = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

module.exports = { getBalance, listWallets, addCurrencyWallet, convertCurrency, listConversions };

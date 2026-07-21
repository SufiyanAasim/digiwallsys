const { randomUUID } = require('node:crypto');
const pool = require('../db');
const parseAmount = require('../utils/amount');
const { verifyHmac } = require('../utils/crypto');
const { writeAudit } = require('../services/auditService');
const { ensureWalletAccount, getClearingAccount, postJournal } = require('../services/ledgerService');
const { createNotification } = require('../services/notificationService');

async function createFundingIntent(req, res, next) {
  const amount = parseAmount(req.body.amount);
  const provider = String(req.body.provider || process.env.FUNDING_PROVIDER || 'sandbox').toLowerCase();
  const supportedProvider = String(process.env.FUNDING_PROVIDER || 'sandbox').toLowerCase();
  if (amount === null) {
    await req.idempotency.release();
    return res.status(400).json({ error: 'Amount must be positive with at most two decimals' });
  }
  if (provider !== supportedProvider) {
    await req.idempotency.release();
    return res.status(400).json({ error: 'Unsupported funding provider' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const wallet = await client.query(
      'SELECT walletid, currency FROM wallet WHERE userid = $1',
      [req.user.userId]
    );
    if (!wallet.rowCount) {
      await client.query('ROLLBACK');
      await req.idempotency.release();
      return res.status(404).json({ error: 'Wallet not found' });
    }
    const providerReference = `${provider}_${randomUUID()}`;
    const result = await client.query(
      `INSERT INTO funding_intents
         (userid, walletid, provider, provider_reference, amount, currency)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING fundingid, provider, provider_reference, amount, currency, status, created_at`,
      [
        req.user.userId,
        wallet.rows[0].walletid,
        provider,
        providerReference,
        amount,
        wallet.rows[0].currency,
      ]
    );
    await writeAudit(client, {
      actorUserId: req.user.userId,
      action: 'funding.intent_created',
      resourceType: 'funding_intent',
      resourceId: result.rows[0].fundingid,
      metadata: { amount, provider },
      ipAddress: req.ip,
    });
    await client.query('COMMIT');

    const checkoutTemplate = process.env.FUNDING_PROVIDER_CHECKOUT_URL || '';
    const body = {
      intent: result.rows[0],
      checkoutUrl: checkoutTemplate
        ? checkoutTemplate.replace('{reference}', encodeURIComponent(providerReference))
        : null,
      message: checkoutTemplate
        ? 'Continue with the configured provider. Balance changes only after a signed webhook.'
        : 'Funding intent created. Configure a provider checkout URL and signed webhook to complete it.',
    };
    await req.idempotency.complete(201, body);
    return res.status(201).json(body);
  } catch (error) {
    await client.query('ROLLBACK');
    await req.idempotency.release();
    return next(error);
  } finally {
    client.release();
  }
}

async function listFundingIntents(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT fundingid, provider, provider_reference, amount, currency, status, created_at, updated_at
       FROM funding_intents WHERE userid = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function providerWebhook(req, res, next) {
  const provider = String(req.params.provider).toLowerCase();
  const secret = process.env.FUNDING_WEBHOOK_SECRET;
  const signature = req.get('x-provider-signature');
  if (!verifyHmac(req.rawBody || Buffer.from(''), signature, secret)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  const eventId = String(req.body.eventId || '');
  const providerReference = String(req.body.providerReference || '');
  const eventStatus = String(req.body.status || '');
  if (!eventId || !providerReference || !['succeeded', 'failed'].includes(eventStatus)) {
    return res.status(400).json({ error: 'Invalid provider event' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const event = await client.query(
      `INSERT INTO provider_events(provider, provider_event_id, payload)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING provider_event_id`,
      [provider, eventId, req.body]
    );
    if (!event.rowCount) {
      await client.query('COMMIT');
      return res.json({ received: true, duplicate: true });
    }

    const intentResult = await client.query(
      `SELECT fi.*, w.balance, w.currency AS wallet_currency
       FROM funding_intents fi JOIN wallet w ON w.walletid = fi.walletid
       WHERE fi.provider = $1 AND fi.provider_reference = $2
       FOR UPDATE OF fi, w`,
      [provider, providerReference]
    );
    if (!intentResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Funding intent not found' });
    }
    const intent = intentResult.rows[0];
    if (intent.status === 'succeeded') {
      await client.query('COMMIT');
      return res.json({ received: true, duplicate: true });
    }
    if (eventStatus === 'failed') {
      await client.query(
        `UPDATE funding_intents SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE fundingid = $1`,
        [intent.fundingid]
      );
      await createNotification(client, {
        userId: intent.userid,
        category: 'money',
        title: 'Funding failed',
        body: `The ${provider} funding attempt was not completed.`,
        data: { fundingId: intent.fundingid },
      });
      await client.query('COMMIT');
      return res.json({ received: true });
    }

    const walletAccount = await ensureWalletAccount(client, {
      walletid: intent.walletid,
      currency: intent.currency,
    });
    const clearingAccount = await getClearingAccount(client, intent.currency);
    const journal = await postJournal(client, {
      journalType: 'funding',
      description: `Verified ${provider} funding`,
      createdBy: intent.userid,
      metadata: { provider, eventId, providerReference },
      entries: [
        { accountId: clearingAccount, entryType: 'debit', amount: intent.amount },
        { accountId: walletAccount, entryType: 'credit', amount: intent.amount },
      ],
    });
    await client.query('UPDATE wallet SET balance = balance + $1 WHERE walletid = $2', [intent.amount, intent.walletid]);
    await client.query(
      `UPDATE funding_intents
       SET status = 'succeeded', journalid = $2, updated_at = CURRENT_TIMESTAMP
       WHERE fundingid = $1`,
      [intent.fundingid, journal.journalid]
    );
    await createNotification(client, {
      userId: intent.userid,
      category: 'money',
      title: 'Funds added',
      body: `${intent.currency} ${Number(intent.amount).toFixed(2)} was verified and added to your wallet.`,
      data: { fundingId: intent.fundingid, reference: journal.reference },
    });
    await writeAudit(client, {
      actorUserId: intent.userid,
      action: 'funding.succeeded',
      resourceType: 'funding_intent',
      resourceId: intent.fundingid,
      metadata: { provider, eventId, amount: intent.amount, journalId: journal.journalid },
    });
    await client.query('COMMIT');
    return res.json({ received: true });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

module.exports = { createFundingIntent, listFundingIntents, providerWebhook };

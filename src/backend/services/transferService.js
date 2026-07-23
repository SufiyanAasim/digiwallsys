const { writeAudit } = require('./auditService');
const { assessTransfer } = require('./fraudService');
const { ensureWalletAccount, postJournal } = require('./ledgerService');
const { createNotification, createSpendingAlert } = require('./notificationService');

function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// Resolves the wallet an authorized sender may spend from and, when acting on
// behalf of another owner (a shared wallet), enforces that member's monthly
// spending_limit. Kept separate from the row lookup below so the lock query can
// fetch sender and receiver wallets together in one round trip as before.
async function assertSpendAuthorized(client, { actingUserId, wallet, amount }) {
  if (wallet.userid === actingUserId) return;
  const member = await client.query(
    'SELECT spending_limit FROM wallet_members WHERE walletid = $1 AND userid = $2',
    [wallet.walletid, actingUserId]
  );
  if (!member.rowCount) {
    const error = new Error('You are not authorized to spend from this wallet');
    error.status = 403;
    throw error;
  }
  const limit = member.rows[0].spending_limit;
  if (limit == null) return;
  const spent = await client.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
     WHERE senderwalletid = $1 AND spender_userid = $2 AND timestamp >= $3`,
    [wallet.walletid, actingUserId, startOfMonth()]
  );
  if (Number(spent.rows[0].total) + Number(amount) > Number(limit)) {
    const error = new Error('This transfer would exceed your monthly spending limit on this wallet');
    error.status = 403;
    throw error;
  }
}

async function executeTransfer(client, {
  senderId,
  receiverId,
  amount,
  description = '',
  idempotencyKey = null,
  source = 'direct',
  ipAddress = null,
  senderCurrency = 'USD',
  receiverCurrency = 'USD',
  senderOwnerId = null,
}) {
  const senderWalletOwnerId = senderOwnerId || senderId;

  const walletsResult = await client.query(
    `SELECT w.walletid, w.userid, w.balance, w.currency, u.name
     FROM wallet w JOIN users u ON u.userid = w.userid
     WHERE (w.userid = $1 AND w.currency = $2) OR (w.userid = $3 AND w.currency = $4)
     ORDER BY w.userid
     FOR UPDATE OF w`,
    [senderWalletOwnerId, senderCurrency, receiverId, receiverCurrency]
  );
  const senderWallet = walletsResult.rows.find(
    (wallet) => wallet.userid === senderWalletOwnerId && wallet.currency === senderCurrency
  );
  const receiverWallet = walletsResult.rows.find(
    (wallet) => wallet.userid === receiverId && wallet.currency === receiverCurrency
  );
  if (!senderWallet || !receiverWallet) {
    const error = new Error('Sender or recipient wallet not found');
    error.status = 404;
    throw error;
  }
  if (senderWallet.currency !== receiverWallet.currency) {
    const error = new Error('Cross-currency transfers are not enabled for this release');
    error.status = 400;
    throw error;
  }

  await assertSpendAuthorized(client, { actingUserId: senderId, wallet: senderWallet, amount });

  // The sender wallet lock serializes risk evaluation for concurrent transfers.
  // This keeps daily totals and velocity checks from evaluating stale activity.
  const fraud = await assessTransfer(client, { userId: senderId, receiverId, amount });
  if (fraud.blocked) return { blocked: true, fraud };

  if (Number(senderWallet.balance) < Number(amount)) {
    const error = new Error('Insufficient balance');
    error.status = 400;
    throw error;
  }

  const senderAccount = await ensureWalletAccount(client, senderWallet);
  const receiverAccount = await ensureWalletAccount(client, receiverWallet);
  const journal = await postJournal(client, {
    journalType: 'transfer',
    description,
    createdBy: senderId,
    metadata: { senderId, receiverId, source, idempotencyKey },
    entries: [
      { accountId: senderAccount, entryType: 'debit', amount },
      { accountId: receiverAccount, entryType: 'credit', amount },
    ],
  });

  await client.query('UPDATE wallet SET balance = balance - $1 WHERE walletid = $2', [amount, senderWallet.walletid]);
  await client.query('UPDATE wallet SET balance = balance + $1 WHERE walletid = $2', [amount, receiverWallet.walletid]);
  const transactionResult = await client.query(
    `INSERT INTO transactions
       (senderwalletid, receiverwalletid, amount, description, journalid, idempotency_key, reference, spender_userid)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING transactionid, reference, amount, description, timestamp`,
    [
      senderWallet.walletid,
      receiverWallet.walletid,
      amount,
      description,
      journal.journalid,
      idempotencyKey,
      journal.reference,
      senderId,
    ]
  );
  const transaction = transactionResult.rows[0];

  await createNotification(client, {
    userId: senderWalletOwnerId,
    category: 'money',
    title: 'Payment sent',
    body: `${senderWallet.currency} ${Number(amount).toFixed(2)} sent to ${receiverWallet.name}.`,
    data: { reference: transaction.reference, direction: 'debit' },
  });
  await createNotification(client, {
    userId: receiverId,
    category: 'money',
    title: 'Payment received',
    body: `${receiverWallet.currency} ${Number(amount).toFixed(2)} received from ${senderWallet.name}.`,
    data: { reference: transaction.reference, direction: 'credit' },
  });
  await createSpendingAlert(client, senderId, amount, transaction.reference, senderWallet.currency);
  await writeAudit(client, {
    actorUserId: senderId,
    action: 'transaction.sent',
    resourceType: 'transaction',
    resourceId: String(transaction.transactionid),
    metadata: { receiverId, amount, reference: transaction.reference, source, senderWalletOwnerId },
    ipAddress,
  });

  return {
    blocked: false,
    transaction: {
      ...transaction,
      direction: 'debit',
      counterparty: receiverWallet.name,
      currency: senderWallet.currency,
    },
  };
}

module.exports = { executeTransfer };

const { writeAudit } = require('./auditService');
const { assessTransfer } = require('./fraudService');
const { ensureWalletAccount, postJournal } = require('./ledgerService');
const { createNotification, createSpendingAlert } = require('./notificationService');

async function executeTransfer(client, {
  senderId,
  receiverId,
  amount,
  description = '',
  idempotencyKey = null,
  source = 'direct',
  ipAddress = null,
}) {
  const walletsResult = await client.query(
    `SELECT w.walletid, w.userid, w.balance, w.currency, u.name
     FROM wallet w JOIN users u ON u.userid = w.userid
     WHERE w.userid = ANY($1::int[])
     ORDER BY w.userid
     FOR UPDATE OF w`,
    [[senderId, receiverId]]
  );
  const senderWallet = walletsResult.rows.find((wallet) => wallet.userid === senderId);
  const receiverWallet = walletsResult.rows.find((wallet) => wallet.userid === receiverId);
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
       (senderwalletid, receiverwalletid, amount, description, journalid, idempotency_key, reference)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING transactionid, reference, amount, description, timestamp`,
    [
      senderWallet.walletid,
      receiverWallet.walletid,
      amount,
      description,
      journal.journalid,
      idempotencyKey,
      journal.reference,
    ]
  );
  const transaction = transactionResult.rows[0];

  await createNotification(client, {
    userId: senderId,
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
    metadata: { receiverId, amount, reference: transaction.reference, source },
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

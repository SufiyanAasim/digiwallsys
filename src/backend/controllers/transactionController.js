const PDFDocument = require('pdfkit');
const pool = require('../db');
const parseAmount = require('../utils/amount');
const { executeTransfer } = require('../services/transferService');

const VALID_CATEGORY = /^[\w\s&/'-]{1,40}$/;

async function applyTransferMetadata(client, {
  senderId,
  transactionId,
  amount,
  currency,
  category,
  isSharedWallet,
}) {
  if (category) {
    await client.query('UPDATE transactions SET category = $1 WHERE transactionid = $2', [category, transactionId]);
  }
  if (isSharedWallet) return;

  const requestedRoundUp = Math.ceil(amount) - amount;
  if (requestedRoundUp <= 0) return;

  const goals = await client.query(
    `SELECT goalid, current_amount, target_amount, round_up_enabled, status
     FROM savings_goals
     WHERE userid = $1 AND currency = $2 AND status != 'archived'
     ORDER BY round_up_enabled DESC, created_at
     FOR UPDATE`,
    [senderId, currency]
  );
  const goal = goals.rows.find((item) => item.round_up_enabled && item.status === 'active');
  if (!goal) return;

  const wallet = await client.query(
    'SELECT balance FROM wallet WHERE userid = $1 AND currency = $2 FOR UPDATE',
    [senderId, currency]
  );
  const earmarked = goals.rows.reduce((sum, item) => sum + Number(item.current_amount), 0);
  const available = Math.max(Number(wallet.rows[0]?.balance || 0) - earmarked, 0);
  const remainingTarget = Math.max(Number(goal.target_amount) - Number(goal.current_amount), 0);
  const roundUp = Math.min(requestedRoundUp, available, remainingTarget);
  if (roundUp > 0) {
    await client.query(
      `UPDATE savings_goals SET
         current_amount = current_amount + $1,
         status = CASE WHEN current_amount + $1 >= target_amount THEN 'completed' ELSE status END,
         updated_at = CURRENT_TIMESTAMP
       WHERE goalid = $2`,
      [roundUp, goal.goalid]
    );
  }
}

function validateHistoryQuery(query) {
  if (query.direction && !['debit', 'credit'].includes(query.direction)) {
    return 'Direction must be debit or credit';
  }
  if (query.q && String(query.q).length > 200) return 'Search text must not exceed 200 characters';
  if (query.currency && !/^[A-Za-z]{3}$/.test(String(query.currency))) {
    return 'Currency must be a 3-letter code';
  }

  const dates = {};
  for (const key of ['from', 'to', 'cursor']) {
    if (!query[key]) continue;
    dates[key] = new Date(query[key]);
    if (Number.isNaN(dates[key].getTime())) return `${key} must be a valid date`;
  }
  if (dates.from && dates.to && dates.from > dates.to) return 'from must be earlier than to';

  const amounts = {};
  for (const key of ['min', 'max']) {
    if (query[key] == null || query[key] === '') continue;
    const text = String(query[key]);
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return `${key} must be a non-negative amount with at most two decimals`;
    amounts[key] = Number(text);
  }
  if (amounts.min !== undefined && amounts.max !== undefined && amounts.min > amounts.max) {
    return 'min must not exceed max';
  }
  return null;
}

async function sendMoney(req, res, next) {
  const senderId = req.user.userId;
  const receiverId = Number(req.body.receiverId);
  const amount = parseAmount(req.body.amount);
  const description = String(req.body.description || '').trim().slice(0, 255);
  const category = req.body.category ? String(req.body.category).trim().slice(0, 40) : null;
  const currency = String(req.body.currency || 'USD').toUpperCase();
  const senderOwnerId = req.body.fromOwnerId ? Number(req.body.fromOwnerId) : null;
  if (!Number.isInteger(receiverId) || receiverId === senderId) {
    await req.idempotency.release();
    return res.status(400).json({ error: 'Choose a valid recipient' });
  }
  if (amount === null) {
    await req.idempotency.release();
    return res.status(400).json({ error: 'Amount must be positive with at most two decimals' });
  }
  if (category && !VALID_CATEGORY.test(category)) {
    await req.idempotency.release();
    return res.status(400).json({ error: 'Category contains unsupported characters' });
  }
  if (senderOwnerId !== null && (!Number.isInteger(senderOwnerId) || senderOwnerId === senderId)) {
    await req.idempotency.release();
    return res.status(400).json({ error: 'Invalid shared wallet owner' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await executeTransfer(client, {
      senderId,
      receiverId,
      amount,
      description,
      senderCurrency: currency,
      receiverCurrency: currency,
      senderOwnerId,
      idempotencyKey: req.idempotency.key,
      ipAddress: req.ip,
    });
    if (result.blocked) {
      const body = { error: 'Transfer blocked by risk controls', reasons: result.fraud.reasons };
      await req.idempotency.complete(client, 403, body);
      await client.query('COMMIT');
      return res.status(403).json(body);
    }
    await applyTransferMetadata(client, {
      senderId,
      transactionId: result.transaction.transactionid,
      amount,
      currency,
      category,
      isSharedWallet: senderOwnerId !== null,
    });
    if (category) result.transaction.category = category;
    const body = { message: 'Transaction successful', transaction: result.transaction };
    await req.idempotency.complete(client, 200, body);
    await client.query('COMMIT');
    return res.json(body);
  } catch (error) {
    await client.query('ROLLBACK');
    await req.idempotency.release();
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  } finally {
    client.release();
  }
}

function historyQuery(userId, query, singleReference = null) {
  const values = [userId];
  const where = ['mine.userid = $1'];
  const add = (clause, value) => {
    values.push(value);
    where.push(clause.replace('?', `$${values.length}`));
  };

  if (singleReference) add('t.reference = ?::uuid', singleReference);
  if (query.q) {
    values.push(`%${query.q}%`);
    const searchParameter = `$${values.length}`;
    where.push(
      `(t.description ILIKE ${searchParameter} OR sender.name ILIKE ${searchParameter} `
      + `OR receiver.name ILIKE ${searchParameter} OR t.reference::text ILIKE ${searchParameter})`
    );
  }
  if (query.direction === 'debit') where.push('t.senderwalletid = mine.walletid');
  if (query.direction === 'credit') where.push('t.receiverwalletid = mine.walletid');
  if (query.currency) add('mine.currency = ?', String(query.currency).toUpperCase());
  if (query.from) add('t.timestamp >= ?::timestamptz', query.from);
  if (query.to) add('t.timestamp <= ?::timestamptz', query.to);
  if (query.min) add('t.amount >= ?::numeric', query.min);
  if (query.max) add('t.amount <= ?::numeric', query.max);
  if (query.cursor) add('t.timestamp < ?::timestamptz', query.cursor);

  const limit = singleReference
    ? 1
    : query.exportAll
      ? 10000
      : Math.min(Math.max(Number(query.limit) || 25, 1), 100);
  values.push(limit);
  const sql = `
    SELECT t.transactionid, t.reference, t.amount, t.description, t.timestamp, t.category,
           mine.currency,
           CASE WHEN t.senderwalletid = mine.walletid THEN 'debit' ELSE 'credit' END AS direction,
           CASE WHEN t.senderwalletid = mine.walletid THEN receiver.name ELSE sender.name END AS counterparty,
           sender.name AS sender_name, receiver.name AS receiver_name
    FROM wallet mine
    JOIN transactions t ON t.senderwalletid = mine.walletid OR t.receiverwalletid = mine.walletid
    JOIN wallet sender_wallet ON sender_wallet.walletid = t.senderwalletid
    JOIN users sender ON sender.userid = sender_wallet.userid
    JOIN wallet receiver_wallet ON receiver_wallet.walletid = t.receiverwalletid
    JOIN users receiver ON receiver.userid = receiver_wallet.userid
    WHERE ${where.join(' AND ')}
    ORDER BY t.timestamp DESC
    LIMIT $${values.length}`;
  return { sql, values };
}

async function getHistory(req, res, next) {
  const validationError = validateHistoryQuery(req.query);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const { sql, values } = historyQuery(req.user.userId, req.query);
    const result = await pool.query(sql, values);
    return res.json({
      items: result.rows,
      nextCursor: result.rows.length ? result.rows.at(-1).timestamp : null,
    });
  } catch (error) {
    return next(error);
  }
}

async function getReceipt(req, res, next) {
  try {
    const { sql, values } = historyQuery(req.user.userId, {}, req.params.reference);
    const result = await pool.query(sql, values);
    if (!result.rowCount) return res.status(404).json({ error: 'Receipt not found' });
    return res.json({
      receipt: result.rows[0],
      issuedBy: 'digiwallsys',
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error.code === '22P02') return res.status(400).json({ error: 'Invalid receipt reference' });
    return next(error);
  }
}

async function updateCategory(req, res, next) {
  const category = req.body.category ? String(req.body.category).trim().slice(0, 40) : null;
  if (category && !VALID_CATEGORY.test(category)) {
    return res.status(400).json({ error: 'Category contains unsupported characters' });
  }
  try {
    const result = await pool.query(
      `UPDATE transactions t SET category = $1
       FROM wallet w
       WHERE t.reference = $2::uuid AND t.senderwalletid = w.walletid AND w.userid = $3
       RETURNING t.reference, t.category`,
      [category, req.params.reference, req.user.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Transaction not found, or you are not the sender' });
    return res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '22P02') return res.status(400).json({ error: 'Invalid transaction reference' });
    return next(error);
  }
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

async function exportHistory(req, res, next) {
  const validationError = validateHistoryQuery(req.query);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const { sql, values } = historyQuery(req.user.userId, { ...req.query, exportAll: true });
    const result = await pool.query(sql, values);
    const rows = [
      ['Reference', 'Date', 'Direction', 'Counterparty', 'Description', 'Amount', 'Currency'],
      ...result.rows.map((row) => [
        row.reference,
        row.timestamp.toISOString(),
        row.direction,
        row.counterparty,
        row.description,
        row.amount,
        row.currency,
      ]),
    ];
    res.set('content-type', 'text/csv; charset=utf-8');
    res.set('content-disposition', 'attachment; filename="digiwallsys-transactions.csv"');
    return res.send(rows.map((row) => row.map(csvCell).join(',')).join('\n'));
  } catch (error) {
    return next(error);
  }
}

async function exportStatement(req, res, next) {
  const validationError = validateHistoryQuery(req.query);
  if (validationError) return res.status(400).json({ error: validationError });
  if (!req.query.currency) {
    return res.status(400).json({
      error: 'Currency is required for a statement so totals are not combined across currencies',
    });
  }
  try {
    const { sql, values } = historyQuery(req.user.userId, { ...req.query, exportAll: true });
    const result = await pool.query(sql, values);
    const userResult = await pool.query('SELECT name FROM users WHERE userid = $1', [req.user.userId]);
    const accountName = userResult.rows[0]?.name || 'digiwallsys account';

    res.set('content-type', 'application/pdf');
    res.set('content-disposition', 'attachment; filename="digiwallsys-statement.pdf"');

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.pipe(res);

    doc.fontSize(20).text('digiwallsys — Account statement', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#555').text(`Account holder: ${accountName}`);
    doc.text(`Currency: ${String(req.query.currency).toUpperCase()}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    if (req.query.from || req.query.to) {
      doc.text(`Period: ${req.query.from ? new Date(req.query.from).toLocaleDateString() : 'inception'} – ${req.query.to ? new Date(req.query.to).toLocaleDateString() : 'now'}`);
    }
    doc.moveDown();
    doc.fillColor('#000');

    const columns = [
      { label: 'Date', width: 80 },
      { label: 'Counterparty', width: 130 },
      { label: 'Description', width: 150 },
      { label: 'Direction', width: 60 },
      { label: 'Amount', width: 75 },
    ];
    const startX = doc.x;
    let y = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    let x = startX;
    for (const column of columns) { doc.text(column.label, x, y, { width: column.width }); x += column.width; }
    y += 16;
    doc.moveTo(startX, y - 3).lineTo(x, y - 3).strokeColor('#ccc').stroke();
    doc.font('Helvetica');

    let totalIn = 0;
    let totalOut = 0;
    for (const row of result.rows) {
      if (y > 760) { doc.addPage(); y = doc.y; }
      x = startX;
      const cells = [
        new Date(row.timestamp).toLocaleDateString(),
        row.counterparty,
        row.description || '—',
        row.direction === 'debit' ? 'Sent' : 'Received',
        `${row.direction === 'debit' ? '-' : '+'}${row.currency} ${Number(row.amount).toFixed(2)}`,
      ];
      if (row.direction === 'debit') totalOut += Number(row.amount); else totalIn += Number(row.amount);
      for (let i = 0; i < columns.length; i += 1) {
        doc.fontSize(9).text(cells[i], x, y, { width: columns[i].width });
        x += columns[i].width;
      }
      y += 16;
    }

    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica-Bold');
    const currency = String(req.query.currency).toUpperCase();
    doc.text(`Total received: +${currency} ${totalIn.toFixed(2)}`);
    doc.text(`Total sent: -${currency} ${totalOut.toFixed(2)}`);
    doc.text(`Net: ${currency} ${(totalIn - totalOut).toFixed(2)}`);

    doc.end();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  sendMoney,
  getHistory,
  getReceipt,
  exportHistory,
  exportStatement,
  updateCategory,
  validateHistoryQuery,
  historyQuery,
};

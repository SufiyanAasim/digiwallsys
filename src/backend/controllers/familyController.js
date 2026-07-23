const pool = require('../db');
const { writeAudit } = require('../services/auditService');

async function myOwnedWallet(userId, currency) {
  const result = await pool.query('SELECT walletid FROM wallet WHERE userid = $1 AND currency = $2', [userId, currency]);
  return result.rows[0]?.walletid || null;
}

async function listMembers(req, res, next) {
  const currency = String(req.query.currency || 'USD').toUpperCase();
  try {
    const walletId = await myOwnedWallet(req.user.userId, currency);
    if (!walletId) return res.status(404).json({ error: `You do not have a ${currency} wallet` });
    const result = await pool.query(
      `SELECT wm.userid, wm.role, wm.spending_limit, wm.created_at, u.name, u.email
       FROM wallet_members wm JOIN users u ON u.userid = wm.userid
       WHERE wm.walletid = $1 ORDER BY wm.role DESC, wm.created_at`,
      [walletId]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function addMember(req, res, next) {
  const currency = String(req.body.currency || 'USD').toUpperCase();
  const email = String(req.body.email || '').trim().toLowerCase();
  const spendingLimit = req.body.spendingLimit ? Number(req.body.spendingLimit) : null;
  if (!email) return res.status(400).json({ error: 'Provide the email of the person to add' });
  if (spendingLimit !== null && !(spendingLimit > 0)) {
    return res.status(400).json({ error: 'Spending limit must be a positive number, or left blank' });
  }
  try {
    const walletId = await myOwnedWallet(req.user.userId, currency);
    if (!walletId) return res.status(404).json({ error: `You do not have a ${currency} wallet` });
    const owner = await pool.query('SELECT role FROM wallet_members WHERE walletid = $1 AND userid = $2', [walletId, req.user.userId]);
    if (owner.rows[0]?.role !== 'owner') return res.status(403).json({ error: 'Only the wallet owner can add members' });

    const userResult = await pool.query('SELECT userid, name FROM users WHERE email = $1', [email]);
    if (!userResult.rowCount) return res.status(404).json({ error: 'No digiwallsys account with that email' });
    const member = userResult.rows[0];
    if (member.userid === req.user.userId) return res.status(400).json({ error: 'You already own this wallet' });

    const result = await pool.query(
      `INSERT INTO wallet_members(walletid, userid, role, spending_limit, added_by)
       VALUES ($1, $2, 'member', $3, $4)
       ON CONFLICT (walletid, userid) DO UPDATE SET spending_limit = EXCLUDED.spending_limit
       RETURNING userid, role, spending_limit, created_at`,
      [walletId, member.userid, spendingLimit, req.user.userId]
    );
    await writeAudit(pool, {
      actorUserId: req.user.userId,
      action: 'wallet.member_added',
      resourceType: 'wallet',
      resourceId: String(walletId),
      metadata: { memberUserId: member.userid, spendingLimit },
      ipAddress: req.ip,
    });
    return res.status(201).json({ ...result.rows[0], name: member.name, email });
  } catch (error) {
    return next(error);
  }
}

async function updateMember(req, res, next) {
  const currency = String(req.body.currency || 'USD').toUpperCase();
  const spendingLimit = req.body.spendingLimit === null || req.body.spendingLimit === ''
    ? null
    : Number(req.body.spendingLimit);
  if (spendingLimit !== null && !(spendingLimit > 0)) {
    return res.status(400).json({ error: 'Spending limit must be a positive number, or left blank' });
  }
  try {
    const walletId = await myOwnedWallet(req.user.userId, currency);
    if (!walletId) return res.status(404).json({ error: `You do not have a ${currency} wallet` });
    const result = await pool.query(
      `UPDATE wallet_members SET spending_limit = $1
       WHERE walletid = $2 AND userid = $3 AND role = 'member'
       RETURNING userid, role, spending_limit`,
      [spendingLimit, walletId, req.params.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Member not found on this wallet' });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function removeMember(req, res, next) {
  const currency = String(req.query.currency || 'USD').toUpperCase();
  try {
    const walletId = await myOwnedWallet(req.user.userId, currency);
    if (!walletId) return res.status(404).json({ error: `You do not have a ${currency} wallet` });
    const result = await pool.query(
      `DELETE FROM wallet_members WHERE walletid = $1 AND userid = $2 AND role = 'member' RETURNING userid`,
      [walletId, req.params.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Member not found on this wallet' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

// Wallets owned by someone else that I've been added to as a member — the
// "spend from" choices available when sending money.
async function listSharedWallets(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT w.walletid, w.currency, w.balance, wm.spending_limit, u.name AS owner_name, u.userid AS owner_userid
       FROM wallet_members wm
       JOIN wallet w ON w.walletid = wm.walletid
       JOIN users u ON u.userid = w.userid
       WHERE wm.userid = $1 AND wm.role = 'member'
       ORDER BY u.name, w.currency`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

module.exports = { listMembers, addMember, updateMember, removeMember, listSharedWallets };

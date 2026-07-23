const pool = require('../db');
const parseAmount = require('../utils/amount');
const { writeAudit } = require('../services/auditService');

async function createGoal(req, res, next) {
  const name = String(req.body.name || '').trim().slice(0, 80);
  const targetAmount = parseAmount(req.body.targetAmount);
  const roundUpEnabled = Boolean(req.body.roundUpEnabled);
  if (!name || targetAmount === null) {
    return res.status(400).json({ error: 'Provide a goal name and a positive target amount' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO savings_goals(userid, name, target_amount, round_up_enabled)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.userId, name, targetAmount, roundUpEnabled]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Only one savings goal can collect round-ups at a time' });
    }
    return next(error);
  }
}

async function listGoals(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT * FROM savings_goals WHERE userid = $1 AND status != 'archived'
       ORDER BY created_at DESC`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

function adjustGoal(direction) {
  return async function handler(req, res, next) {
    const amount = parseAmount(req.body.amount);
    if (amount === null) return res.status(400).json({ error: 'Amount must be positive with at most two decimals' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const goalResult = await client.query(
        'SELECT * FROM savings_goals WHERE goalid = $1 AND userid = $2 FOR UPDATE',
        [req.params.goalId, req.user.userId]
      );
      const goal = goalResult.rows[0];
      if (!goal || goal.status === 'archived') {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Savings goal not found' });
      }

      if (direction === 'contribute') {
        const walletResult = await client.query('SELECT balance FROM wallet WHERE userid = $1', [req.user.userId]);
        const otherGoals = await client.query(
          `SELECT COALESCE(SUM(current_amount), 0) AS total FROM savings_goals
           WHERE userid = $1 AND status = 'active' AND goalid != $2`,
          [req.user.userId, goal.goalid]
        );
        const available = Number(walletResult.rows[0]?.balance || 0) - Number(otherGoals.rows[0].total);
        if (amount > available + Number(goal.current_amount)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Amount exceeds your available (non-earmarked) balance' });
        }
      } else if (amount > Number(goal.current_amount)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Amount exceeds this goal\'s saved balance' });
      }

      const delta = direction === 'contribute' ? amount : -amount;
      const updated = await client.query(
        `UPDATE savings_goals SET
           current_amount = current_amount + $1,
           status = CASE WHEN current_amount + $1 >= target_amount THEN 'completed' ELSE 'active' END,
           updated_at = CURRENT_TIMESTAMP
         WHERE goalid = $2
         RETURNING *`,
        [delta, goal.goalid]
      );
      await writeAudit(client, {
        actorUserId: req.user.userId,
        action: direction === 'contribute' ? 'savings_goal.contributed' : 'savings_goal.withdrawn',
        resourceType: 'savings_goal',
        resourceId: goal.goalid,
        metadata: { amount },
        ipAddress: req.ip,
      });
      await client.query('COMMIT');
      return res.json(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      return next(error);
    } finally {
      client.release();
    }
  };
}

async function archiveGoal(req, res, next) {
  try {
    const result = await pool.query(
      `UPDATE savings_goals SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE goalid = $1 AND userid = $2 RETURNING goalid, status`,
      [req.params.goalId, req.user.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Savings goal not found' });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createGoal,
  listGoals,
  contributeToGoal: adjustGoal('contribute'),
  withdrawFromGoal: adjustGoal('withdraw'),
  archiveGoal,
};

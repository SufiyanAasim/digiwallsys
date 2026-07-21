const pool = require('../db');
const { executeTransfer } = require('../services/transferService');
const { createNotification } = require('../services/notificationService');

function nextRun(date, frequency) {
  const next = new Date(date);
  if (frequency === 'daily') next.setUTCDate(next.getUTCDate() + 1);
  if (frequency === 'weekly') next.setUTCDate(next.getUTCDate() + 7);
  if (frequency === 'monthly') {
    const desiredDay = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(desiredDay, lastDay));
  }
  return next;
}

async function processSchedules() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const due = await client.query(
      `SELECT * FROM scheduled_transfers
       WHERE status = 'active' AND next_run_at <= CURRENT_TIMESTAMP
       ORDER BY next_run_at FOR UPDATE SKIP LOCKED LIMIT 20`
    );
    for (const schedule of due.rows) {
      const key = `schedule:${schedule.scheduleid}:${new Date(schedule.next_run_at).toISOString()}`;
      await client.query('SAVEPOINT process_schedule');
      try {
        const transfer = await executeTransfer(client, {
          senderId: schedule.sender_userid,
          receiverId: schedule.receiver_userid,
          amount: schedule.amount,
          description: schedule.description || 'Scheduled transfer',
          idempotencyKey: key,
          source: 'schedule',
        });
        if (transfer.blocked) {
          const message = `Risk controls: ${transfer.fraud.reasons.join(', ')}`;
          await client.query(
            `UPDATE scheduled_transfers SET status = 'failed', last_error = $2 WHERE scheduleid = $1`,
            [schedule.scheduleid, message.slice(0, 255)]
          );
          await createNotification(client, {
            userId: schedule.sender_userid,
            category: 'alert',
            title: 'Scheduled transfer failed',
            body: message,
            data: { scheduleId: schedule.scheduleid },
          });
          await client.query('RELEASE SAVEPOINT process_schedule');
          continue;
        }
        const completed = schedule.frequency === 'once';
        await client.query(
          `UPDATE scheduled_transfers
           SET status = $2, last_run_at = CURRENT_TIMESTAMP, last_error = NULL, next_run_at = $3
           WHERE scheduleid = $1`,
          [
            schedule.scheduleid,
            completed ? 'completed' : 'active',
            completed ? schedule.next_run_at : nextRun(schedule.next_run_at, schedule.frequency),
          ]
        );
        await client.query('RELEASE SAVEPOINT process_schedule');
      } catch (error) {
        await client.query('ROLLBACK TO SAVEPOINT process_schedule');
        await client.query(
          `UPDATE scheduled_transfers SET status = 'failed', last_error = $2 WHERE scheduleid = $1`,
          [schedule.scheduleid, error.message.slice(0, 255)]
        );
        await createNotification(client, {
          userId: schedule.sender_userid,
          category: 'alert',
          title: 'Scheduled transfer failed',
          body: error.message.slice(0, 500),
          data: { scheduleId: schedule.scheduleid },
        });
        await client.query('RELEASE SAVEPOINT process_schedule');
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Schedule worker failed:', error.message);
  } finally {
    client.release();
  }
}

function startScheduleWorker() {
  if (process.env.ENABLE_SCHEDULER === 'false') return () => {};
  const timer = setInterval(processSchedules, 60_000);
  timer.unref();
  processSchedules();
  return () => clearInterval(timer);
}

module.exports = { nextRun, processSchedules, startScheduleWorker };

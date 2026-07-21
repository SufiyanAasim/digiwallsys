const test = require('node:test');
const assert = require('node:assert/strict');

const { nextRun } = require('../../src/backend/workers/scheduleWorker');

test('monthly schedules clamp to the final day of shorter months', () => {
  assert.equal(nextRun('2026-01-31T10:00:00Z', 'monthly').toISOString(), '2026-02-28T10:00:00.000Z');
  assert.equal(nextRun('2028-01-31T10:00:00Z', 'monthly').toISOString(), '2028-02-29T10:00:00.000Z');
});

test('daily and weekly schedules retain their UTC time', () => {
  assert.equal(nextRun('2026-07-19T10:30:00Z', 'daily').toISOString(), '2026-07-20T10:30:00.000Z');
  assert.equal(nextRun('2026-07-19T10:30:00Z', 'weekly').toISOString(), '2026-07-26T10:30:00.000Z');
});

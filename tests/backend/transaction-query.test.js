const test = require('node:test');
const assert = require('node:assert/strict');

const { validateHistoryQuery } = require('../../src/backend/controllers/transactionController');

test('transaction history accepts supported filters', () => {
  assert.equal(validateHistoryQuery({ direction: 'credit', min: '1.25', max: '20', from: '2026-01-01', to: '2026-02-01' }), null);
});

test('transaction history rejects malformed dates and ranges', () => {
  assert.equal(validateHistoryQuery({ from: 'not-a-date' }), 'from must be a valid date');
  assert.equal(validateHistoryQuery({ from: '2026-02-01', to: '2026-01-01' }), 'from must be earlier than to');
});

test('transaction history rejects invalid directions and amounts', () => {
  assert.equal(validateHistoryQuery({ direction: 'sideways' }), 'Direction must be debit or credit');
  assert.equal(validateHistoryQuery({ min: '-1' }), 'min must be a non-negative amount with at most two decimals');
  assert.equal(validateHistoryQuery({ min: '3', max: '2' }), 'min must not exceed max');
});

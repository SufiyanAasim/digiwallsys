const { test } = require('node:test');
const assert = require('node:assert/strict');
const parseAmount = require('../../src/backend/utils/amount');

test('accepts positive amounts with no more than two decimals', () => {
  assert.equal(parseAmount('0.29'), 0.29);
  assert.equal(parseAmount(10), 10);
  assert.equal(parseAmount('125.50'), 125.5);
});

test('rejects invalid monetary values', () => {
  for (const value of [0, -1, '1.001', '1e3', 'abc', '', null]) {
    assert.equal(parseAmount(value), null);
  }
});

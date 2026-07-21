const { test } = require('node:test');
const assert = require('node:assert/strict');
const { postJournal } = require('../../src/backend/services/ledgerService');

test('ledger service rejects an unbalanced journal before querying PostgreSQL', async () => {
  const client = { query: () => assert.fail('database should not be called') };
  await assert.rejects(
    postJournal(client, {
      journalType: 'transfer',
      entries: [
        { accountId: 'one', entryType: 'debit', amount: 10 },
        { accountId: 'two', entryType: 'credit', amount: 9 },
      ],
    }),
    /must balance/
  );
});

test('ledger service inserts one journal and balanced entries', async () => {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.includes('INSERT INTO ledger_journals')) {
        return { rows: [{ journalid: 'journal', reference: 'reference', created_at: new Date() }] };
      }
      return { rows: [] };
    },
  };
  const journal = await postJournal(client, {
    journalType: 'transfer',
    description: 'test',
    entries: [
      { accountId: 'one', entryType: 'debit', amount: 10 },
      { accountId: 'two', entryType: 'credit', amount: 10 },
    ],
  });
  assert.equal(journal.journalid, 'journal');
  assert.equal(calls.length, 3);
});

async function ensureWalletAccount(client, wallet) {
  const result = await client.query(
    `INSERT INTO ledger_accounts(code, walletid, account_type, currency)
     VALUES ($1, $2, 'wallet_liability', $3)
     ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
     RETURNING accountid`,
    [`wallet:${wallet.walletid}`, wallet.walletid, wallet.currency || 'USD']
  );
  return result.rows[0].accountid;
}

async function getClearingAccount(client, currency = 'USD') {
  const code = `provider-clearing:${currency}`;
  const result = await client.query(
    `INSERT INTO ledger_accounts(code, account_type, currency)
     VALUES ($1, 'provider_clearing', $2)
     ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
     RETURNING accountid`,
    [code, currency]
  );
  return result.rows[0].accountid;
}

async function postJournal(client, {
  journalType,
  description,
  createdBy = null,
  metadata = {},
  entries,
}) {
  const debit = entries
    .filter((entry) => entry.entryType === 'debit')
    .reduce((sum, entry) => sum + Number(entry.amount), 0);
  const credit = entries
    .filter((entry) => entry.entryType === 'credit')
    .reduce((sum, entry) => sum + Number(entry.amount), 0);
  if (debit <= 0 || Math.round(debit * 100) !== Math.round(credit * 100)) {
    throw new Error('Ledger journal must balance');
  }

  const journal = await client.query(
    `INSERT INTO ledger_journals(journal_type, description, metadata, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING journalid, reference, created_at`,
    [journalType, description || '', metadata, createdBy]
  );

  for (const entry of entries) {
    await client.query(
      `INSERT INTO ledger_entries(journalid, accountid, entry_type, amount)
       VALUES ($1, $2, $3, $4)`,
      [journal.rows[0].journalid, entry.accountId, entry.entryType, entry.amount]
    );
  }
  return journal.rows[0];
}

async function reconcileWallets(client) {
  const result = await client.query(`
    SELECT w.walletid, w.userid, w.currency,
           w.balance::text AS cached_balance,
           COALESCE(SUM(CASE le.entry_type WHEN 'credit' THEN le.amount ELSE -le.amount END), 0)::text
             AS ledger_balance
    FROM wallet w
    LEFT JOIN ledger_accounts la ON la.walletid = w.walletid
    LEFT JOIN ledger_entries le ON le.accountid = la.accountid
    GROUP BY w.walletid
    HAVING w.balance <> COALESCE(SUM(CASE le.entry_type WHEN 'credit' THEN le.amount ELSE -le.amount END), 0)
    ORDER BY w.walletid
  `);
  return result.rows;
}

module.exports = { ensureWalletAccount, getClearingAccount, postJournal, reconcileWallets };

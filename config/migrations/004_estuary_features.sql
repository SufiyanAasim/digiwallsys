-- v1.8.0 "Estuary": multi-currency wallets and shared/family wallets.
--
-- Multi-currency is additive: a user may now hold more than one wallet, one per
-- currency, instead of exactly one. Conversion between a user's own wallets is
-- posted as two independently-balanced same-currency journals against a system
-- FX suspense account, rather than a single cross-currency journal — the existing
-- ledger balance check in postJournal() compares raw amounts and is intentionally
-- left untouched, since a cross-currency journal cannot balance in raw units.
--
-- Shared wallets are additive via wallet_members: a member (not just the owner)
-- may be authorized to send from a wallet, optionally capped by a monthly
-- spending_limit. Every existing wallet is backfilled with its owner as the sole
-- member so existing behavior is unchanged until someone is explicitly added.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_userid_key'
  ) THEN
    ALTER TABLE wallet DROP CONSTRAINT wallet_userid_key;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ledger_accounts_account_type_check'
  ) THEN
    ALTER TABLE ledger_accounts DROP CONSTRAINT ledger_accounts_account_type_check;
  END IF;
  ALTER TABLE ledger_accounts ADD CONSTRAINT ledger_accounts_account_type_check
    CHECK (account_type IN ('wallet_liability', 'provider_clearing', 'fx_suspense'));
END $$;

ALTER TABLE wallet ADD CONSTRAINT wallet_userid_currency_key UNIQUE (userid, currency);

CREATE TABLE IF NOT EXISTS wallet_members (
  walletid INTEGER NOT NULL REFERENCES wallet(walletid) ON DELETE CASCADE,
  userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  spending_limit NUMERIC(14, 2) CHECK (spending_limit IS NULL OR spending_limit > 0),
  added_by INTEGER REFERENCES users(userid) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (walletid, userid)
);

INSERT INTO wallet_members (walletid, userid, role)
SELECT walletid, userid, 'owner' FROM wallet
ON CONFLICT (walletid, userid) DO NOTHING;

-- Append-only rate history: the current rate for a pair is always the most
-- recent row, never mutated in place, so past conversions stay auditable
-- against the rate that was actually in effect.
CREATE TABLE IF NOT EXISTS fx_rates (
  rateid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency CHAR(3) NOT NULL,
  quote_currency CHAR(3) NOT NULL,
  rate NUMERIC(18, 8) NOT NULL CHECK (rate > 0),
  set_by INTEGER REFERENCES users(userid) ON DELETE SET NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (base_currency <> quote_currency)
);

CREATE INDEX IF NOT EXISTS fx_rates_pair_idx ON fx_rates(base_currency, quote_currency, effective_at DESC);

CREATE TABLE IF NOT EXISTS currency_conversions (
  conversionid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  from_currency CHAR(3) NOT NULL,
  to_currency CHAR(3) NOT NULL,
  from_amount NUMERIC(14, 2) NOT NULL CHECK (from_amount > 0),
  to_amount NUMERIC(14, 2) NOT NULL CHECK (to_amount > 0),
  rate NUMERIC(18, 8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS currency_conversions_user_idx ON currency_conversions(userid, created_at DESC);

-- Tracks which member of a shared wallet actually initiated a transfer, so a
-- per-member monthly spending_limit can be enforced even though the transfer
-- itself is recorded against the shared wallet, not the member individually.
-- Backfilled to the sending wallet's existing owner so history is unaffected.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS spender_userid INTEGER REFERENCES users(userid) ON DELETE SET NULL;

UPDATE transactions t
SET spender_userid = w.userid
FROM wallet w
WHERE t.senderwalletid = w.walletid AND t.spender_userid IS NULL;

-- v1.7.5 "Estuary": savings goals, budget categories, transaction tagging,
-- and user-facing fraud alerts. Purely additive — no existing column, table,
-- or constraint is altered, and the core ledger/transfer tables are untouched.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category VARCHAR(40);

CREATE TABLE IF NOT EXISTS savings_goals (
  goalid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  round_up_enabled BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS savings_goals_user_idx ON savings_goals(userid, status);

-- Only one goal per user may collect automatic round-ups, so the round-up hook
-- in the transfer path never has to guess which goal to credit.
CREATE UNIQUE INDEX IF NOT EXISTS savings_goals_single_round_up_idx
  ON savings_goals(userid) WHERE round_up_enabled;

CREATE TABLE IF NOT EXISTS budget_categories (
  categoryid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  name VARCHAR(60) NOT NULL,
  monthly_limit NUMERIC(14, 2) NOT NULL CHECK (monthly_limit > 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (userid, name)
);

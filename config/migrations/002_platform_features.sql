CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

ALTER TABLE wallet ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS journalid UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_reference_idx ON transactions(reference);
CREATE UNIQUE INDEX IF NOT EXISTS transactions_sender_idempotency_idx
  ON transactions(senderwalletid, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  tokenid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  tokenhash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by UUID REFERENCES refresh_tokens(tokenid),
  user_agent VARCHAR(255),
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens(userid, created_at DESC);

CREATE TABLE IF NOT EXISTS action_tokens (
  tokenid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  purpose VARCHAR(30) NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  tokenhash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_outbox (
  emailid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid INTEGER REFERENCES users(userid) ON DELETE SET NULL,
  recipient VARCHAR(255) NOT NULL,
  template VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  auditid BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_userid INTEGER REFERENCES users(userid) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor_userid, created_at DESC);

CREATE TABLE IF NOT EXISTS idempotency_records (
  userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  scope VARCHAR(60) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  response_status INTEGER,
  response_body JSONB,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(userid, scope, idempotency_key)
);

CREATE TABLE IF NOT EXISTS ledger_accounts (
  accountid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  walletid INTEGER UNIQUE REFERENCES wallet(walletid) ON DELETE RESTRICT,
  account_type VARCHAR(30) NOT NULL CHECK (account_type IN ('wallet_liability', 'provider_clearing')),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ledger_accounts(code, account_type, currency)
VALUES ('provider-clearing:USD', 'provider_clearing', 'USD')
ON CONFLICT (code) DO NOTHING;

INSERT INTO ledger_accounts(code, walletid, account_type, currency)
SELECT 'wallet:' || walletid, walletid, 'wallet_liability', currency
FROM wallet
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS ledger_journals (
  journalid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  journal_type VARCHAR(30) NOT NULL CHECK (journal_type IN ('transfer', 'funding', 'adjustment')),
  description VARCHAR(255) NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by INTEGER REFERENCES users(userid) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  entryid BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  journalid UUID NOT NULL REFERENCES ledger_journals(journalid) ON DELETE RESTRICT,
  accountid UUID NOT NULL REFERENCES ledger_accounts(accountid) ON DELETE RESTRICT,
  entry_type VARCHAR(6) NOT NULL CHECK (entry_type IN ('debit', 'credit')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(journalid, accountid, entry_type)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_journalid_fkey'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_journalid_fkey
      FOREIGN KEY (journalid) REFERENCES ledger_journals(journalid) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION prevent_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger records are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ledger_entries_immutable ON ledger_entries;
CREATE TRIGGER ledger_entries_immutable
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

DROP TRIGGER IF EXISTS ledger_journals_immutable ON ledger_journals;
CREATE TRIGGER ledger_journals_immutable
BEFORE UPDATE OR DELETE ON ledger_journals
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE OR REPLACE FUNCTION assert_balanced_journal() RETURNS trigger AS $$
DECLARE
  debit_total NUMERIC(14, 2);
  credit_total NUMERIC(14, 2);
BEGIN
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE entry_type = 'debit'), 0),
    COALESCE(SUM(amount) FILTER (WHERE entry_type = 'credit'), 0)
  INTO debit_total, credit_total
  FROM ledger_entries
  WHERE journalid = NEW.journalid;

  IF debit_total <> credit_total OR debit_total = 0 THEN
    RAISE EXCEPTION 'journal % is not balanced', NEW.journalid;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ledger_entries_balanced ON ledger_entries;
CREATE CONSTRAINT TRIGGER ledger_entries_balanced
AFTER INSERT ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION assert_balanced_journal();

CREATE TABLE IF NOT EXISTS funding_intents (
  fundingid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE RESTRICT,
  walletid INTEGER NOT NULL REFERENCES wallet(walletid) ON DELETE RESTRICT,
  provider VARCHAR(40) NOT NULL,
  provider_reference VARCHAR(150) NOT NULL UNIQUE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  journalid UUID REFERENCES ledger_journals(journalid),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provider_events (
  provider VARCHAR(40) NOT NULL,
  provider_event_id VARCHAR(150) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS fraud_events (
  fraudeventid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid INTEGER REFERENCES users(userid) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'blocked')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by INTEGER REFERENCES users(userid) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS fraud_events_status_idx ON fraud_events(status, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_requests (
  requestid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE RESTRICT,
  payer_userid INTEGER REFERENCES users(userid) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  note VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'declined', 'cancelled', 'expired')),
  transactionid INTEGER REFERENCES transactions(transactionid),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS payment_requests_users_idx
  ON payment_requests(requester_userid, payer_userid, created_at DESC);

CREATE TABLE IF NOT EXISTS scheduled_transfers (
  scheduleid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE RESTRICT,
  receiver_userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  description VARCHAR(255) NOT NULL DEFAULT '',
  frequency VARCHAR(20) NOT NULL DEFAULT 'once'
    CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly')),
  next_run_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'failed')),
  last_run_at TIMESTAMPTZ,
  last_error VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (sender_userid <> receiver_userid)
);

CREATE INDEX IF NOT EXISTS scheduled_transfers_due_idx
  ON scheduled_transfers(status, next_run_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS notification_preferences (
  userid INTEGER PRIMARY KEY REFERENCES users(userid) ON DELETE CASCADE,
  money_movement BOOLEAN NOT NULL DEFAULT true,
  security_events BOOLEAN NOT NULL DEFAULT true,
  spending_alert_amount NUMERIC(14, 2),
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_devices (
  deviceid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  expo_push_token VARCHAR(255) NOT NULL UNIQUE,
  platform VARCHAR(20),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  notificationid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL,
  title VARCHAR(120) NOT NULL,
  body VARCHAR(500) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  push_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(userid, created_at DESC);

CREATE TABLE IF NOT EXISTS reconciliation_runs (
  runid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_by INTEGER REFERENCES users(userid) ON DELETE SET NULL,
  discrepancy_count INTEGER NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- v1.8.0 operational hardening: finalized ledger journals and leased outboxes.

ALTER TABLE ledger_journals ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

DROP TRIGGER IF EXISTS ledger_journals_immutable ON ledger_journals;

CREATE OR REPLACE FUNCTION protect_ledger_journal() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ledger records are immutable';
  END IF;
  IF OLD.posted_at IS NULL
     AND NEW.posted_at IS NOT NULL
     AND NEW.journalid = OLD.journalid
     AND NEW.reference = OLD.reference
     AND NEW.journal_type = OLD.journal_type
     AND NEW.description = OLD.description
     AND NEW.metadata = OLD.metadata
     AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by
     AND NEW.created_at = OLD.created_at THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'ledger records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_journals_immutable
BEFORE UPDATE OR DELETE ON ledger_journals
FOR EACH ROW EXECUTE FUNCTION protect_ledger_journal();

CREATE OR REPLACE FUNCTION reject_entry_for_posted_journal() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM ledger_journals
    WHERE journalid = NEW.journalid AND posted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'cannot append to a posted ledger journal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ledger_entries_posted_guard ON ledger_entries;
CREATE TRIGGER ledger_entries_posted_guard
BEFORE INSERT ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION reject_entry_for_posted_journal();

UPDATE ledger_journals SET posted_at = created_at WHERE posted_at IS NULL;

ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS last_error VARCHAR(500);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS push_processing_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS push_attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS push_failed_at TIMESTAMPTZ;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS spending_alert_currency CHAR(3) NOT NULL DEFAULT 'USD';

ALTER TABLE currency_conversions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);
CREATE UNIQUE INDEX IF NOT EXISTS currency_conversions_user_idempotency_idx
  ON currency_conversions(userid, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DROP INDEX IF EXISTS savings_goals_single_round_up_idx;
CREATE UNIQUE INDEX IF NOT EXISTS savings_goals_single_round_up_currency_idx
  ON savings_goals(userid, currency) WHERE round_up_enabled AND status = 'active';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'budget_categories_userid_name_key'
  ) THEN
    ALTER TABLE budget_categories DROP CONSTRAINT budget_categories_userid_name_key;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'budget_categories_user_currency_name_key'
  ) THEN
    ALTER TABLE budget_categories ADD CONSTRAINT budget_categories_user_currency_name_key
      UNIQUE (userid, currency, name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS email_outbox_delivery_idx
  ON email_outbox(created_at)
  WHERE sent_at IS NULL AND failed_at IS NULL;

CREATE INDEX IF NOT EXISTS notifications_push_delivery_idx
  ON notifications(created_at)
  WHERE push_sent_at IS NULL AND push_failed_at IS NULL;

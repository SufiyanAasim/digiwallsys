# Database

`config/database.sql` loads ordered migrations for identity, wallets, provider
funding, immutable double-entry journals, idempotency, fraud, audit,
notifications, requests, schedules, and reconciliation. Monetary values use
`NUMERIC(14,2)`; JavaScript values are validated before queries.

For an existing database, use versioned migrations instead of re-running the
bootstrap schema. Back up data and test every migration and rollback on a copy.

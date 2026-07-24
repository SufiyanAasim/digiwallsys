# Database

`config/database.sql` loads ordered migrations for identity, wallets, provider
funding, immutable double-entry journals, idempotency, fraud, audit,
notifications, requests, schedules, and reconciliation. Monetary values use
`NUMERIC(14,2)`; JavaScript values are validated before queries.

For an existing database, use versioned migrations instead of re-running the
bootstrap schema. Back up data and test every migration and rollback on a copy.

## Added in Convoy (v1.7.5) and Estuary (v1.8.0)

All additive — no existing column, table, or constraint was narrowed, and the
core `ledger_journals`/`ledger_entries` balance invariant is untouched.

| Table / column | Purpose |
| --- | --- |
| `savings_goals` | Per-user earmark against the existing wallet balance; not a separate money-movement path |
| `budget_categories` | Per-user monthly spending limit by category name |
| `transactions.category` | Nullable tag linking a transaction to a `budget_categories` row |
| `transactions.spender_userid` | The user who actually initiated the transfer — distinct from the sending wallet's owner when spending from a shared wallet |
| `wallet_members` | Authorizes a user other than the wallet owner to spend from it, with an optional monthly `spending_limit` |
| `fx_rates` | Append-only exchange-rate history; never updated in place, so a past conversion stays auditable against the rate in effect at the time |
| `currency_conversions` | User-facing log of self-service conversions between a user's own wallets |

`wallet` dropped its `UNIQUE(userid)` constraint in favor of
`UNIQUE(userid, currency)`, so a user may now hold one wallet per currency
instead of exactly one wallet total. Every pre-existing wallet was backfilled
into `wallet_members` with its owner as the sole member, so nothing changes
behaviorally until someone explicitly opens a second currency or adds a member.

See [Architecture.md](../architecture/Architecture.md) for how conversion and
shared-wallet spending compose with the existing ledger, and
[Authorization.md](Authorization.md) for the wallet-membership authorization
model this introduces.

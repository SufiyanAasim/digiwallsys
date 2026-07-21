# Roadmap

The release versions and names below are fixed. Features are distributed so
each release builds on the previous one without changing its exact tag or name.

## v1.0.0 — Anchor

**Status:** Pre-release  
**Context:** Stable base for incoming/outgoing payments.

- [x] Standardize the `digiwallsys` identity and repository structure.
- [x] Add authenticated balances, demo top-ups, transfers, and history.
- [x] Make transfers atomic with stable wallet row locking.
- [x] Add lint, smoke tests, Expo build checks, Docker, and database schema.
- [x] Add PostgreSQL integration tests with isolated fixtures and rollback.
- [x] Add concurrent-transfer tests for insufficient funds and race conditions.
- [ ] Replace the invalid hosted development database connection.

## v1.0.5 — Drift

**Context:** Initial adjustments and flow refinement.

- [x] Add refresh-token rotation and session revocation.
- [x] Add email verification.
- [x] Add password reset and account-recovery flows.
- [x] Refine authentication, validation, and error states from pre-release feedback.

## v1.1.0 — Current

**Context:** Setting the primary flow of funds in motion.

- [x] Replace generated demo funds with provider-verified top-ups.
- [x] Verify provider webhooks and reject replayed funding events.
- [x] Add deposit status, failure, and retry states.
- [x] Add reliable transaction references throughout the primary funds flow.

## v1.1.5 — Swell

**Context:** Scaling capacity for transaction volume.

- [x] Add idempotency keys to all money-moving operations.
- [x] Add API rate limiting and account lockout controls.
- [x] Add expanded concurrent-transfer testing.
- [ ] Add full load and soak testing.
- [ ] Add database pool, query latency, and transfer-failure monitoring.

## v1.2.0 — Passage

**Context:** Secure movement of funds across gateways.

- [x] Introduce a double-entry immutable ledger.
- [x] Record balanced debit and credit entries for every transfer.
- [x] Add gateway transaction mapping and funding states.
- [x] Add ledger invariants and migration tests.

## v1.2.5 — Gale

**Context:** Stress testing and high-speed optimization.

- [x] Add fraud rules, velocity limits, and suspicious-activity flags.
- [ ] Stress test wallet locks, ledger posting, and gateway callbacks.
- [x] Optimize transaction queries and cursor pagination.
- [x] Add abuse events and automated protective controls.

## v1.3.0 — Harbor

**Context:** Dashboard for holding and managing funds.

- [x] Add an administrator console with explicit role-based access.
- [x] Add fraud-review actions.
- [ ] Add approval-based account and transaction interventions.
- [x] Add immutable administrator audit logs.
- [x] Add operational balance, funding, schedule, fraud, and exception dashboards.

## v1.3.5 — Beacon

**Context:** Enhanced visibility, reporting, and alerts.

- [x] Add transaction search, filters, and export.
- [x] Add downloadable and shareable receipts.
- [x] Add push notifications for money movement and account events.
- [x] Add configurable spending alerts.

## v1.4.0 — Voyage

**Context:** Expanding to multi-currency or broader markets.

- [x] Add QR payments.
- [x] Add biometric login.
- [ ] Add biometric confirmation to each sensitive action.
- [x] Add currency-aware wallet and ledger foundations.
- [ ] Add exchange-rate execution.
- [ ] Add localization, regional formatting, and accessibility coverage.

## v1.4.5 — Trade

**Context:** Refining business-to-business transaction logic.

- [x] Add payment requests and approval workflows.
- [x] Add scheduled and recurring transfers.
- [x] Add payment notes, references, and status tracking.
- [ ] Add organization-level permissions and transaction limits.

## v1.5.0 — Meridian

**Context:** Global alignment and high-precision accuracy.

- [x] Add wallet-to-ledger reconciliation.
- [ ] Add provider-settlement reconciliation.
- [x] Add balance and exception reconciliation reports.
- [ ] Enforce currency-specific precision and rounding rules beyond USD.
- [x] Add automated discrepancy detection.
- [ ] Add approval-based discrepancy resolution workflows.

## v1.5.5 — Armada

**Context:** Full-scale ecosystem, ready for wide release.

- [ ] Complete security, privacy, accessibility, and operational audits.
- [ ] Complete backup/restore drills and disaster-recovery validation.
- [ ] Validate all provider, ledger, fraud, reporting, and admin workflows end to end.
- [ ] Complete production rollout, rollback, monitoring, and support runbooks.

No release may be marked complete until its tests, documentation, migration,
security, and operational acceptance criteria pass.

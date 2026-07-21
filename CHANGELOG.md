# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Professional repository structure, documentation, Docker environment, and
  automated checks.
- Short-lived JWT access tokens, rotating refresh sessions, email verification,
  password recovery, login lockouts, SecureStore, and biometric unlock.
- Immutable balanced double-entry ledger and wallet reconciliation.
- Provider funding intents, signed webhook verification, and replay protection.
- Idempotency reservations, fraud velocity controls, rate limiting, and audit logs.
- Payment requests, QR payments, scheduled transfers, receipts, search, and CSV export.
- In-app/push notifications, spending alerts, delivery workers, and preferences.
- Role-protected administrator dashboard, fraud review, and reconciliation APIs.
- PostgreSQL integration and concurrent-overdraft test suite for CI.

### Changed

- Standardized the project identity as `digiwallsys`.
- Consolidated application code under `src/backend` and `src/mobile`.

### Improved

- Made transfers atomic and validated monetary amounts.
- Made the mobile API URL environment-configurable.
- Added stable UUID references and ledger-backed receipts to money movement.

### Fixed

- Corrected transaction history to resolve the authenticated user's wallet.
- Cleared stored authentication data during logout.

### Security

- Removed caller-controlled sender IDs from protected operations.
- Added stable wallet row locking during transfers.
- Removed the demo balance-generation endpoint; funding now requires provider proof.

### Documentation

- Added architecture, API, deployment, development, release, and support docs.

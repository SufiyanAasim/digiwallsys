# Testing

`npm run verify` runs naming and documentation checks, Expo Doctor, backend
syntax checks, frontend lint, API/service tests, and mobile configuration
tests. Expo Doctor validates SDK-supported package versions and rejects
duplicate native modules. The Build workflow repeats this compatibility gate
after a clean `npm ci`.

When `TEST_DATABASE_URL` is set to a database ending in `_test`, the suite also
applies migrations and validates provider funding, idempotent transfers, ledger
balancing, reconciliation, search, and concurrent overdraft prevention. GitHub
Actions supplies PostgreSQL 16.

Device-level end-to-end tests for biometrics, camera QR scanning, push delivery,
and provider checkout remain required before a stable mobile release.

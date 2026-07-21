# Testing

`npm run verify` runs naming checks, syntax checks, frontend lint, API/service
tests, and mobile configuration tests. When `TEST_DATABASE_URL` is set to a
database ending in `_test`, the suite also applies migrations and validates
provider funding, idempotent transfers, ledger balancing, reconciliation, search,
and concurrent overdraft prevention. GitHub Actions supplies PostgreSQL 16.

Device-level end-to-end tests for biometrics, camera QR scanning, push delivery,
and provider checkout remain required before a stable mobile release.

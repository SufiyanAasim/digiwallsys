# Testing

`npm run verify` runs naming and documentation checks, Expo Doctor, backend
syntax checks, frontend lint, API/service tests, and mobile configuration
tests. Expo Doctor validates SDK-supported package versions and rejects
duplicate native modules. The Build workflow repeats this compatibility gate
after a clean `npm ci`.

Before preparing artifacts, also run:

```bash
npm run build:web
npm audit --omit=dev
docker compose config --quiet
docker build -t digiwallsys:verify .
```

When `TEST_DATABASE_URL` is set to a database ending in `_test`, the suite also
applies migrations and validates provider funding, idempotent transfers, ledger
balancing, reconciliation, search, and concurrent overdraft prevention. GitHub
Actions supplies PostgreSQL 16.

Device-level end-to-end tests for biometrics, camera QR scanning, push delivery,
and provider checkout remain required before a stable mobile release.

The iOS JavaScript/Hermes bundle can be validated without Apple credentials:

```bash
npm run build:ios:bundle
```

For a signed Android candidate, verify the package/version metadata, production
API URL, APK signature with Android `apksigner`, AAB signature with
`jarsigner`, AAB structure with Bundletool, and SHA-256 hashes. Source export
and Expo Go checks do not replace a signed iOS archive or physical-device
acceptance.

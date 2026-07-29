# Security policy

## Supported versions

Security fixes are applied to the latest stable release.

## Reporting a vulnerability

Do not open a public issue for vulnerabilities, credentials, personal data, or
financial information. Use GitHub's private vulnerability reporting feature in
the Security tab. If it is unavailable, contact the repository owner privately
and request a secure reporting channel.

Include affected versions, impact, reproduction steps, and a minimal proof of
concept. Do not access data that does not belong to you.

## Dependency vulnerabilities

`npm audit --omit=dev` inside `src/backend` — the code that actually runs in
production — reports **zero** vulnerabilities. Verify this yourself with:

```bash
cd src/backend && npm audit --omit=dev
```

The mobile workspace uses Expo SDK 57 and does not bundle the build-service CLI
as an application dependency. `npm audit --omit=dev --audit-level=high` is a
blocking CI gate. At the time of this release candidate it reports no high or
critical findings; remaining moderate advisories are transitive native-project
generation tools and must be reviewed again before each release.

## Scope warning

`digiwallsys` is a demonstration and is not approved to process real money. A
production financial system also needs provider-backed funding, identity and
sanctions checks, fraud detection, rate limits, a double-entry ledger, audit
retention, reconciliation, key rotation, and independent security review.

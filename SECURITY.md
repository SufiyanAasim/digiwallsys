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

The full workspace audit (`npm audit` at the repo root) will still show
findings from **build-time tooling only** — Expo CLI, EAS CLI, ESLint, Babel,
Jest. None of it ships in the deployed API or the exported mobile/web bundle;
it only runs on a developer's machine or in CI while building. `package.json`'s
`overrides` field pins the handful of those where a same-major patch release
fixes the advisory outright (`flatted`, `tar`, and specific vulnerable
`minimatch`/`brace-expansion` instances). Two are deliberately left open:

- **`uuid`** (moderate) — the fix landed in `uuid@11`; the affected instances
  are internal to `xcode` and `@expo/rudder-sdk-node`, both pulled in
  transitively by `eas-cli`. Forcing that jump via an override cannot be
  verified here (no macOS/Xcode to run an actual iOS build against it), and a
  silent breakage would only surface during a real EAS build.
- **`postcss`** (high) — the fix requires Expo SDK 57; the project is pinned to
  SDK 53. Upgrading is a full React Native/Expo SDK migration, not a
  dependency bump, and is out of scope for a vulnerability pass.

Both require attacker control over local build inputs to matter (a crafted
CSS file, a crafted iOS project file) — neither is reachable by a request
against the deployed API or web app.

## Scope warning

`digiwallsys` is a demonstration and is not approved to process real money. A
production financial system also needs provider-backed funding, identity and
sanctions checks, fraud detection, rate limits, a double-entry ledger, audit
retention, reconciliation, key rotation, and independent security review.

# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Web layout: form screens now cap at a readable measure (`contentColumn()` in
  `theme.js`) instead of stretching inputs across a full monitor; dashboards cap
  wider. Mobile layout is untouched — the helper is a no-op off web.
- Home action tiles use a fixed width on web so a desktop grid stays dense.
- Sign-in and Account security screens render the `digiwallsys` wordmark asset.
- Logging out now opens a confirmation dialog in place instead of navigating to
  a dedicated screen; `LogoutScreen.js` was removed and its route deleted.
- `ConfirmProvider` exposes a promise-based `useConfirm()`, now used for every
  destructive action (remove member, archive goal, delete category, decline or
  cancel a request, cancel a schedule, pay a scanned QR request). These
  previously either had no confirmation at all, or relied on the web `Alert`
  polyfill's `window.confirm()`, which browsers suppress.
- The web build paints one ambient gradient at shell level covering the full
  content area; screen-level `AmbientBackground` is a no-op on web. Previously
  the login background stopped at the 1180px column (leaving flat edges on a
  wide monitor) and authed pages drew it twice, producing a brighter band.
- Mobile lint now covers `components/`, `navigation.js`, `session.js`,
  `theme.js`, `ThemeContext.js`, and `utils.js` (previously screens only).

### Fixed

- Sign-up accepted 6-character passwords the API rejects at 10; the client now
  enforces 10 on registration only, so pre-existing accounts can still sign in.
- Sidebar navigation no longer clips its last item on a ~1000px-tall window.
- `formatMoney` used an unused catch binding that failed the widened lint scope.
- A 404 from an endpoint the deployed API does not have yet now explains that
  the server needs the latest release, instead of surfacing "Route not found".
- Transaction category tagging was unusable on web: it passed an option list to
  `Alert`, which the web polyfill collapses to `window.confirm()`, so it always
  applied the first option ("No category") instead of the chosen category.
  `ConfirmDialog` now supports a single-select list via `useChoose()`.
- The auth-screen wordmark is framed by a `View` with `aspectRatio`, which
  react-native-web honours (the `Image` did not), removing the letterboxing.

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

## [1.8.0] — Estuary

### Added

- Multi-currency wallets: a user may now hold one wallet per currency instead of
  exactly one wallet total, and convert between their own wallets via a
  self-service `/api/wallet/convert` endpoint.
- Append-only `fx_rates` history and an admin endpoint/UI to set exchange rates.
- Shared/family wallets via `wallet_members`: an owner can add another user as
  an authorized spender on their wallet, with an optional monthly spending limit.
- New mobile/web screens: Wallets (multi-currency + conversion) and Family wallet
  (member management), plus a "spend from" picker on Send money.

### Changed

- `transferService.executeTransfer`'s wallet-resolution query now accepts an
  explicit currency and an optional delegated wallet owner; every existing
  caller (direct sends, payment-request acceptance, the schedule worker) keeps
  its exact prior behavior by omitting the new parameters.
- Currency conversion is posted as two independently-balanced same-currency
  journals against a system FX suspense account, rather than a single
  cross-currency journal, so the existing ledger balance check is left untouched.

## [1.7.5] — Convoy

### Added

- Savings goals with manual contribute/withdraw and optional round-up on direct
  transfers, earmarked against the existing single wallet balance.
- Budget categories with live spend-per-category tracking against a monthly limit.
- Payment calendar view over existing scheduled transfers.
- Transaction category tagging, selectable when sending money or after the fact.
- PDF statement export (`pdfkit`) alongside the existing CSV export.
- User-facing security alerts surfaced from the existing admin-only fraud engine.
- Real light/dark theme toggle (previously an unused `ThemeContext`), including a
  themed `Switch` so toggles no longer render with browser-default colors.
- Frosted-glass "d/i" monogram app icon and adaptive-icon assets.

## [1.7.0] — Compass

### Added

- Analytics screen with money in/out, balance, and net change for the current month.
- Spend breakdown between direct transfers and paid payment requests/QR payments.
- Monthly spending lock progress bar built on the existing spending-alert preference.
- `DonutChart` and `ChartLegend` components (`react-native-svg`, no new dependency).

## [1.6.5] — Marina

### Added

- Persistent glass sidebar for the web build with role-aware navigation.
- Stable navigation-container architecture so the sidebar can appear without
  remounting the app and losing the current route.
- Centered, max-width content column for wide viewports.

## [1.6.0] — Lantern

### Added

- "Ember Glass" design system: new color and glass tokens, `AmbientBackground`,
  `GradientButton`, `ActionTile`, and `ToastProvider` components.
- Post-login confirmation toast, reusable for future account events.
- `Logo` (overlapping "d"/"i" monogram) and `Wordmark` (gradient wordmark) components,
  replacing the wallet-icon artwork throughout the app.

### Fixed

- Added the `fonts` object React Navigation v7 requires on `navigationTheme`, fixing a
  crash in `HeaderTitle` that produced a white screen on every screen except Login/Home.
- Fixed low-contrast text (dark-on-dark titles and button labels) left over from the
  previous theme across every screen.

# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- On web, the marketing page and the sign-in form are now two states of the
  same screen rather than one long scroll. The form used to sit permanently
  below the hero, so it peeked into the bottom of the landing viewport and
  "Get started" merely scrolled down to it; now the landing stands alone and
  the form replaces it, carrying the same wordmark-and-tagline branding the
  "Create an account" state already used. A "Back to overview" link returns to
  the landing, since the swap is local state and browser Back would otherwise
  leave the route entirely. Native is unchanged — it has no landing and opens
  straight on the form.

### Fixed

- Visiting Credits without signing in rendered the full authenticated sidebar
  (Send money, Wallets, Log out) to a visitor with no session. Besides being
  wrong, its 248px column pushed the page off-centre and its scrollable nav
  added a second scrollbar next to the page's own. The sidebar is now hidden on
  Credits until a user is actually loaded, which centres the page and removes
  that scrollbar; reaching Credits from the sidebar while signed in is
  unchanged.
- Scrollbars on web used the browser default, which painted a stark light bar
  down the edge of the dark Ember Glass surfaces. `components/web/ScrollbarTheme.js`
  injects themed scrollbar CSS and rewrites it when the palette changes, so it
  follows the light/dark toggle.

- Clicking "Credits" from the public sign-in footer opened the Credits screen
  and immediately bounced back to Login. Credits needs no session — it's
  static app/version info — but wasn't exempt from the redirect-to-login
  guard added for URLs naming a protected screen, so an unauthenticated
  visitor's `getCurrentUser()` 401 triggered that guard same as any real
  protected route would. Credits is now exempt from the redirect (a new
  `NO_REDIRECT_ROUTES` list); it still fetches the user opportunistically, so
  an authenticated visitor arriving from the sidebar keeps that sidebar
  exactly as before.
- "Get started" now focuses the email field once the scroll settles (via the
  `scrollend` event, with a timeout backstop in case a browser or an
  interrupted scroll never raises it), and respects
  `prefers-reduced-motion` — an immediate jump and instant focus instead of
  the smooth scroll.

- The web ambient gradient behind every screen only covered one viewport's
  height (`position: absolute` sizes to its nearest positioned ancestor,
  which on web is a flex container matched to viewport height, not to the
  page's full scrollable height). Any page taller than one viewport —
  routine now that the sign-in page carries a hero and a fixed footer —
  scrolled the gradient out from behind the lower content, exposing the
  browser's plain white page background. Changed to `position: fixed` on
  web, which always covers exactly the viewport regardless of document
  height; native is unaffected, since its ScrollViews clip to their own
  bounds and never had this mismatch.
- The sign-in panel repeated the wordmark and tagline directly below
  LandingHero's own copy of both, so "Get started" scrolled past the hero's
  wordmark only to land on a second one instead of the form. It's now only
  rendered where the hero isn't shown: native, and the web "Create an
  account" state.
- `PublicWebFooter`'s text sat pinned to the bar's top edge with empty space
  below it. `alignItems` only centers items within their own wrapped line;
  with `flexWrap` set, the line itself packs to the cross-axis start unless
  `alignContent` says otherwise. Added `alignContent: 'center'`.
- Closing (or opening) any `ConfirmDialog` — most visibly the logout
  confirmation — flashed a second, blank, generically-labelled box for the
  remainder of the modal's fade animation: `visible` and the dialog's
  content both came from the same state value, so clearing it to close the
  dialog also blanked the title and fell back to generic "Cancel"/"Confirm"
  labels while the fade was still playing. The displayed content is now
  tracked separately from the visibility flag and only ever updated to a
  real value, so a closing (or opening) dialog always shows the dialog that
  was actually asked for.

### Added

- A marketing hero section above the sign-in form on web only: headline,
  product description, and four feature cards for capabilities that already
  ship (multi-currency wallets, shared wallets, budgets/savings, analytics).
  "Get started" scrolls to the existing auth panel below it; native is
  unchanged, since a full-screen pitch has no room on a phone before sign-in.
- `analytics/`: a standalone, read-only Python pipeline (pandas, scikit-learn,
  matplotlib) that reports monthly spend trends, a category breakdown, and a
  simple next-month forecast per user, run locally against a copy of the
  database. It is not imported by, or reachable from, the API or the app —
  see `analytics/README.md` for the read-only guarantees and how to run it.
- Motion on the sign-in/sign-up page: the hero and each feature card fade and
  slide in on load (staggered), feature cards lift slightly on hover, and
  three soft glows drift and pulse behind the hero copy, scoped to
  `LandingHero.js` only — the app-wide `AmbientBackground` behind every other
  screen is untouched.
- A fixed footer (Credits · version · tagline) on the sign-in/sign-up page,
  the one web screen with no sidebar to already show them. It stays pinned to
  the viewport bottom while the page above it scrolls (`PublicWebFooter.js`).
- Deployment-target env templates: `examples/render.env.example` (the full
  backend set, production-shaped, for Render's dashboard),
  `examples/supabase.env.example` (connection-string format and pooler-vs-
  direct guidance), and `examples/vercel.env.example` (the `EXPO_PUBLIC_*`
  subset Vercel needs). These are the three providers this project actually
  deploys to; see the README's "Deployment target env files" section.

### Fixed

- The "Create an account" / "Back to login" toggle, the "Verify email or
  reset password" link, and "Use biometric login" on the sign-in screen had
  no `accessibilityRole`, so they read as plain, unlabeled text to a screen
  reader or this repo's accessibility-tree tooling instead of as buttons.

### Security

- Pinned build-tooling transitive dependencies flagged by Dependabot to
  same-major patched versions via `package.json` `overrides`: `flatted`,
  `tar`, and the specific vulnerable `minimatch`/`brace-expansion` instances
  nested under ESLint and EAS CLI. None of these ship in the deployed API or
  the exported app; `npm audit --omit=dev` in `src/backend` was and remains 0
  vulnerabilities. `postcss` (needs Expo SDK 57) and `uuid` (needs a major
  bump inside EAS CLI's own `xcode`/telemetry dependencies, unverifiable here
  without macOS/Xcode) are intentionally left — see `SECURITY.md`.

### Fixed

- `config/database.sql` still stopped at migration `002`, so every fresh
  database — including the Docker stack, which initializes from it — came up
  without the Convoy and Estuary tables. It now includes `003` and `004`.
- The Docker stack inherited `NODE_ENV=production` from the image, which makes
  `emailService` withhold the verification token. With no mail provider wired up
  locally, no account could be verified and nobody could sign in; compose now
  sets `NODE_ENV=development` for the local stack.
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
- The web build showed no ambient gradient at all: React Navigation's `cardStyle`
  and every screen's own container each painted an opaque page colour over the
  shell's gradient layer, leaving a flat black page. Both are transparent on web
  now (`screenBackground()` in `theme.js`), and native is unchanged.
- The sign-in and Account security screens showed the wordmark as a coloured
  rectangle: the PNG has its gradient baked in as an opaque background with pale
  text on top, so no amount of framing could remove the box. Both screens now
  draw the existing `Wordmark` component, which applies the gradient to the
  glyphs themselves, stays sharp at any size, and follows the active theme. The
  unused `src/mobile/assets/wordmark.png` was deleted.

### Security

- The web client kept refresh tokens in `localStorage`, so opening the site
  silently restored the previous session — on a shared or public browser that
  handed over a funded wallet with no password. Tokens now default to
  `sessionStorage`, which is cleared when the browser closes; a reload during
  the same visit still resumes, so the silent access-token refresh is unaffected.
  Persisting across restarts is opt-in per sign-in via **Keep me signed in on
  this browser**, and logging out clears that choice. Native is unchanged and
  keeps SecureStore with optional biometric unlock.

### Added

- Real URLs on the web. `NavigationContainer` had no `linking` config, so the
  address bar sat on `/` on every screen: nothing could be bookmarked or shared,
  Back and Forward did nothing, and a refresh always returned to Home. Each
  screen now has a path (`/analytics`, `/wallets`, …), written out explicitly so
  renaming a screen cannot change a URL someone has saved. `vercel.json` adds
  the SPA fallback the export needs for a direct visit to resolve.
- An auth guard for those URLs: reaching a protected path without a session now
  redirects to sign-in instead of rendering a screen that can only show errors.

### Changed

- The browser tab now reads `digiwallsys · <screen>` instead of just the route
  name, which read as an unrelated page in a crowded tab bar.
- The favicon is the bare "di" monogram on transparency
  (`src/mobile/assets/favicon.png`, built by `scripts/generate-favicon.js`)
  rather than the launcher icon. At the ~16px a tab renders, the launcher
  icon's gradient badge swallowed the glyphs and showed as a plain coloured
  square. The launcher icon and splash are unchanged.
- `docker-compose.yml` now sets the pool size, proxy, rate-limit, risk-control
  and worker variables it previously left implicit, and `docker/README.md`
  documents that the schema only initializes on an empty volume.
- Web layout: form screens now cap at a readable measure (`contentColumn()` in
  `theme.js`) instead of stretching inputs across a full monitor; dashboards cap
  wider. Mobile layout is untouched — the helper is a no-op off web.
- Home action tiles use a fixed width on web so a desktop grid stays dense.
- Sign-in and Account security screens carry the `digiwallsys` wordmark.
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
- Brand assets under `assets/` are marketing-only; nothing there is bundled into
  the app, and the in-app wordmark is drawn by `components/Wordmark.js`.
- On web, `Alert.alert(title, message)` now renders through the in-app dialog
  via `components/alertBridge.js` rather than `window.alert()`, which browsers
  suppress in embedded contexts and which ignores the design system. Native
  keeps the OS alert.
- Mobile lint now covers `components/`, `navigation.js`, `session.js`,
  `theme.js`, `ThemeContext.js`, and `utils.js` (previously screens only).
- Standardized the project identity as `digiwallsys`.
- Consolidated application code under `src/backend` and `src/mobile`.

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

### Improved

- Made transfers atomic and validated monetary amounts.
- Made the mobile API URL environment-configurable.
- Added stable UUID references and ledger-backed receipts to money movement.
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

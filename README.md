<div align="center">

<img src="assets/logo.png" alt="digiwallsys logo" width="110" />

# digiwallsys

**A secure full-stack digital wallet with verified funding, immutable ledger accounting, QR payments, automation, alerts, and audited operations**

[![Node 20](https://img.shields.io/badge/Node.js-20%2B-0f766e?style=flat&logo=node.js&logoColor=white)](docs/guides/Developer%20Guide.md)
[![Version](https://img.shields.io/badge/version-v1.0.0-713b49?style=flat)](docs/releases/v1.0.0.md)
[![Release](https://img.shields.io/badge/name-Anchor-c6533c?style=flat)](docs/releases/v1.0.0.md)
[![Status](https://img.shields.io/badge/status-pre--release-f59e0b?style=flat)](docs/releases/v1.0.0.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-64748b?style=flat)]()
[![Build](https://img.shields.io/badge/build-passing-16a34a?style=flat)](.github/workflows/build.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-e9a23b?style=flat)](CONTRIBUTING.md)

Register securely, fund through a verified provider, send or request money,
scan QR payments, schedule transfers, receive alerts, and reconcile every wallet
against a balanced double-entry ledger.

[**Anchor release**](docs/releases/v1.0.0.md) · [**Changelog**](CHANGELOG.md) · [**Roadmap**](ROADMAP.md) · [**Report a bug**](.github/ISSUE_TEMPLATE/bug_report.yml)

</div>

---

## ✨ Features

### 🔐 Identity, sessions, and recovery

- **Short-lived JWT access tokens** with issuer and audience validation.
- **Rotating refresh tokens** stored as hashes, with replay detection and
  session-family revocation.
- **Email verification** and **password reset** using expiring, single-use tokens.
- **Login lockout controls** after repeated authentication failures.
- **Biometric login** through Expo Local Authentication and securely stored tokens.

### 📒 Immutable double-entry ledger

- Every transfer and funding credit posts a balanced debit/credit journal.
- PostgreSQL constraint triggers reject incomplete or unbalanced journals.
- Ledger journals and entries are immutable after insertion.
- Wallet balance is a cached projection checked by administrator reconciliation.
- Currency and provider-clearing accounts establish the multi-currency foundation.

### 🏦 Provider-verified funding

- Demo balance generation has been removed from the API and mobile app.
- Funding begins with an idempotent provider intent.
- Balance changes only after an HMAC-verified provider webhook succeeds.
- Provider event IDs are deduplicated to prevent webhook replay credits.
- Checkout and email providers are configurable adapters, not hard-coded vendors.

### 💸 Payments, requests, and automation

- Atomic peer-to-peer transfers with stable wallet row locking.
- Idempotency keys protect every money-moving or scheduled write.
- Payment requests can target a user or generate a shareable QR payload.
- QR scanning verifies and pays a pending request inside the app.
- One-time, daily, weekly, and monthly scheduled transfers run in a background worker.

### 🛡️ Fraud controls and audit trail

- Single-transfer, daily-amount, and hourly-velocity controls.
- Risk events record scores, reasons, status, and administrator reviews.
- API-wide and authentication-specific rate limits.
- Immutable operational audit events for login, funding, payments, schedules,
  fraud reviews, and reconciliation.
- Role-protected administrator routes verify the current database role.

### 📊 Search, receipts, exports, and reconciliation

- Transaction search by counterparty, description, reference, direction, date,
  and amount.
- Cursor-based history pagination and CSV export with spreadsheet-injection protection.
- Verifiable transaction receipts addressed by UUID reference.
- Administrator dashboard for users, transactions, balances, funding, schedules,
  fraud events, audit logs, and ledger discrepancies.

### 🔔 Notifications and spending alerts

- In-app notifications for transfers, funding, security, and schedule failures.
- Expo push-device registration and background push dispatch.
- Configurable money-movement, security, and push preferences.
- User-defined spending thresholds generate additional alerts.
- Email outbox supports a configurable delivery webhook and safe development mode.

### 🧪 Quality and operational safety

- Backend smoke and monetary-validation tests.
- Disposable PostgreSQL integration tests for funding, idempotency, ledger
  balancing, reconciliation, and concurrent overdraft prevention.
- Expo dependency compatibility checks and Android production bundle export.
- Separate lint, test, build, security, Docker, release, and deployment workflows.

---

## 🏗️ Architecture

```text
┌────────────────────────────────────────────────────────────────────┐
│                     Expo React Native mobile                       │
│ SecureStore · Biometrics · QR Camera · Push · CSV/Receipt sharing │
└───────────────────────────────┬────────────────────────────────────┘
                                │ HTTPS + JWT + Idempotency-Key
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                         Express REST API                           │
│ Auth · Funding · Transfers · Requests · Schedules · Admin · Audit │
└───────────────┬───────────────────────┬────────────────────────────┘
                │                       │
                ▼                       ▼
┌───────────────────────────┐  ┌─────────────────────────────────────┐
│ PostgreSQL financial core │  │ Configurable external adapters      │
│ Wallet cache              │  │ Funding checkout + signed webhook  │
│ Immutable ledger          │  │ Email delivery webhook             │
│ Fraud and audit events    │  │ Expo push service                  │
│ Requests and schedules    │  └─────────────────────────────────────┘
└───────────────────────────┘
```

Transfers and funding post their ledger journal and cached wallet changes in
the same PostgreSQL transaction. Full details are in
[docs/architecture/Architecture.md](docs/architecture/Architecture.md).

---

## 🛠️ Technology stack

| Layer | Technology |
| --- | --- |
| Mobile | Expo 53 · React Native 0.79.6 · React Navigation 7 |
| Device security | Expo SecureStore · Local Authentication |
| QR and notifications | Expo Camera · Expo Notifications · `react-native-qrcode-svg` |
| API | Node.js 20+ · Express 5 |
| Authentication | JWT · rotating opaque refresh tokens · bcryptjs |
| Database | PostgreSQL 16 · `pg` · versioned SQL migrations |
| Accounting | Immutable balanced double-entry journals |
| Background work | Schedule, email-outbox, and Expo push workers |
| Testing | Node test runner · disposable PostgreSQL CI service |
| Delivery | Docker Compose · GitHub Actions |

---

## 📦 App versions

| Version | Name | Status | Highlights |
| --- | --- | --- | --- |
| [v1.0.0](docs/releases/v1.0.0.md) | **Anchor** | Pre-release | Secure wallet foundation and PostgreSQL acceptance gates |
| [v1.0.5](docs/releases/v1.0.5.md) | **Drift** | Planned | Refresh sessions, verification, recovery, and biometric access |
| [v1.1.0](docs/releases/v1.1.0.md) | **Current** | Planned | Provider-verified funding and webhook reliability |
| [v1.1.5](docs/releases/v1.1.5.md) | **Swell** | Planned | Idempotency, rate limits, concurrency, and load visibility |
| [v1.2.0](docs/releases/v1.2.0.md) | **Passage** | Planned | Immutable double-entry ledger |
| [v1.2.5](docs/releases/v1.2.5.md) | **Gale** | Planned | Fraud controls and stress optimization |
| [v1.3.0](docs/releases/v1.3.0.md) | **Harbor** | Planned | Audited administrator operations |
| [v1.3.5](docs/releases/v1.3.5.md) | **Beacon** | Planned | Search, exports, receipts, notifications, and alerts |
| [v1.4.0](docs/releases/v1.4.0.md) | **Voyage** | Planned | QR, biometrics, and broader-market foundations |
| [v1.4.5](docs/releases/v1.4.5.md) | **Trade** | Planned | Payment requests and scheduled transfers |
| [v1.5.0](docs/releases/v1.5.0.md) | **Meridian** | Planned | Reconciliation and currency precision |
| [v1.5.5](docs/releases/v1.5.5.md) | **Armada** | Planned | Full ecosystem and wide-release readiness |

The exact tags and names never receive prefixes, suffixes, subtitles, or
prerelease identifiers. `v1.0.0` is marked as a GitHub pre-release while its tag
remains exactly `v1.0.0` and its GitHub release name remains exactly `Anchor`.

---

## 🚀 Getting started

### Requirements

- Node.js 20 or newer and npm 10 or newer.
- PostgreSQL 14 or newer, or Docker Desktop with Compose.
- Expo Go on a physical device, or an Android/iOS simulator.

### Clone and install

```bash
git clone https://github.com/SufiyanAasim/digiwallsys.git
cd digiwallsys
npm install
```

```bash
cp .env.example src/backend/.env
cp examples/mobile.env.example src/mobile/.env
```

PowerShell users can replace `cp` with `Copy-Item`.

### Start with Docker

```bash
docker compose up --build database api
```

In a second terminal:

```bash
npm run start:mobile
```

For a physical phone, set `EXPO_PUBLIC_API_URL` to the development computer's
LAN address. Apply migrations to an existing database with:

```bash
npm run migrate --workspace @digiwallsys/api
```

### Build installable mobile apps

Expo Application Services (EAS) creates signed native packages. Sign in once
with `npx eas-cli login`, then run:

```bash
# Install directly on Android devices
npm run build:android:apk

# Upload to Google Play
npm run build:android:aab

# Upload to TestFlight or the App Store
npm run build:ios:ipa
```

Android uses the application ID `com.sufiyanaasim.digiwallsys`; iOS uses the
matching bundle identifier. The APK profile is for internal installation, while
the production profiles create an Android App Bundle and an iOS archive. Apple
Developer membership and signing access are required for a device IPA.

---

## ⚙️ Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `5000` | API listening port |
| `DATABASE_URL` | Yes | None | PostgreSQL connection string |
| `DATABASE_SSL` | No | `false` | Enables hosted PostgreSQL TLS |
| `DATABASE_POOL_SIZE` | No | `10` | Maximum database pool connections |
| `JWT_SECRET` | Yes | None | Access-token signing secret |
| `ACCESS_TOKEN_MINUTES` | No | `15` | Short-lived access-token duration |
| `REFRESH_TOKEN_DAYS` | No | `30` | Rotating refresh-token duration |
| `CORS_ORIGIN` | No | All | Comma-separated permitted web origins |
| `TRUST_PROXY` | No | `0` | Express proxy-hop trust count |
| `GLOBAL_RATE_LIMIT` | No | `120` | Requests per IP per minute |
| `MAX_TRANSFER_AMOUNT` | No | `10000` | Single-transfer risk limit |
| `DAILY_TRANSFER_AMOUNT` | No | `25000` | Daily outgoing risk limit |
| `HOURLY_TRANSFER_COUNT` | No | `20` | Hourly outgoing velocity limit |
| `FUNDING_PROVIDER` | No | `sandbox` | Configured funding adapter name |
| `FUNDING_PROVIDER_CHECKOUT_URL` | Production | None | Checkout URL with `{reference}` placeholder |
| `FUNDING_WEBHOOK_SECRET` | Production | None | HMAC secret for provider events |
| `EMAIL_WEBHOOK_URL` | Production | None | Email-delivery adapter endpoint |
| `EMAIL_DELIVERY_TOKEN` | Production | None | Email adapter bearer token |
| `ENABLE_SCHEDULER` | No | `true` | Runs scheduled-transfer worker |
| `ENABLE_PUSH_WORKER` | No | `true` | Runs Expo push dispatcher |
| `ENABLE_EMAIL_WORKER` | No | `true` | Runs email-outbox dispatcher |
| `EXPO_PUBLIC_API_URL` | No | `http://localhost:5000` | Mobile API base URL |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Push | None | Expo project ID for push tokens |

Never place `JWT_SECRET`, database credentials, webhook secrets, or provider
tokens in Expo public variables.

---

## 🗂️ Project structure

```text
digiwallsys/
├── .github/                  # Templates and separate CI workflows
├── assets/                   # README logo and shared brand assets
├── config/
│   ├── database.sql          # Fresh PostgreSQL bootstrap entrypoint
│   └── migrations/           # Ordered versioned SQL migrations
├── docker/                   # Container guidance
├── docs/
│   ├── architecture/         # Financial and application architecture
│   ├── api/                  # Endpoint contracts
│   ├── deployment/           # Deployment and production gates
│   ├── development/          # Database, auth, testing, and security docs
│   ├── guides/               # User, developer, and admin guides
│   ├── releases/             # Exact version/name release documents
│   └── troubleshooting/      # Common runtime problems
├── scripts/                  # Repository consistency checks
├── src/
│   ├── backend/
│   │   ├── controllers/      # HTTP handlers
│   │   ├── middleware/       # Auth, roles, rate and idempotency controls
│   │   ├── routes/           # REST route modules
│   │   ├── services/         # Ledger, fraud, auth, audit, and notifications
│   │   ├── workers/          # Email, push, and scheduled transfers
│   │   └── scripts/          # Migration and syntax tooling
│   └── mobile/
│       ├── assets/           # Expo application imagery
│       ├── screens/          # Wallet, QR, admin, alert, and security screens
│       ├── api.js            # Authenticated API and refresh handling
│       └── session.js        # Secure token and biometric session storage
├── tests/
│   ├── backend/              # Smoke, validation, integration, concurrency
│   └── mobile/               # Expo identity and configuration checks
├── CHANGELOG.md
├── RELEASE.md
├── ROADMAP.md
└── README.md
```

---

## 🧪 Testing

Run all local checks:

```bash
npm run verify
npm run build
```

Run the PostgreSQL integration and concurrency suite against a disposable test
database whose name ends in `_test`:

```bash
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/digiwallsys_test npm test
```

The suite refuses destructive setup against a database without a test suffix.
GitHub Actions supplies PostgreSQL 16 automatically.

---

## 🛡️ Security

The mobile client is untrusted. Protected operations derive the acting user from
a verified access token; sender IDs never come from request bodies. Monetary
writes are parameterized, idempotent, risk-checked, transactionally balanced,
and audited. Provider events require an HMAC signature and unique event ID.

This remains a pre-release demonstration—not a licensed real-money service.
Production use additionally requires regulated payment providers, identity and
sanctions checks, formal threat modeling, key management, privacy review,
penetration testing, operational monitoring, and independent financial audits.
Report vulnerabilities privately using [SECURITY.md](SECURITY.md).

---

## 🤝 Contributor

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/SufiyanAasim">
        <img src="https://github.com/SufiyanAasim.png" width="72" alt="SufiyanAasim"/><br/>
        <sub><b>Mohammad Sufiyan Aasim</b></sub>
      </a><br/>
      <sub>System Architecture · Financial Core · Mobile · Build & Release</sub>
    </td>
  </tr>
</table>

See [CONTRIBUTING.md](CONTRIBUTING.md) to get involved.

---

## 📄 License

[MIT License](LICENSE) © 2026 Mohammad Sufiyan Aasim (@SufiyanAasim).

---

<div align="center">

⭐ **Star the repository if the project helps you build safer payment systems.**

[Report bug](.github/ISSUE_TEMPLATE/bug_report.yml) · [Request feature](.github/ISSUE_TEMPLATE/feature_request.yml) · [Changelog](CHANGELOG.md)

</div>

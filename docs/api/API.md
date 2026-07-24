# API

Base URL: `http://localhost:5000`. Requests and responses use JSON except the
transaction CSV export. Protected endpoints require
`Authorization: Bearer <access-token>`.

Money-moving POST requests also require a unique `Idempotency-Key` header.
Reusing the key with the same request returns the stored response; reusing it
with different content returns `409`.

## Service status

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | None | Process health and version |
| `GET` | `/api/ready` | None | PostgreSQL readiness; returns `503` when unavailable |

## Authentication

| Method | Endpoint | Authentication | Body |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | None | `name`, `email`, `password` |
| `POST` | `/api/auth/login` | None | `email`, `password` |
| `POST` | `/api/auth/refresh` | Refresh token | `refreshToken` |
| `POST` | `/api/auth/logout` | Bearer | `refreshToken` |
| `POST` | `/api/auth/verify-email` | None | `token` |
| `POST` | `/api/auth/resend-verification` | None | `email` |
| `POST` | `/api/auth/forgot-password` | None | `email` |
| `POST` | `/api/auth/reset-password` | None | `token`, `password` |

Login succeeds only after email verification and returns `accessToken`,
`refreshToken`, `expiresInSeconds`, and public user fields. Production responses
never expose verification/reset tokens; delivery occurs through the email outbox.

## User and wallet

| Method | Endpoint | Authentication | Response |
| --- | --- | --- | --- |
| `GET` | `/api/users/me` | Bearer | Current profile and role |
| `GET` | `/api/users` | Bearer | Verified payment recipients |
| `GET` | `/api/wallet/balance` | Bearer | Cached balance and currency (`?currency=` selects which wallet, default `USD`) |
| `GET` | `/api/wallet` | Bearer | Every currency wallet the user holds |
| `POST` | `/api/wallet/currencies` | Bearer | Open a zero-balance wallet in a new currency. Body: `currency` |
| `POST` | `/api/wallet/convert` | Bearer | Convert between the user's own wallets. Body: `fromCurrency`, `toCurrency`, `amount` |
| `GET` | `/api/wallet/conversions` | Bearer | Recent currency-conversion history |

The acting user never comes from a URL or request body.

Conversion uses the most recent rate in `fx_rates` for the pair (or its inverse);
`422` if no rate has been set. It is posted as two independently-balanced
same-currency journals against a system FX suspense account rather than a single
cross-currency journal, so it never weakens the ledger's existing balance check.

## Provider funding

### Create intent

- Endpoint: `/api/funding/intents`
- Method: `POST`
- Authentication: Bearer and `Idempotency-Key`
- Body: `{ "amount": 25.50, "provider": "sandbox" }`
- Response: funding intent, provider reference, and configured checkout URL.

Creating an intent does not change the balance.

### Provider webhook

- Endpoint: `/api/funding/webhooks/:provider`
- Method: `POST`
- Authentication: `X-Provider-Signature` containing the lowercase SHA-256 HMAC
  of the exact raw request body using `FUNDING_WEBHOOK_SECRET`.
- Body: `eventId`, `providerReference`, `status` (`succeeded` or `failed`).

A successful unique event posts a balanced clearing-to-wallet journal and cached
balance credit in one transaction. Replayed event IDs are acknowledged without
posting a second credit.

### Funding history

- Endpoint: `/api/funding/intents`
- Method: `GET`
- Authentication: Bearer

## Transactions

### Send

- Endpoint: `/api/transactions/send`
- Method: `POST`
- Authentication: Bearer and `Idempotency-Key`
- Body: `receiverId`, `amount`, optional `description`, `category` (budget
  category name), `currency` (default `USD`, must match a wallet you hold),
  `fromOwnerId` (spend from a wallet shared with you instead of your own —
  see [Family wallet](#family-wallet)).
- Errors: `400` validation or insufficient balance, `403` risk block or
  unauthorized/over-limit shared-wallet spend, `404` wallet missing,
  `409` idempotency conflict.

### History and search

- Endpoint: `/api/transactions/history`
- Method: `GET`
- Query: `q`, `direction`, `from`, `to`, `min`, `max`, `cursor`, `limit`.
- Response: `items` and `nextCursor`.

### Receipt, export, and tagging

| Method | Endpoint | Response |
| --- | --- | --- |
| `GET` | `/api/transactions/receipt/:reference` | Authorized transaction receipt |
| `GET` | `/api/transactions/export` | Up to 10,000 authorized rows as safe CSV |
| `GET` | `/api/transactions/statement` | Formatted PDF statement (same filters as history) with received/sent/net totals |
| `PATCH` | `/api/transactions/:reference/category` | Tag a transaction you sent with a budget category. Body: `category` (or `null` to clear) |

## Payment requests and QR

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/payment-requests` | Bearer | Incoming and outgoing requests |
| `GET` | `/api/payment-requests/:requestId` | Bearer | Authorized/open QR request |
| `POST` | `/api/payment-requests` | Bearer + idempotency | Create targeted or open request |
| `POST` | `/api/payment-requests/:requestId/accept` | Bearer + idempotency | Pay request |
| `POST` | `/api/payment-requests/:requestId/decline` | Bearer | Decline assigned request |
| `POST` | `/api/payment-requests/:requestId/cancel` | Bearer | Cancel owned request |

Open requests return `digiwallsys://request/<uuid>` for QR encoding. The QR never
contains credentials or a trusted amount; the authenticated API resolves the
current request before payment.

## Scheduled transfers

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/schedules` | Bearer | List owned schedules |
| `POST` | `/api/schedules` | Bearer + idempotency | Create schedule |
| `POST` | `/api/schedules/:scheduleId/cancel` | Bearer | Cancel active schedule |

Create body: `receiverId`, `amount`, `description`, ISO `nextRunAt`, and
`frequency` (`once`, `daily`, `weekly`, or `monthly`). Due transfers use the same
ledger, fraud, notification, and audit service as direct payments.

## Notifications

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/notifications` | In-app inbox |
| `POST` | `/api/notifications/:notificationId/read` | Mark read |
| `GET` | `/api/notifications/preferences/current` | Read preferences |
| `PUT` | `/api/notifications/preferences/current` | Update preferences/threshold |
| `POST` | `/api/notifications/devices` | Register Expo push token |

All notification endpoints require bearer authentication.

## Administrator operations

Administrator endpoints require bearer authentication and a current `admin`
role read directly from PostgreSQL.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/overview` | Operational metrics |
| `GET` | `/api/admin/audit-logs` | Recent audit trail |
| `GET` | `/api/admin/fraud-events` | Risk queue |
| `POST` | `/api/admin/fraud-events/:eventId/review` | Review/dismiss/block event |
| `POST` | `/api/admin/reconciliation` | Wallet-to-ledger reconciliation run |
| `GET` | `/api/admin/fx-rates` | Current rate for every configured currency pair |
| `POST` | `/api/admin/fx-rates` | Set a rate. Body: `baseCurrency`, `quoteCurrency`, `rate`. Appends to history; never overwrites |

## Savings goals

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/savings-goals` | Bearer | List active/completed goals |
| `POST` | `/api/savings-goals` | Bearer | Create a goal. Body: `name`, `targetAmount`, `roundUpEnabled` |
| `POST` | `/api/savings-goals/:goalId/contribute` | Bearer | Move `amount` from your wallet balance into the goal |
| `POST` | `/api/savings-goals/:goalId/withdraw` | Bearer | Move `amount` back out of the goal |
| `POST` | `/api/savings-goals/:goalId/archive` | Bearer | Archive a goal |

A goal is an earmark against the user's existing wallet balance, not a separate
account — contribute/withdraw never touch the ledger. At most one goal per user
may have `roundUpEnabled`; after a direct transfer, the rounded-up remainder is
credited to it automatically (best-effort — it can never fail the transfer).

## Budget categories

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/budget-categories` | Bearer | List categories with this month's spend |
| `POST` | `/api/budget-categories` | Bearer | Create. Body: `name`, `monthlyLimit` |
| `PUT` | `/api/budget-categories/:categoryId` | Bearer | Update `monthlyLimit` |
| `DELETE` | `/api/budget-categories/:categoryId` | Bearer | Remove a category |

Spend-per-category is computed live from `transactions.category` for the
current calendar month — see [tagging](#receipt-export-and-tagging) above.

## Security alerts

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/security/alerts` | Bearer | The authenticated user's own fraud-engine findings, in plain language |

Surfaces the same `fraud_events` rows the admin fraud queue sees, filtered to
the affected user and stripped of internal fields.

## Family wallet

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/family/members` | Bearer | Members of your own wallet (`?currency=`, default `USD`) |
| `POST` | `/api/family/members` | Bearer, owner only | Add a member. Body: `email`, `spendingLimit` (optional), `currency` |
| `PUT` | `/api/family/members/:userId` | Bearer, owner only | Update a member's `spendingLimit` |
| `DELETE` | `/api/family/members/:userId` | Bearer, owner only | Remove a member |
| `GET` | `/api/family/shared-wallets` | Bearer | Wallets owned by someone else that you can spend from |

A member spends from a shared wallet by passing `fromOwnerId` on
[`/api/transactions/send`](#send). Every existing wallet is backfilled with its
owner as the sole member, so nothing changes until someone is explicitly added.

## Common errors

| Status | Meaning |
| --- | --- |
| `400` | Invalid input or missing idempotency key |
| `401` | Missing, invalid, expired, or replayed session token |
| `403` | Email/role/risk policy denied the operation |
| `404` | Authorized resource not found |
| `409` | State or idempotency conflict |
| `423` | Account temporarily locked |
| `429` | Rate limit exceeded |
| `503` | Database readiness failed |

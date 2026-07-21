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
| `GET` | `/api/wallet/balance` | Bearer | Cached balance and currency |

The acting user never comes from a URL or request body.

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
- Body: `receiverId`, `amount`, optional `description`.
- Errors: `400` validation or insufficient balance, `403` risk block,
  `404` wallet missing, `409` idempotency conflict.

### History and search

- Endpoint: `/api/transactions/history`
- Method: `GET`
- Query: `q`, `direction`, `from`, `to`, `min`, `max`, `cursor`, `limit`.
- Response: `items` and `nextCursor`.

### Receipt and export

| Method | Endpoint | Response |
| --- | --- | --- |
| `GET` | `/api/transactions/receipt/:reference` | Authorized transaction receipt |
| `GET` | `/api/transactions/export` | Up to 10,000 authorized rows as safe CSV |

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

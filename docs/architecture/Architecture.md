# Architecture

`digiwallsys` separates an untrusted Expo client, an authorization/business API,
an immutable PostgreSQL financial core, and configurable external adapters.

## Components

```text
Mobile
  ├─ Secure session and biometric gate
  ├─ Wallet, funding, send, request, QR, schedule, history, and alerts
  └─ Administrator operations (role-visible only)
        │ HTTPS · JWT · Idempotency-Key
API
  ├─ Authentication and role middleware
  ├─ Funding webhook trust boundary
  ├─ Transfer, fraud, ledger, audit, and notification services
  └─ Schedule, email, and push workers
        │ Parameterized SQL · database transactions
PostgreSQL
  ├─ Users, rotating sessions, action tokens, and delivery outbox
  ├─ Wallet cache, immutable ledger accounts/journals/entries
  ├─ Funding, transactions, requests, schedules, and idempotency records
  └─ Fraud, notifications, audit logs, and reconciliation runs
```

## Money movement

A direct, requested, QR, or scheduled payment calls the same transfer service:

1. Assess amount and velocity risk.
2. Lock sender and receiver wallets in ascending user order.
3. Validate currency and cached balance.
4. Create one ledger journal with equal debit and credit entries.
5. Update both cached wallet balances.
6. Record the transaction UUID reference.
7. Create notifications, spending alerts, and an audit event.
8. Commit everything together or roll everything back.

Deferred PostgreSQL constraint triggers reject an unbalanced journal at commit.
Separate triggers reject updates or deletes to posted journals and entries.

## Funding trust boundary

Creating a funding intent does not add money. The provider receives a unique
reference. A webhook must have a valid HMAC signature and unique provider event
ID. Only then does the API lock the intent and wallet, post a provider-clearing
debit plus wallet credit, update the cached balance, and commit the event.

## Sessions

Passwords are hashed with bcryptjs. Email must be verified before login. Access
tokens are short-lived JWTs; opaque refresh tokens are hashed in PostgreSQL and
rotated at every use. Reuse of a revoked refresh token revokes the user's session
family. Password reset also revokes all sessions.

Mobile tokens live in Expo SecureStore. Biometric login authenticates locally
before using the saved refresh token to obtain a new session.

## Idempotency and concurrency

Protected writes reserve a `(user, scope, key)` record with a request hash. A
completed replay returns the original response; a changed payload or in-flight
duplicate returns `409`. Wallet locks prevent concurrent transfers from
overdrawing the same balance.

## Background workers

- Schedule worker claims due rows with `FOR UPDATE SKIP LOCKED` and uses the
  normal transfer service.
- Notification worker sends persisted events to active Expo push tokens.
- Email worker forwards outbox messages to a configured delivery webhook.

Payment commits never depend on push or email provider availability.

## Administrator boundary

Administrator routes verify the current role from PostgreSQL on every request.
The console can view metrics, audit/risk records, review fraud events, and start
wallet-to-ledger reconciliation. These actions create their own audit events.

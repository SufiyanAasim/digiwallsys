# Developer guide

Start with `README.md`, then review the architecture and API documents. Keep
mobile HTTP calls in `src/mobile/api.js`, authorization in backend middleware,
business logic in controllers, and database guarantees in schema migrations.

Run `npm run verify` before submitting changes and document public behavior.

Apply database migrations with
`npm run migrate --workspace @digiwallsys/api`. Money movement belongs in the
shared transfer and ledger services so direct, requested, QR, and scheduled
payments retain identical risk, idempotency, notification, and audit behavior.

Use a disposable database ending in `_test` for integration tests. The suite
refuses destructive setup against other database names.

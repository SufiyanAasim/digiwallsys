# Admin guide

## Bootstrap an administrator

Only a trusted database operator can promote the initial administrator:

```bash
npm run admin:promote --workspace @digiwallsys/api -- admin@example.com
```

The command records a bootstrap audit event. Later role-management workflows
should require multi-party approval.

## Operations console

The **Admin** screen is visible to users whose current database role is `admin`.
It shows user, transaction, wallet, funding, schedule, and fraud counts; recent
audit events; the risk queue; review actions; ledger reconciliation; and
exchange-rate management.

## Exchange rates

Users cannot convert between currencies until a rate exists for that pair.
From **Admin**, enter a base currency, quote currency, and rate (e.g. `USD` →
`EUR`, `0.92`) and set it. Rates are append-only — setting a new rate for a
pair adds a new row rather than editing the old one, so past conversions stay
auditable against the rate that was actually in effect when they happened.
Either direction of a pair works for conversion (the API inverts the rate if
only the reverse pair has been set).

## Reconciliation

Run reconciliation after migrations, provider incidents, or suspected balance
issues. A discrepancy means the cached wallet balance differs from net immutable
ledger entries. Investigate and use an approved correction journal; never edit
ledger entries or wallet balances directly.

## Provider sandbox

After creating a local funding intent, simulate the configured signed webhook:

```bash
npm run funding:sandbox --workspace @digiwallsys/api -- sandbox_REFERENCE succeeded
```

Use only development references and secrets.

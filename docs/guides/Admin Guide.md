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
audit events; the risk queue; review actions; and ledger reconciliation.

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

# Authorization

Wallet and transaction routes never accept an acting user ID for identity —
authorization is based on `req.user.userId`, set by the JWT middleware.
Recipient IDs are inputs, but the API verifies both wallets and prevents
self-transfers.

Administrator routes require an explicit `admin` role read directly from
PostgreSQL on every request; an authenticated user must never imply
administrator access.

## Shared-wallet delegation

`wallet_members` introduces one narrow, explicit exception to "a user only
acts on their own wallet": a wallet owner may authorize another user to spend
from it by adding a `wallet_members` row, optionally capped by a monthly
`spending_limit`.

- The delegated wallet is chosen by the caller (`fromOwnerId` on
  `/api/transactions/send`), never inferred.
- `transferService.executeTransfer` verifies a `wallet_members` row exists for
  `(walletid, actingUserId)` before resolving the wallet, and — if a
  `spending_limit` is set — sums that member's own transactions against the
  wallet this month before allowing the amount through. This runs before the
  balance/fraud checks that already apply to every transfer.
- Only the wallet's `owner`-role member can add, update, or remove members
  (`familyController.js`); a `member`-role user can spend (subject to their
  limit) but can never manage who else has access.
- Delegation only ever grants spending authority on one specific wallet. It
  never grants session access, admin privileges, or visibility into the
  owner's other wallets/currencies.
- Every pre-existing wallet was backfilled with its owner as the sole member,
  so this authorization path is inert for any user who has never added anyone.

See the shared-wallet sequence diagram in
[Architecture.md](../architecture/Architecture.md#money-movement).

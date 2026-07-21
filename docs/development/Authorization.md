# Authorization

Wallet and transaction routes never accept an acting user ID. Authorization is
based on `req.user.userId`, set by the JWT middleware. Recipient IDs are inputs,
but the API verifies both wallets and prevents self-transfers.

Future administrator features require explicit roles and deny-by-default route
guards; an authenticated user must never imply administrator access.

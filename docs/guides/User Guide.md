# User guide

## Account

1. Register with a unique email and password of at least 10 characters.
2. Verify the email using the delivered token/link before logging in. Signing in
   before verifying is rejected with "Verify your email before signing in".
3. Enable biometric login from **Security** on a supported enrolled device.
4. Use **Account security** to resend verification or reset a password.

## Logging out

Selecting **Log out** — from the web sidebar or the Home tile on mobile — opens a
confirmation dialog ("Are you sure you want to log out?"). **Cancel** dismisses
it and leaves you where you were; **Log out** revokes the refresh token, clears
the locally stored tokens, and returns you to the sign-in screen. Your local
session is cleared even if the API is unreachable at that moment.

## Confirmations

Anything destructive or irreversible asks first, using the same in-app dialog:
removing a family member, archiving a savings goal, deleting a budget category,
declining or cancelling a payment request, cancelling a scheduled transfer, and
paying a scanned QR request. Each dialog states what will happen; **Cancel**
always leaves things unchanged.

## Add funds

Open **Add funds**, enter an amount, and continue with the configured provider.
Creating an intent does not change the balance. The balance changes only after
the provider completes checkout and sends a verified webhook.

## Pay and request

- **Send** selects a verified recipient and posts an immediate payment.
- **Request & schedule** creates payment requests or future/recurring transfers.
- **QR pay** creates an open payment-request QR or scans and pays one.
- Every successful transaction receives a stable receipt reference.

## History and alerts

Search history by counterparty, note, or reference. Tap a row for its receipt,
export CSV or a formatted PDF statement for sharing, or long-press a payment
you sent to tag it with a budget category. Configure money, security, push,
and spending-threshold alerts in **Notifications**; **Security** also lists
any unusual-activity alerts the fraud engine has raised on your account.

## Analytics

**Analytics** shows this month's money in, money out, and balance as a donut
chart, plus a breakdown of spending between direct transfers and requests/QR
payments. If you've set a spending-alert amount in **Notifications**, it also
shows a monthly spending-lock progress bar.

## Savings goals

**Savings** lets you earmark part of your balance toward something specific —
create a goal with a target amount, then contribute or withdraw manually.
Enable **round-up** on one goal at a time to automatically save the rounded-up
remainder of every direct transfer you send (e.g. a $4.60 payment rounds up
$0.40 into the goal). This never moves real money into a separate account —
it earmarks part of your existing balance, validated so goals can't overcommit
funds you don't have.

## Budget categories

**Budgets** lets you create categories with a monthly limit (e.g. "Groceries:
$400") and see live spend-per-category, tagged when you send money or from
Transaction history afterward.

## Payment calendar

**Payment calendar** shows your active scheduled transfers on a month view
instead of a flat list, with a dot on any day something is due.

## Wallets and currency conversion

**Wallets** lets you hold more than one currency at once. Add a currency to
open a new zero-balance wallet in it, then convert between your own wallets —
conversion uses whatever exchange rate an administrator has most recently set
for that pair; if none is set, conversion is unavailable until one is.

## Family wallet

**Family wallet** lets you share your wallet with people you trust. As the
owner, add a member by their account email and optionally cap their monthly
spending from your wallet. As a member, wallets shared with you appear as a
"spend from" option when sending money, alongside your own.

## Appearance

Toggle dark/light theme from the web sidebar, or from **Security** /
the icon next to your avatar on mobile — the choice is saved and applies
everywhere in the app.

Never use real banking credentials or money with an unconfigured pre-release
deployment.

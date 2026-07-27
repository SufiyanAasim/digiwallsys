# Authentication

Login requires a verified email and returns a short-lived access JWT plus a
rotating opaque refresh token. Refresh tokens are hashed in PostgreSQL and
revoked on rotation, logout, password reset, or detected reuse. The mobile client
stores both tokens with Expo SecureStore and can require device biometrics before
using the saved refresh session.

Password length is enforced at **10+ characters** by the API on registration and
password reset (`authController.js`). The client mirrors that rule on sign-up
only — it deliberately does not length-check on sign-in, so accounts created
before the rule can still authenticate.

## Email verification

Verification and reset tokens are created by `authService.createActionToken`,
hashed at rest, single-use, and time-boxed (verification 24h, reset 30m). They
are queued into the `email_outbox` table; the email worker drains that table.

| Environment | Behaviour |
| --- | --- |
| `NODE_ENV` ≠ `production` | The token is also returned in the API response (`verificationToken` / `resetToken`) so flows can be exercised without a mail provider, and the worker logs a masked recipient. |
| `NODE_ENV` = `production`, `EMAIL_WEBHOOK_URL` set | The worker POSTs each queued message to that URL with `EMAIL_DELIVERY_TOKEN` as a bearer token, then marks it sent. |
| `NODE_ENV` = `production`, `EMAIL_WEBHOOK_URL` unset | **Nothing is delivered.** Rows stay unsent in `email_outbox` — configure a provider before relying on verification in production. |

To test end to end without a provider: register, copy the `verificationToken`
from the registration response, then submit it under **Account security →
Verify email**. `resend-verification` and `forgot-password` intentionally return
the same `202` whether or not the account exists, to avoid disclosing which
emails are registered.

Production still requires delivery-provider credentials, device/session
management UI, formal account-recovery review, and key-rotation procedures.

# Authentication

Login requires a verified email and returns a short-lived access JWT plus a
rotating opaque refresh token. Refresh tokens are hashed in PostgreSQL and
revoked on rotation, logout, password reset, or detected reuse. The mobile client
stores both tokens with Expo SecureStore and can require device biometrics before
using the saved refresh session.

Production still requires delivery-provider credentials, device/session
management UI, formal account-recovery review, and key-rotation procedures.

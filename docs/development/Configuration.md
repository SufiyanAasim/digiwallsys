# Configuration

All supported settings are listed in `.env.example` and the README. Backend
secrets belong in `src/backend/.env` for local work or a secret manager in
deployment. Expo public variables belong in `src/mobile/.env` and must never
contain secrets because they are bundled into the application.

One-time account setup uses `ADMIN_BOOTSTRAP_*` or `DEMO_USER_*` variables in a
trusted shell only. Password values stay blank in every committed template and
must be removed from the deployment environment after the matching seed command.

User and administrator profiles are not environment configuration. Display
names, email addresses, bcrypt password hashes, verification state, audit
events, and refresh sessions persist in the PostgreSQL database selected by
`DATABASE_URL` (Supabase in production). Self-service profile editing therefore
adds no new environment variable or deployment secret.

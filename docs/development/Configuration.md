# Configuration

All supported settings are listed in `.env.example` and the README. Backend
secrets belong in `src/backend/.env` for local work or a secret manager in
deployment. Expo public variables belong in `src/mobile/.env` and must never
contain secrets because they are bundled into the application.

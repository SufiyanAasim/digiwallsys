# Deployment

## API and database

1. Build the root `Dockerfile`.
2. Provision PostgreSQL and apply `config/database.sql` through a migration job.
3. Store `DATABASE_URL` and a random `JWT_SECRET` in a secret manager.
4. Enable `DATABASE_SSL` when the provider requires it.
5. Restrict `CORS_ORIGIN` and expose the API only over HTTPS.
6. Verify `/api/health` and test registration, login, and a rollback-safe transfer.

### Supported provider shape

No live provider deployment is currently claimed. One supported shape uses
Render for the API and dedicated worker, managed PostgreSQL for data, and
Vercel for the exported web build.
`examples/render.env.example`, `examples/supabase.env.example`, and
`examples/vercel.env.example` are ready-to-fill templates for each — none of
these three read a `.env` file from the repo, so every variable has to be set
in that provider's own dashboard. See the README's "Deployment target env
files" section for which file goes where.

Render auto-injects `PORT`; do not set it. Point the web service at the root
`Dockerfile` or `npm run start:api`. Create a separate background worker
service using `npm run start:worker`; do not run workers in every API instance.

## Mobile

Set `EXPO_PUBLIC_API_URL` to the deployed HTTPS API before creating the Expo
release build. Never embed database credentials or `JWT_SECRET` in the client.

### Web hosting

`npm run build:web` exports a single-page app to `src/mobile/dist-web`. Every
screen has its own URL (`/analytics`, `/wallets`, …) but there is only one
`index.html`, so the host must fall back to it for any path that is not a real
file. Without that fallback every URL except `/` returns 404 on a direct visit
or a page refresh.

`vercel.json` supplies the rewrite. It is committed **twice on purpose** — once
at the repository root and once in `src/mobile/` — because Vercel only reads the
`vercel.json` that sits in the project's configured **Root Directory**. If the
Vercel project points at `src/mobile`, a root-level file is ignored, which is
exactly how `/analytics` kept 404-ing while `/` worked. Keeping both copies makes
the fallback survive either setting; if you change one, change the other.

On any other host, configure the equivalent SPA fallback (Netlify `_redirects`,
nginx `try_files $uri /index.html`, S3/CloudFront error-document rewrite).

The EAS profiles live in `src/mobile/eas.json`:

| Command | Output | Use |
| --- | --- | --- |
| `npm run build:android:apk` | `.apk` | Direct Android installation and internal testing |
| `npm run build:android:aab` | `.aab` | Google Play submission |
| `npm run build:ios:ipa` | `.ipa` | TestFlight and App Store submission |

Run `npx eas-cli login` before the first cloud build. EAS can create and manage
the Android signing keystore. An Apple Developer account is required for the iOS
distribution certificate and provisioning profile. Use the package/bundle ID
`com.sufiyanaasim.digiwallsys` in both stores.

No checked-in or current APK is claimed. Generate native projects with Expo
prebuild only when local native debugging is needed; use the EAS preview
profile for an installable test APK and the production profiles for store
artifacts. Always set the final `EXPO_PUBLIC_API_URL` before building.

## Production gates

Do not deploy real-money functionality until the roadmap's ledger, provider,
compliance, fraud, observability, backup, and independent review work is done.

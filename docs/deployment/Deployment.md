# Deployment

## API and database

1. Build the root `Dockerfile`.
2. Provision PostgreSQL and apply `config/database.sql` through a migration job.
3. Store `DATABASE_URL` and a random `JWT_SECRET` in a secret manager.
4. Enable `DATABASE_SSL` when the provider requires it.
5. Set `PUBLIC_WEB_ORIGIN` to the canonical HTTPS web app, restrict any
   additional `CORS_ORIGIN` values, and expose the API only over HTTPS.
6. Verify `/api/health` and test registration, login, and a rollback-safe transfer.

### Supported provider shape

The current deployment uses Vercel for the exported web build, one Render Free
web service for the API plus inline scheduler/push workers, and Supabase
PostgreSQL for data. Render is configured with `RUN_INLINE_WORKERS=true`,
`ENABLE_SCHEDULER=true`, `ENABLE_PUSH_WORKER=true`, and
`ENABLE_EMAIL_WORKER=false`.
`examples/render.env.example`, `examples/supabase.env.example`, and
`examples/vercel.env.example` document the deployed shape — none of
these three read a `.env` file from the repo, so every variable has to be set
in that provider's own dashboard. See the README's "Deployment target env
files" section for which file goes where.

Render auto-injects `PORT`; do not set it. Point the web service at the root
`Dockerfile` or `npm run start:api`. The inline mode is appropriate only for
this single-instance demonstration deployment: Render Free can sleep after
inactivity, so scheduled transfers and push delivery are best-effort rather
than production-reliable. A scaled or real-money deployment must create a
separate background worker using `npm run start:worker` and set
`RUN_INLINE_WORKERS=false` on every API instance. Until a real email-delivery
adapter is connected, keep the worker on
`ENABLE_SCHEDULER=true`, `ENABLE_PUSH_WORKER=true`, and
`ENABLE_EMAIL_WORKER=false`, with `EMAIL_WEBHOOK_URL` and
`EMAIL_DELIVERY_TOKEN` unset. When email delivery is introduced, set both
adapter values before changing `ENABLE_EMAIL_WORKER` to `true`; production
startup deliberately rejects an enabled email worker with missing credentials.

### One-time administrator bootstrap

The bootstrap script has no built-in credentials and never prints a password.
Set `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, and optionally
`ADMIN_BOOTSTRAP_NAME` in a trusted one-time shell, run `npm run admin:seed`,
then remove those variables. Rotate any password that has ever appeared in
source history, deployment logs, or chat.

### One-time demo-user provisioning

Set the two `DEMO_USER_*_PASSWORD` values in a trusted Render Shell, confirm
the configured emails and opening balance, run `npm run demo:seed`, and remove
every `DEMO_*` variable. The command creates or refreshes two verified member
accounts and posts opening funds through balanced `funding` journals tagged
with the `demo-bootstrap` source; it
does not write plaintext passwords or directly invent wallet balances.
On a free Render service, Shell and one-off jobs are unavailable. Run the same
command from another trusted environment with temporary database access, or use
a controlled database-administration session that preserves the script's
idempotent user, wallet, ledger, notification, and audit semantics. Never store
demo passwords in a committed SQL file or provider variable after provisioning.

### GitHub Container Registry

Pushes to `main` and version tags publish the production image as
`ghcr.io/sufiyanaasim/digiwallsys`. Pull requests build the same Dockerfile
without publishing it. The workflow authenticates with the repository-scoped
`GITHUB_TOKEN`, so no registry password belongs in repository secrets.

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

The released artifacts are public version `1.9.0`, Android build `12`:

| Output | EAS build ID | Repository copy |
| --- | --- | --- |
| Installable APK | `5fa10378-791a-48ad-aa4c-a1c93dcff7a8` | `artifacts/digiwallsys-v1.9.0-build12.apk` |
| Google Play AAB | `b650ffe7-d1eb-4dd0-8206-359ec124d1da` | `artifacts/digiwallsys-v1.9.0-build12.aab` |

Both binaries embed `https://digiwallsys-api.onrender.com`; the APK's Android
v2 signature, the AAB's JAR signature, Bundletool validation, package metadata,
and `artifacts/SHA256SUMS-v1.9.0.txt` have been verified. Git LFS retains the
large repository copies without storing them as ordinary Git blobs.

Free iPhone development testing does not require Apple Developer membership:

```bash
# Same LAN as the iPhone; scan the printed QR code with Expo Go
npm run start:mobile -- --lan

# Reproducible iOS JavaScript/Hermes export gate
npm run build:ios:bundle
```

Expo Go is not a distributable IPA. A production EAS iOS build still requires
an Apple distribution certificate and provisioning profile; `app.json`
declares `ITSAppUsesNonExemptEncryption=false` for the app's HTTPS-only
networking. The project owner deferred that archive and physical-device
acceptance outside the `v1.9.0` delivery scope.
Generate native projects with Expo prebuild only when local native debugging is
needed; use the EAS preview profile for an installable test APK and the
production profiles for store artifacts. Always set the final
`EXPO_PUBLIC_API_URL` before building.

## Production gates

Do not deploy real-money functionality until the roadmap's ledger, provider,
compliance, fraud, observability, backup, and independent review work is done.

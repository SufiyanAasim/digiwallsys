# Deployment

## API and database

1. Build the root `Dockerfile`.
2. Provision PostgreSQL and apply `config/database.sql` through a migration job.
3. Store `DATABASE_URL` and a random `JWT_SECRET` in a secret manager.
4. Enable `DATABASE_SSL` when the provider requires it.
5. Restrict `CORS_ORIGIN` and expose the API only over HTTPS.
6. Verify `/api/health` and test registration, login, and a rollback-safe transfer.

### Render, Supabase, and Vercel

This is the provider combination the project actually deploys to: Render runs
the API, Supabase hosts PostgreSQL, Vercel serves the exported web build.
`examples/render.env.example`, `examples/supabase.env.example`, and
`examples/vercel.env.example` are ready-to-fill templates for each — none of
these three read a `.env` file from the repo, so every variable has to be set
in that provider's own dashboard. See the README's "Deployment target env
files" section for which file goes where.

Render auto-injects `PORT`; do not set it. Point Render at either the root
`Dockerfile` or a native Node runtime running `npm run start:api` — both work.

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

### Building an APK locally (no EAS account)

`src/mobile/android` is a committed-ignored Expo prebuild whose `release`
buildType is still wired to the **debug** keystore, so it produces an
installable — but not store-signable — APK:

```bash
cd src/mobile/android && ./gradlew assembleRelease
```

Output: `src/mobile/android/app/build/outputs/apk/release/app-release.apk`.

This path needs the Android SDK on the machine — set `ANDROID_HOME` or create
`src/mobile/android/local.properties` with `sdk.dir=/path/to/Android/Sdk`.
Without it Gradle fails at configuration time with `SDK location not found`.
Use the EAS `production` profile (which manages a real upload keystore) for
anything you intend to publish.

## Production gates

Do not deploy real-money functionality until the roadmap's ledger, provider,
compliance, fraud, observability, backup, and independent review work is done.

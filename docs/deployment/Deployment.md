# Deployment

## API and database

1. Build the root `Dockerfile`.
2. Provision PostgreSQL and apply `config/database.sql` through a migration job.
3. Store `DATABASE_URL` and a random `JWT_SECRET` in a secret manager.
4. Enable `DATABASE_SSL` when the provider requires it.
5. Restrict `CORS_ORIGIN` and expose the API only over HTTPS.
6. Verify `/api/health` and test registration, login, and a rollback-safe transfer.

## Mobile

Set `EXPO_PUBLIC_API_URL` to the deployed HTTPS API before creating the Expo
release build. Never embed database credentials or `JWT_SECRET` in the client.

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

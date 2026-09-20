# Couples To-do — Android Build Guide

This document describes how to package the SPA as an Android APK using Capacitor.

## Prerequisites

- Java 21 (JDK)
- Android Studio (SDK + Platform Tools)
- Android SDK platform and build tools installed (via Android Studio)
- Node.js 22+

## One-time setup

1. Install dependencies
   - Node deps are in package.json
2. Build the web app
   - The Vite build outputs to `dist/`
3. Add/Sync Android platform via Capacitor

## Commands

- Build web and assemble a debug APK:

```
npm run build:android
```

This runs:

- `vite build` (outputs `dist/`)
- `cap sync android` (copies web assets into `android/app/src/main/assets/public`)
- `cd android && ./gradlew assembleDebug` (produces `app/build/outputs/apk/debug/app-debug.apk`)

## Open in Android Studio (optional)

```
npx cap open android
```

## Config files

- `capacitor.config.ts` — Capacitor app config (appId, name, webDir)

## Icons and splash (optional)

Consider adding platform-specific icons and splash assets via Capacitor community asset tooling, or place images under `android/app/src/main/res/` and configure accordingly.

## Production builds

Use Android Studio to create a signed release build or run:

```
cd android && ./gradlew assembleRelease
```

For Google Play Internal Testing, build an Android App Bundle:

```
cd android && ./gradlew bundleRelease
```

The test APK installs as **Couples 2Do Test** with the `.debug` application ID
suffix, so it can coexist with a future signed release on the same phone.

## GitHub APK prereleases

Pushes to `codex/android-internal-testing` run the Android APK prerelease workflow.
It validates the backend, runs checks, builds and verifies the signed APK, then
publishes an `android-test-v<version>-r<run>` prerelease with a SHA-256 checksum.
Google Play and Codespaces are not needed. The repository's visibility also
applies to its releases; a prerelease on a public repo is publicly downloadable.

Required Actions secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`ANDROID_TEST_KEYSTORE_BASE64`, and `ANDROID_TEST_KEYSTORE_PASSWORD`. The test
PKCS12 keystore uses alias `couples2do-test`. Keep the same signing secrets for
future updates. Never commit the keystore or its password. The workflow assigns
a monotonically increasing version code from its run number.

See `docs/android-test-release.md` for installation steps and known limitations.

# Couples To-do — Android Build Guide

This document describes how to package the SPA as an Android APK using Capacitor.

## Prerequisites

- Java 17 (JDK)
- Android Studio (SDK + Platform Tools)
- Android SDK platform and build tools installed (via Android Studio)
- Node.js 18+

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

Then sign and align the APK/AAB per Play Console requirements.

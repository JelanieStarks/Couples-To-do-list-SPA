# Windows beta

The Windows installer uses the same React app as Android and web. Build it from
`main` after the Android changes have passed review.

The installer uses one-click setup for the current Windows user. Version 1.0.16
fixes the CommonJS updater import that prevented the previous build from opening.
The build now launches the packaged executable and checks that its interface
and desktop bridges load before uploading the installer.

## Build and download

Configure these repository Actions secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (the legacy `VITE_SUPABASE_ANON_KEY` is also accepted)

Never use a secret or service-role key. Installer workflows enable account login
and task sync, leave legacy routine sync disabled, and check that Supabase email
authentication is reachable before building.

The **Build Windows Installer** workflow runs for pull requests and can be started
manually from Actions. Download its `windows-installer` artifact for a test build.
Pull-request builds stay as test artifacts. Pushes to the desktop beta branch also publish a Windows prerelease after the packaged app passes its startup check. Download the Setup EXE from that release directly; the blockmap and YAML are only needed by the updater. Installer files are written to `release/`;
`dist/` contains only the shared web app.

The combined release workflow publishes on a `v*` tag. For automatic Windows
updates, keep the installer, its `.exe.blockmap`, and `latest.yml` together in
the release. Choose a package version newer than the installed version.

## Checks before sharing

1. Run `npm run lint`, `npm run typecheck`, `npm test`,
   `npm run test:desktop`, and `npm run build:web`.
2. Install the Windows beta and sign in with a test account.
3. Join a second account from Android or another browser using the household code.
4. Create, move, edit, complete, delete, and restore tasks in both directions.
5. Save and reopen a named Life Meeting on both devices.
6. Use **Print / Export** to open the Windows print dialog. Print to PDF and check
   the notes, then repeat and cancel the dialog.
7. Check for an update from an older installed Windows version after a newer
   release has been published with its update files.

Automated tests exercise the sandboxed preload, printing permission checks,
dialog cancellation, document cleanup, and build configuration. An installed
Windows app and two authenticated accounts are still needed for the device tests.

## Remaining feature work

- Migrate routine sharing to household-scoped Supabase tables.
- Replace Google Calendar placeholder authentication and sync.
- Finish the ChatGPT connection after cross-device account and data tests pass.
- Verify email password recovery opens a reachable web URL from the desktop app.
- Fix GitHub Pages configuration if the deploy workflow fails at configure-pages.

## Quick Windows setup

Download `Couples2Do-Setup-1.0.16.exe` from the newest Windows beta release and open it. Setup installs for your Windows account, adds shortcuts, and opens the app without a directory-selection wizard. Existing app data is kept when uninstalling.

Version 1.0.16 fixes the startup crash caused by importing a named export from the CommonJS `electron-updater` package. Windows workflows now launch the packaged app and verify its rendered interface and desktop bridge before sharing a build.

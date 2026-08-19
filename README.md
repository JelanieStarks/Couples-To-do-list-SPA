# Couples To-Do

A shared planner, task list, and life-meeting app for two partners.

The project is being simplified into one React application backed by Supabase,
with an installable web app and Android package built from the same codebase.
See [docs/MVP-ARCHITECTURE.md](docs/MVP-ARCHITECTURE.md) for the agreed product
scope and release gates.

## MVP

- Private email/password accounts
- One two-person household joined with an invite code
- Shared tasks with ownership, assignment, priority, date, and time
- Today view and weekly planner
- Guided life meetings that create follow-up tasks
- Installable PWA for web, Android, and iPhone beta use
- Capacitor Android wrapper; native iOS wrapper prepared for later builds

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

Add the URL and public anon key from a Supabase project to `.env.local`.
Never put the Supabase service-role key in this app.

Apply the MVP database migration in the Supabase SQL editor:

```text
supabase/migrations/202608190001_mvp_foundation.sql
```

The migration creates household-scoped profiles, memberships, tasks, life
meetings, partner invite handling, and row-level security policies.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Web and mobile builds

The production web build is an installable PWA:

```bash
npm run build:web
npm run preview
```

Create and build Android locally:

```bash
npm run cap:add:android
npm run build:android
```

Prepare the iOS wrapper on macOS with Xcode installed:

```bash
npm run cap:add:ios
npm run cap:sync:ios
```

GitHub Actions builds the web app, runs quality checks, and can produce a debug
Android APK. Store signing and paid store accounts are intentionally deferred
until the beta is ready.

## Current refactor status

The secure database and installable-app foundation are in place. The next
milestone replaces the legacy local/mock login and multi-protocol sync code with
Supabase Auth and one household-scoped Realtime data path.

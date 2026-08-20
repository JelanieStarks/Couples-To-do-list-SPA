# Supabase setup

The app stays in clearly labeled local demo mode until these steps are complete.

## 1. Create the project

1. Create a free Supabase project.
2. Open **SQL Editor** in that project.
3. Paste and run `supabase/migrations/202608190001_mvp_foundation.sql`.

The migration creates profiles, two-person households, tasks, life meetings,
invite functions, and row-level security policies.

## 2. Add local environment values

Create `.env.local` in the project root (or copy `.env.local.example`), then
copy the project URL and complete publishable key using the copy button in
**Project Settings → API Keys**:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-complete-key
VITE_ENABLE_SUPABASE_AUTH=true
VITE_ENABLE_SUPABASE_SYNC=false
```

The publishable key is intended for browser applications and is protected by
the database row-level security policies. Never place a secret or service-role
key here. `.env.local` is intentionally ignored by Git and must not be pushed;
configure the same values in the deployment provider when the web app is
published. The legacy `VITE_SUPABASE_ANON_KEY` name remains supported.

Task sync stays disabled until the old `tasks_sync` implementation is migrated
to the household-secured `tasks` table. Authentication and partner linking can
be tested while sync is disabled.

Restart `npm run dev` after changing environment values.

## 3. Configure email authentication

In **Authentication → Providers → Email**:

- keep Email enabled;
- use email confirmation for public testing;
- optionally disable confirmation only during local two-account testing.

Add the local app URL to **Authentication → URL Configuration**:

```text
http://localhost:5173
```

Add the eventual production web URL before public testing.

## 4. Test two accounts

1. Create the first account in a normal browser window.
2. Copy its 8-character household code.
3. Create the second account in a private/incognito window.
4. Open Partner settings for the second account and enter the first code.
5. Confirm both accounts show the other partner.

Task syncing is the next migration milestone. Account and household linking are
ready first so every later task write has a trustworthy security boundary.

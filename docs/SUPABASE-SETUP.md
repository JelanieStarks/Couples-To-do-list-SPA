# Supabase setup

The app stays in clearly labeled local demo mode until these steps are complete.

## 1. Create the project

1. Create a free Supabase project.
2. Open **SQL Editor** in that project.
3. Paste and run `supabase/migrations/202608190001_mvp_foundation.sql`.

The migration creates profiles, two-person households, tasks, life meetings,
invite functions, and row-level security policies.

## 2. Add local environment values

Copy `.env.local.example` to `.env.local`, then copy the project URL and public
anon key from **Project Settings → API**:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_ENABLE_SUPABASE_AUTH=true
VITE_ENABLE_SUPABASE_SYNC=true
```

The anon key is intended for browser applications and is protected by the
database row-level security policies. Never place the service-role key here.

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

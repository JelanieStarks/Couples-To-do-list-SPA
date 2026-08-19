# Couples To-Do MVP Architecture

## Product promise

Couples To-Do gives two partners one dependable place to:

1. keep a shared task list;
2. plan the current week; and
3. run a life meeting that turns decisions into assigned tasks.

The first public release targets the web and Android. The web build must be an
installable PWA so iPhone users can join the beta without App Store distribution.

## Version-one scope

### Planner

- Create, edit, complete, restore, and permanently delete tasks.
- Assign work to me, my partner, or both of us.
- Schedule tasks by date and optional time.
- See Today and one weekly planner view.
- Work from cached data while temporarily offline and reconcile when online.

### Couple accounts

- Email and password sign-up/sign-in through Supabase Auth.
- Each new account begins in a private one-person household.
- A one-time household invite code links the second partner.
- Every server read and write is checked against authenticated household membership.

### Life meetings

- Create a dated meeting for the household.
- Record mood, energy, gratitude, needs, agenda topics, decisions, and notes.
- Convert action items into assigned planner tasks.
- Reopen prior meetings without exposing them to another household.

## Deliberately deferred

- Google or Microsoft calendar synchronization.
- AI-generated advice or summaries.
- Windows, macOS, and Linux desktop installers.
- WebRTC, LAN, QR-code, and custom WebSocket synchronization.
- Multiple households, teams, children, or more than two members.
- Paid plans, subscriptions, analytics, and advertising.

## Technical shape

- React + Vite + TypeScript for one shared interface.
- Supabase Auth, Postgres, and Realtime as the only remote data system.
- Capacitor for Android and a future native iOS wrapper.
- A service worker and web manifest for the installable PWA.
- Local browser storage only as an offline cache, never as identity or authorization.

## Data ownership

`households` is the security boundary. A user can read or change a task or
meeting only when `is_household_member(household_id)` is true. Invite codes are
resolved by a security-definer database function and never weaken row-level
security policies.

## Release gates

- Lint, type-check, tests, and the production web build pass.
- No high-severity production dependency advisories.
- Two separate accounts can join the same household and see task changes live.
- An unrelated third account cannot read or modify that household.
- The PWA installs on Android and iPhone Safari.
- Android produces a signed test build; Play Store signing is added at launch.

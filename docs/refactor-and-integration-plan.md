# Refactor + Integration Plan

## Goals
- Make task operations cheaper (no repeated stringify, faster inserts, memoized selectors).
- Swap bespoke auth/sync plumbing for managed, free-tier services (Supabase) while keeping offline/peer strengths.
- Land thorough tests to guard behavior and new integrations.

## Phase 1 — TaskContext efficiency
1) Introduce lightweight change detection
- Replace JSON string compare with a simple doc version/hash from `TaskDoc` to decide whether to apply remote snapshots.
- Keep a last-seen version per source (server, broadcast, storage) to avoid redundant `replaceAllFromExternal`.

2) Faster ordering
- Track per-priority monotonic counters in `TaskDoc` metadata so `createTask` computes `order` in O(1).
- Ensure `reorderTasksWithinPriority` remains deterministic and updates the counter if user drags beyond current max.

3) Memoized selectors
- Add derived selectors (e.g., `useTodaysTasks`, `useTasksByDate(date)`, `useCompletedTasks`) that memoize on `tasks` + args.
- Keep current sort/priority semantics identical; add unit tests to prove ordering and repeat logic stay the same.

4) Broadcast/persistence hygiene
- Debounce BroadcastChannel posts and localStorage writes if needed (optional) once above changes are in.

## Phase 2 — Supabase integration (keeps offline-first)
1) Auth
- Add Supabase client + env wiring.
- Replace `login/linkPartner/unlinkPartner` mocks with Supabase Auth (email magic link or password) and a `partners` table.
- Keep localStorage bootstrap for offline; hydrate from Supabase when online.

2) Realtime task sync
- Create a `tasks` table keyed by `roomId`; subscribe to Supabase Realtime channels.
- Map rows to `Task` shape and feed `TaskDoc.replaceAllFromExternal` with versioning to avoid loops.
- Gate behind feature flag (`VITE_ENABLE_SUPABASE_SYNC`) so existing flows still work.

3) Google Calendar bridge
- Ensure existing Google sync still triggers after Supabase sync; add conflict notes in docs.

4) Offline/LAN coexistence
- If Realtime is on, still allow WebRTC/LAN; ensure origin tagging prevents echo.

## Testing plan
- Unit: selectors (today, by date, completed ordering), order counters, repeat logic, import parsing.
- Integration: server sync replacement logic (versioned), Supabase auth happy/sad paths (mock client), Supabase Realtime fan-in/out, LAN + Supabase coexistence smoke.
- E2E-ish (component): Task create/update/reorder flows still render correctly in UI components that consume selectors.

## Step-by-step execution
1) Add doc version tracking to `TaskDoc` and use it in TaskContext sync paths.
2) Implement per-priority order counters; adjust create/reorder logic + tests.
3) Add memoized selector hooks and migrate consumers.
4) Write/expand Vitest suites for ordering/selectors/import parsing.
5) Wire Supabase client/config (no behavior change yet).
6) Replace AuthContext methods to use Supabase (feature-flagged); add tests mocking Supabase.
7) Add Supabase Realtime task sync with origin tagging and tests.
8) Update docs/env samples; run full test suite.

## Tiny homework (user)
- Confirm you’re cool with Supabase (free tier) for auth + realtime.
- Confirm preferred auth method: magic link vs password.

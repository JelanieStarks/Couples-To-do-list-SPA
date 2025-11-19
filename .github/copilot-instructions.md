# Couples To-Do Copilot Guide

## Architecture Overview

- `src/main.jsx` boots the SPA, restores text scaling from `storage`, and renders `App` in `StrictMode`.
- `src/App.jsx` composes `AuthProvider` and `TaskProvider`, gating between `LoginPage`, dashboard panels, and `WeeklyCalendar` inside `components/ui/Layout.tsx`.
- UI is organized under `src/components/{auth,tasks,calendar,ui}`; contexts live in `src/contexts`, utilities in `src/utils`, and sync logic under `src/{sync,p2p}`.

## State & Sync Model

- `contexts/AuthContext.tsx` persists users/partners via `storage` and exposes async `login`, `linkPartner`, `logout`, `updateUser`; pass `initialUser` in tests to skip localStorage boot.
- `contexts/TaskContext.tsx` wraps all task operations around a shared Yjs `TaskDoc` (`p2p/taskDoc.ts`), so always call context helpers (`createTask`, `updateTask`, `toggleTaskComplete`, `reorderTasksWithinPriority`, etc.) instead of mutating arrays.
- Tasks sync locally through `localStorage`, a `BroadcastChannel`, and optional REST/WebSocket replication via `ServerSync` (`src/sync/ServerSync.ts`) when `VITE_SYNC_URL` is set.
- Peer-to-peer collaboration layers on `WebRTCSession` + optional LAN signaling (`src/p2p/webrtcSession.ts`, `src/p2p/signaling.ts`, `server/signalingServer.js`); keep `TaskDoc` updates tagged with the correct origin to avoid feedback loops.
- All task shapes must match `src/types/index.ts`—respect `order`, `updatedAt`, and `repeat` semantics so daily repeats and calendar views stay consistent.

## UI & Interaction Patterns

- Panels use custom neon surface classes from `src/index.css`; Tailwind utilities may be mixed with `panel-neon`, `btn-neon`, and `task-card-neon` tokens.
- `components/tasks/TodaysTasks.tsx` and `components/calendar/WeeklyCalendar.tsx` rely on `@dnd-kit` for drag/drop; update `data-task-id` hooks if you change rendering so scroll/highlight helpers still find nodes.
- Use `hooks/useTaskFilter.ts` for any filtering—its module-level store keeps filters in sync across components and persists to `STORAGE_KEYS.SETTINGS`.
- Respect layout expectations in `components/ui/Layout.tsx`: header buttons call `syncNow`, copy invite codes, and open `SideDrawer`; wire new global actions through that component.

## Tooling & Workflows

- Core scripts: `npm run dev` (web), `npm run dev:desktop` (Electron shell), `npm run dev:server` (in-memory sync API), `npm run dev:lan:signal` (WebSocket signaling), `npm run build`, `npm run preview`.
- To exercise remote sync locally, start the server then set `VITE_SYNC_URL` (or export `VITE_LAN_SIGNAL_URL`) before launching Vite; `config.ts` normalizes URLs and derives room ids from `AuthContext` users.
- Electron/Capacitor builds expect relative asset paths (`vite.config.js` sets `base: './'` on build) and Node polyfills (`buffer`, `process`, etc.) are injected via Vite aliases.

## Testing & Quality

- Tests live beside code in `__tests__` folders; run with `npm test`, `npm run test:watch`, or `npm run test:peer-sync` (sets `RUN_PEER_SYNC=true` for LAN/WebRTC cases).
- `vitest.setup.ts` polyfills `WebSocket` and allows tests to mutate `globalThis.VITE_SYNC_URL`; prefer `src/test-utils/renderWithProviders.tsx` to mount components so contexts are wired correctly.
- When asserting task state, use context selectors (`getTodaysTasks`, `getTasksByDate`, etc.) instead of reading `tasks` directly to honor filtering, ordering, and repeat logic.

## Implementation Notes

- Always go through `storage` helpers (`utils/index.ts`) for persistence; they centralize JSON parsing and handle errors.
- If you need to seed or replace the dataset, call `TaskDoc.replaceAllFromExternal` or `TaskProvider` APIs—writing straight to localStorage or Yjs maps can desync the BroadcastChannel flow.
- Styling changes should extend `tailwind.config.js` tokens or `src/index.css` layers so Electron, web, and Capacitor builds stay visually aligned.
- Keep commits DRY and beginner-friendly: prefer semantic names, inline documentation that matches the existing tone, and small, testable slices.

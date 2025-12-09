# Cleanup Roadmap — Auth & Calendar Kickoff

> Jarvis 2.0 mission control for renaming and simplification. Theme guidance: cartoons + cereal + anime (Initial D, DBZ, Naruto, Pokémon, Billy & Mandy, SpongeBob).

## Phase 1 — Name Game Lineup

| Item Type          | File                                       | Current Name       | Suggested Theme Direction | Needs User Pick? |
| ------------------ | ------------------------------------------ | ------------------ | ------------------------- | ---------------- |
| React Component    | src/components/auth/LoginPage.tsx          | `LoginPage`        | `DbzHeartLoginGate`       | ✅               |
| React Component    | src/components/auth/PartnerManager.tsx     | `PartnerManager`   | `BuddyLinkGarage`         | ✅               |
| React Component    | src/components/calendar/WeeklyCalendar.tsx | `WeeklyCalendar`   | `TurboWeekTracker`        | ✅               |
| React Subcomponent | src/components/calendar/WeeklyCalendar.tsx | `DayColumn`        | `DayPitStop`              | ✅               |
| React Subcomponent | src/components/calendar/WeeklyCalendar.tsx | `DraggableTask`    | `TaskDriftCard`           | ✅               |
| React Subcomponent | src/components/calendar/WeeklyCalendar.tsx | `ExpandedDayModal` | `FullDayReplay`           | ✅               |
| Context Hook       | src/contexts/AuthContext.tsx               | `AuthProvider`     | Industry standard — keep  | ❌               |
| Context Hook       | src/contexts/AuthContext.tsx               | `useAuth`          | Industry standard — keep  | ❌               |

## Phase 2 — CSS & Class Renames To Approve

| Class Aliases Swapped                          | Status      | Notes                                            |
| ---------------------------------------------- | ----------- | ------------------------------------------------ |
| `.panel-neon` → `neon-hype-panel`              | ✅ Complete | Panels refit with neon hype styling              |
| `.panel-neon-border` → `rainbow-crunch-border` | ✅ Complete | Border alias in place for all neon shells        |
| `.day-square*` → `track-day-box` family        | ✅ Complete | Calendar day tiles renamed across planner + CSS  |
| `.task-card-neon` → `mission-card`             | ✅ Complete | Task cards + accent strip now mission-themed     |
| `.btn-neon` → `neon-action-button`             | ✅ Complete | All components and tests use new button alias    |
| `.icon-btn-neon` → `neon-icon-button`          | ✅ Complete | Header/drawer buttons adjusted                   |
| `.neon-field` / `.neon-input` → glow stack     | ✅ Complete | Form wrappers/inputs now glow-field + glow-input |
| `.neon-glow-ambient` → `glow-ambient-orb`      | ✅ Complete | Ambient glow helper renamed                      |

> Tailwind utility classes (e.g., `flex`, `text-xs`) stay as-is — they’re industry standard.

## Phase 3 — Simplify & Comment

1. Rewrite component docstrings + section headers in plain, playful language.
2. Split chunky logic into baby functions with obvious intent.
3. Add gentle inline hints before tricky blocks (rare, but present where logic stacks up).
4. Keep behavior identical (run relevant tests after each batch).

## Phase 4 — Calendar & Task Plugin Recon

- In-app calendar: TurboWeekTracker shipped (with Mega Calendar modal). Legacy WeeklyCalendar is now an alias.
- Google Calendar: settings drawer shows stub “connect” status + embed toggle; FullCalendar modal reads embed flag.
- Scaffolding added:
  - Client stubs: `utils/googleAuth.ts`, `utils/googleCalendarSync.ts` (no network calls yet)
  - Server stubs: `/v1/google/oauth/init` and `/v1/google/oauth/callback` return placeholder payloads
- Next: wire real PKCE OAuth, store refresh tokens server-side, and push/pull tasks ↔ events via Google Calendar API.

## Status Tracker

| Phase   | Status         | Notes                                                             |
| ------- | -------------- | ----------------------------------------------------------------- |
| Phase 1 | ✅ Ready       | New names locked in                                               |
| Phase 2 | ✅ Ready       | CSS rename roster finalized                                       |
| Phase 3 | 🛠️ In progress | Neon aliases shipped, calendar tests renamed, CSS pruned          |
| Phase 4 | 🛠️ Scaffolded  | Calendar UI live; Google OAuth/sync stubs added; need real tokens |

---

Once you bless the new names, I’ll start swapping them in small, testable PR-sized chunks. Let’s make this codebase Saturday morning cartoon friendly. 🍿

# Phase 4 — Calendar & Task Plugin Recon

> Jarvis 2.0 scouting report for automation hookups. We’re comparing five heavy hitters so you can pick the right co-pilot (or mashups) for Couples To-Do.

## Comparison Snapshot

| Option                             | Sweet Spot                                                | Setup Lift                                                                         | Cost & Limits                                           | Strengths                                                                   | Watch-outs                                                                                      |
| ---------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Google Calendar API**            | Couples already on Gmail; lightweight event mirroring     | OAuth 2.0 consent screen, refresh tokens, Pub/Sub if you want live sync            | Generous free tier; quotas reset daily                  | Deep ecosystem, reliable webhooks (via push notifications), timezone smarts | Consent flow can feel heavy; strict brand verification for production-wide scopes               |
| **Microsoft Graph Calendar**       | Households using Outlook/Office 365                       | OAuth 2.0 with Azure App registration, needs tenant admin approval for wide deploy | Microsoft 365 subscription; per-tenant throttles        | Uniform API for mail + calendar + tasks, delta queries make sync efficient  | Enterprise-flavored docs; partner must have Microsoft account                                   |
| **Cal.com Embed/SDK**              | Beautiful scheduling UI without rolling it yourself       | API key + hosted pages or self-host; optional webhooks                             | Open-source core (free); hosted plans start ~$12/mo     | Drag-and-drop scheduling, embeddable widgets, booking links                 | Focused on appointments, not task boards; writing back to Couples tasks needs translation layer |
| **FullCalendar React**             | Want to stay client-side but upgrade DnD & timeline views | Install React wrapper, feed it task data, optionally connect premium plugins       | MIT core; premium add-ons ~$120/year                    | Gorgeous week/day timelines, built-in drag handles, resource lanes          | Pure front-end: you still manage persistence, collisions, auth                                  |
| **Todoist / Microsoft To Do APIs** | Couples already loyal to a task app and want mirroring    | OAuth 2.0 per user; poll or webhook for updates                                    | Free tier with request caps; paid unlocks higher quotas | Production-grade task engines, reminders, mobile push                       | API-driven? stay under rate limits; tasks must map to their schema                              |

## Deeper Notes

### Google Calendar API

- **Why it rocks:** ubiquitous, great documentation, and users trust the interface. Couples can see shared tasks alongside personal events instantly.
- **How to hook it in:**
  1. Create a Google Cloud project → enable Calendar API.
  2. Configure OAuth consent screen (external type) and add scopes like `https://www.googleapis.com/auth/calendar.events`.
  3. Use PKCE flow on web to get tokens; store refresh token encrypted (e.g., Supabase, custom backend).
  4. Call `events.insert` / `events.patch` when Couples tasks change; use `channel.watch` with Pub/Sub to receive push notifications for updates.
- **Gotchas:** brand review can take weeks; make sure scopes are minimal and explain the value to reviewers.

### Microsoft Graph Calendar

- **Why it rocks:** couples already living in Outlook get a single source of truth; Graph API also unlocks To Do lists later.
- **How to hook it in:**
  1. Register app in Azure Portal; set redirect URIs for SPA + server.
  2. Request delegated permissions like `Calendars.ReadWrite` (needs admin consent for orgs).
  3. Use MSAL.js (SPA) or MSAL Node to fetch tokens.
  4. Call `/me/events` endpoints; use delta queries to track changes without polling entire calendars.
- **Gotchas:** docs lean enterprise; free personal accounts work but throttling can be stricter than Google.

### Cal.com

- **Why it rocks:** nabs a pro-looking booking experience instantly—drag/drop, availability, reminders.
- **How to hook it in:**
  1. Decide hosted (Cal.com cloud) vs self-host (Next.js + Postgres).
  2. Embed with `<InlineWidget />` or use the REST API to create booking links.
  3. Listen to webhooks (booking.created, booking.updated) to spawn Couples tasks or events.
- **Gotchas:** Cal is appointment-first. You’ll translate bookings into tasks, and Couples users still need our weekly board for follow-up work.

### FullCalendar React

- **Why it rocks:** stays inside our React app, but unlocks pro timeline + drag handles + mobile gestures.
- **How to hook it in:**
  1. `npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid` (plus premium packages if needed).
  2. Map Couples tasks to `events` array (`{ id, title, start, end }`).
  3. Handle `eventDrop` / `eventResize` callbacks to update TaskContext.
  4. Style via CSS variables or Tailwind wrappers.
- **Gotchas:** it’s purely UI. Recurrence, storage, and conflict resolution remain your job. Premium license needed for resource timelines.

### Todoist / Microsoft To Do APIs

- **Why they rock:** couples that already trust a task platform can mirror tasks and get mobile reminders, Siri/Alexa integration, etc.
- **How to hook it in:**
  1. Register dev app → get OAuth credentials.
  2. On connect, exchange code for token and store refresh token securely.
  3. Sync down base dataset (`/sync/v9/sync` for Todoist, `/me/todo/lists` for Graph To Do).
  4. On Couples updates, push to partner API; listen to webhooks/delta queries to keep state aligned.
- **Gotchas:** quotas mean chunk writes; mapping Couples fields (priority, repeat rules) to provider schema can get gnarly.

## Recommendation Ladder

1. **Short-term wow:** embed **FullCalendar React** for a turbo week planner upgrade without auth overhead.
2. **Medium-term sync:** offer **Google Calendar** connect first (biggest user overlap), then add **Microsoft Graph** for Outlook households.
3. **Pro power-ups:** optional **Cal.com** integration for couples who want meeting-style booking, or **Todoist/Microsoft To Do** mirroring for power taskers.

## Next Steps Checklist

- [ ] Decide if Phase 4 focuses on calendar views (FullCalendar) or external sync (Google/Microsoft) first.
- [ ] If sync: prep backend endpoint to store tokens securely (Supabase Vault, serverless function, etc.).
- [ ] Draft consent screen copy and scopes for Google + Microsoft.
- [ ] Spike a proof-of-concept: read-only calendar import, or push a single Couples task to an external calendar.
- [ ] Gather partner feedback: who actually wants external sync vs richer in-app calendar?

🚀 When you pick the target, we’ll scaffold the connectors (or drop in FullCalendar) like a Saturday morning montage.

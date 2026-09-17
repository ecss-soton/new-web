# City Challenge — Plan & Overview

## Summary

A scavenger-hunt page at `/citychallenge` with team-based challenge completion,
shared fog-of-war map discovery, and role-based views (team lead vs participant).

---

## Payload CMS

### Collection `city-challenge-locations` — `src/payload/collections/CityChallengeLocations.ts`

- `name` (text, required) — location name
- `description` (textarea) — clue or hint
- `zone` (text, optional) — groups challenges in the list view ("No Zone" if blank)
- `completionType` (select, required, default `tick`) — `tick` (done / not done) or `counter` (x out of y)
- `points` (number, default 0) — points for a tick, or points per increment for a counter
- `maxCount` (number, required for counters) — maximum number of increments; counter points are `count × points`, capped at `maxCount × points`
- `latitude` / `longitude` (number, **optional**) — if either is set the other must be set too; both may be blank
- `link` (text, HTTPS URL, **optional**)
- **Everything is optional except `name`.** A challenge may have coordinates, a link, both, or neither.
- If both coordinates **and** a link are provided, the link takes priority as the destination.
- Challenges without coordinates do **not** appear on the map (no pin is rendered).
- `sortOrder` (number, default 0)
- Access: `read` = logged-in members only; `create/update/delete` = admins only

### Collection `city-challenge-teams` — `src/payload/collections/CityChallengeTeams.ts`

- `name` (text, required) — team display name
- `teamLead` (relationship → users, required) — the user who manages the team
- `members` (relationship → users, hasMany) — participating team members (excludes the lead)
- `completedChallenges` (relationship → city-challenge-locations, hasMany) — ticked challenges
- `challengeProgress` (JSON, readOnly) — array of `{ locationId, count }` entries for counter challenges
- `discoveredAreas` (JSON) — array of fog-of-war grid cell IDs (`"latIdx:lngIdx"`)
- Access: `read` = the team's lead/members or an admin only; `create/update/delete` = admins only
- Custom endpoints handle team lead and member interactions (see below)

### Fog-of-war grid

- Geographic cells of `CITY_CHALLENGE_CELL_DEG = 0.002` degrees (≈222 m latitude, ≈140 m
  longitude at Southampton). All shared logic lives in `src/app/_utilities/cityChallenge.ts`
  (single source of truth imported by the collection, page, and map).
- Stored as cell-ID strings; legacy `{lat,lng}` point arrays are migrated on read/write.
- Server caps a team at `MAX_DISCOVERY_CELLS` (20 000) cells and accepts batched
  `{ points: [{lat,lng}] }` (max 200 per request) as well as a single `{lat,lng}`.
- The Southampton play area is `CITY_CHALLENGE_BOUNDS` (axis-aligned box); the explored
  percentage is `revealed cells in box / total cells in box`.

### Custom endpoints on `city-challenge-teams`

- `POST /:id/discover` — any team member submits `{lat,lng}` or `{points:[...]}`; coordinates are
  validated, deduplicated by grid cell, and stored. Returns the updated `discoveredAreas`.
- `POST /:id/complete` — team lead **or admin** updates one challenge. For a `tick` challenge it toggles
  the ID; for a `counter` challenge it accepts `{ count }` (integer ≥ 0), clamps it to `0..maxCount`, and
  stores it in `challengeProgress`. The location must exist. Returns the updated `completedChallenges` and
  `challengeProgress`.
- `POST /:id/name` — team lead **or admin** renames the team with `{ name }` (trimmed, 1–60 chars).
- `POST /:id/members` — team lead adds/removes a member by stable `userId` (or `username`).
  Rejects the lead, duplicates, and users already committed to another team. Returns the roster.
- `GET /:id/roster` — lead/member/admin; returns safe `{id, name, username}` summaries for the
  lead and members. This is the canonical source of member names, because regular users cannot
  read each other's user documents.
- `GET /:id/member-search?q=` — lead/admin only; searches users by name/username (`like`), excludes
  the lead, current members, and users already on another team. Used for member autocomplete.

### Root endpoint

- `GET /api/city-challenge/progress` — admin only (403 otherwise). Returns `{ locations, teams }`
  for the admin progress view: each team's lead/member count, `completedChallenges`,
  `challengeProgress`, `exploredPercent`, and `lastUpdated`. Raw grid cells stay server-side.
- Both collections are registered in `payload.config.ts` and grouped under **City Challenge** in
  the admin sidebar via `src/payload/collections/groups.ts`.

### Admin progress view

- **`/citychallenge/admin`** — `src/app/(pages)/citychallenge/admin/`; admin only (non-admins are
  redirected to `/citychallenge`).
  - **Teams tab**: sortable leaderboard (rank, team, lead, members, completed, points, explored %,
    updated); rows expand to that team's per-challenge status and link to the Payload document.
    Admins can rename the team and toggle ticks / adjust counters inline.
  - **Challenges tab**: grouped by zone (No Zone last), sortable within each zone by completed /
    not-completed teams, completion %, points awarded, points, name; filterable; rows expand into
    Completed / In progress / Not started team lists, where admins can update any team's progress inline.
  - Derivations live in `src/app/_utilities/cityChallengeStats.ts`, sharing the scoring rules in
    `cityChallenge.ts` so admin figures match the player UI.
  - Admins also get a "team progress" link on `/citychallenge`.

---

## Page / Routing

- **`/citychallenge`** — `src/app/(pages)/citychallenge/page.tsx`
  - Auth guard via `getMeUser()` — redirects unauthenticated users to `/login`
  - Determines the user's team and role (`lead`, `participant`, `none`)
  - Fetches names through `/:id/roster` (never relies on access-restricted relationship population)
  - Supports `?view=list` (default) and `?view=map` query params for view switching
  - Role-based rendering:
    - No team → "Ask your team lead to add you!" message
    - Participant → list/map toggle, read-only challenge list, shared fog-of-war map
    - Team lead → same + team management panel + mark challenges complete
  - API failures are surfaced as an error banner rather than rendering a misleading empty state

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ViewToggle` | `citychallenge/ViewToggle/` | Client component. List/Map switcher using URL query params |
| `NoTeamMessage` | `citychallenge/NoTeamMessage/` | "Ask your team lead" placeholder for unassigned users |
| `ChallengeList` | `citychallenge/ChallengeList/` | List view: all challenges with completion status/checkboxes |
| `TeamPanel` | `citychallenge/TeamPanel/` | Team lead: member autocomplete search + add/remove |
| `CityChallengeMap` | `citychallenge/CityChallengeMap/` | Map view with shared fog-of-war and challenge pins |

### Map View — Shared Fog of War

- Canvas overlay with dark semi-transparent fill, grid pattern, and hint text
- Discovery cells loaded from the server (team's `discoveredAreas` field)
- `destination-out` composite operation punches out revealed geographic cells
- Redraws on pan/zoom and on container resize (`ResizeObserver` + `map.invalidateSize()`)
- Only challenges with coordinates get a pin; pins are numbered in `sortOrder` so numbers have no gaps
- Pins are lime while incomplete and cyan once complete (a counter is complete at `maxCount`)
- Map popups include points and counter progress, plus a "Get me there →" link
- OpenStreetMap tile attribution is shown
- Geolocation tracking via `watchPosition` with event-driven discovery
- Header shows **"Southampton explored: NN.N%"** — the share of grid cells revealed within the
  bounding box `CITY_CHALLENGE_BOUNDS` in `src/app/_utilities/cityChallenge.ts` — and team **points**

### Discovery Efficiency

The client does NOT poll or use timers for position. Strategy:

1. **Event-driven** — `watchPosition` fires only when the device detects movement
2. **Client-side dedup** — before any network call, checks if the grid cell is already known
3. **Batched, queue-backed sync** — new cells are buffered and flushed on a trailing-edge throttle,
   so a burst of movement never drops a cell; failed batches are re-queued and retried
4. **Optimistic local update** — revealed cells appear immediately; server responses are unioned
   in rather than replacing local state
5. **Bounded storage** — server caps stored cells, and the thicker 0.002° grid keeps counts low

### List View

- Shows ALL challenges (names, descriptions, points, destination)
- Destination resolution: CMS `link` takes priority; otherwise coordinates open in the device's default
  map app (Apple Maps on iOS/iPadOS, `geo:` on Android, Google Maps on desktop) via
  `src/app/_utilities/mapLinks.ts`. Platform detection runs after mount to avoid hydration mismatches.
- No destination button when a challenge has neither a valid link nor complete coordinates
- Points shown per challenge and as a team total (`earned / max`); the completion bar counts ticks and
  counters that have reached `maxCount`
- Team lead sees checkboxes for ticks and −/+ controls for counters; participants see read-only status
- Sorted by `sortOrder`, grouped by `zone`

### Admin/CMS Workflow

- Admins create teams in the Payload admin panel, assigning a user as `teamLead`
- Team leads manage their team from the `/citychallenge` page (add/remove members, mark challenges)
- Locations are managed entirely in Payload CMS by admins

---

## Security & Integrity Notes

- Relationship population respects access control, so the frontend resolves member names through
  the `roster` endpoint instead of `depth=1` (which would return raw IDs to non-admins).
- Team reads are scoped to the team's lead/members (admins see all).
- Member changes validate the target user, prevent the lead being added as a member, and prevent a
  user joining multiple teams. The one-team-per-user rule is enforced both in the `members`
  endpoint and by a collection `beforeChange` hook, so admin/CMS edits are covered too.
- Completion validates that the challenge exists.
- Hidden/legacy data stays safe: `discoveredAreas` is migrated, capped, and deduplicated.
- The JWT token is passed to client components from the server page (same pattern as booking and
  elections) and is already present in the browser's `payload-token` cookie.

---

## Manual QA Checklist

No automated tests exist for this feature; run through the following against a dev instance with
MongoDB and at least two user accounts (one lead, one member) plus an admin.

### Auth & routing
- [ ] Logged out → `/citychallenge` redirects to `/login` and returns to `/citychallenge` after login.
- [ ] `?redirect=//evil.com` and `?redirect=javascript:alert(1)` are rejected by the login route.
- [ ] `?view=map` shows the map; any other `?view=` value falls back to the list.
- [ ] No-team user sees the "Ask your team lead" message; lead sees `TeamPanel`; member sees `TeamRoster`.

### Access control (expect 401/403 where noted)
- [ ] Unauthenticated `GET /:id/roster`, `/member-search`, `POST /:id/members|complete|discover` → 401.
- [ ] A member of team A cannot read team B via `GET /api/city-challenge-teams` (empty) or call team B's
  `roster`/`members`/`complete`/`discover` (403).
- [ ] A participant cannot call `members`, `complete`, or `member-search` (403).
- [ ] Admin can list/read all teams and call `roster`/`member-search`.

### Team management
- [ ] Search by name and username returns results; `already on another team` entries are disabled.
- [ ] Add a member → name appears in the list and roster immediately (no raw IDs anywhere).
- [ ] Remove a member → disappears from the list and roster.
- [ ] Adding the team lead, or a user already on another team, is rejected (400/409).
- [ ] Adding an existing member is idempotent (no duplicate).
- [ ] Editing a team in the admin UI to reuse a lead/member from another team is rejected by the
  `beforeChange` hook.

### Challenges
- [ ] Lead can tick/untick; member sees status dots only.
- [ ] Invalid `locationId` returns 400; progress counts only known challenges.
- [ ] Link-only challenge shows "Open link now"; coordinate-only shows "Get me there →".
- [ ] Challenge with neither coordinates nor a link renders (no destination button, no pin).
- [ ] Coordinates: providing only one of latitude/longitude is rejected; leaving both blank is accepted.
- [ ] Counter: lead −/+ clamps between 0 and `maxCount`; `count` of a negative/non-integer returns 400.
- [ ] Counter at `maxCount` counts as complete and awards `maxCount × points`; partial awards proportionally.
- [ ] Points display matches `computeChallengeScore` (per-card and team total).
- [ ] Destination opens Apple Maps on iOS, the default Android map app via `geo:`, and Google Maps on desktop.

### Map & fog
- [ ] Revealing a cell persists across reload; two browsers/accounts on the same team both persist
  discoveries (note: concurrent same-instant writes may lose a cell — known accepted limitation).
- [ ] Invalid/empty/oversized `{points}` batches return 400; single `{lat,lng}` still works.
- [ ] Geolocation denied / unsupported shows an error, map still renders.
- [ ] Admin mock-location panel reveals cells; canvas redraws on pan/zoom/resize.
- [ ] "Southampton explored: NN.N%" increases as cells inside the bounds are revealed and stays
  within 0–100%.
- [ ] Legacy `{lat,lng}` `discoveredAreas` data still renders (migrates to cell IDs).

### Data hygiene
- [ ] `discoveredAreas` is read-only in the admin UI; clearing requires delete/recreate or the
  documented `mongosh updateMany`.
- [ ] Deleting and recreating a team resets fog, members, and completions.

### Regression
- [ ] Societies/committee archive ordering still behaves (committee by importance, societies shuffled).
- [ ] Jumpstart timeline still collapses past days and highlights today.

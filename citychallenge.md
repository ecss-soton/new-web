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
- `latitude` / `longitude` (number, optional) — required **only** for map-based challenges
- `link` (text, HTTPS URL, optional) — required for link-based challenges (e.g. "Follow this YouTube channel")
- **Either** a complete coordinate pair (`latitude` + `longitude`) **or** a valid HTTPS `link` must be present. Partial coordinates (only one of the two) are always rejected.
- If both coordinates **and** a link are provided, the link takes priority as the "Get me there" destination.
- Link-only challenges do **not** appear on the map (no pin is rendered without coordinates).
- `sortOrder` (number, default 0)
- Access: `read` = logged-in members only; `create/update/delete` = admins only

### Collection `city-challenge-teams` — `src/payload/collections/CityChallengeTeams.ts`

- `name` (text, required) — team display name
- `teamLead` (relationship → users, required) — the user who manages the team
- `members` (relationship → users, hasMany) — participating team members (excludes the lead)
- `completedChallenges` (relationship → city-challenge-locations, hasMany) — challenges marked done
- `discoveredAreas` (JSON) — array of fog-of-war grid cell IDs (`"latIdx:lngIdx"`)
- Access: `read` = the team's lead/members or an admin only; `create/update/delete` = admins only
- Custom endpoints handle team lead and member interactions (see below)

### Fog-of-war grid

- Geographic cells of `CELL_DEG = 0.002` degrees (≈222 m latitude, ≈140 m longitude at Southampton).
  The constant is duplicated in `CityChallengeTeams.ts`, `page.tsx`, and `CityChallengeMap/index.tsx`
  and **must be kept in sync**.
- Stored as cell-ID strings; legacy `{lat,lng}` point arrays are migrated on read/write.
- Server caps a team at `MAX_DISCOVERY_CELLS` (20 000) cells and accepts batched
  `{ points: [{lat,lng}] }` (max 200 per request) as well as a single `{lat,lng}`.

### Custom endpoints on `city-challenge-teams`

- `POST /:id/discover` — any team member submits `{lat,lng}` or `{points:[...]}`; coordinates are
  validated, deduplicated by grid cell, and stored. Returns the updated `discoveredAreas`.
- `POST /:id/complete` — team lead toggles a challenge ID; the location must exist.
- `POST /:id/members` — team lead adds/removes a member by stable `userId` (or `username`).
  Rejects the lead, duplicates, and users already committed to another team. Returns the roster.
- `GET /:id/roster` — lead/member/admin; returns safe `{id, name, username}` summaries for the
  lead and members. This is the canonical source of member names, because regular users cannot
  read each other's user documents.
- `GET /:id/member-search?q=` — lead/admin only; searches users by name/username (`like`), excludes
  the lead, current members, and users already on another team. Used for member autocomplete.

Both collections are registered in `payload.config.ts`.

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
- All challenge locations shown as numbered pins (lime for undone, cyan for completed)
- Map popups include a "Get me there →" link (CMS link preferred over generated Maps URL)
- OpenStreetMap tile attribution is shown
- Geolocation tracking via `watchPosition` with event-driven discovery

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

- Shows ALL challenges (names, descriptions, "Get me there" destination)
- Destination resolution: CMS `link` takes priority; falls back to a Google Maps URL from coordinates
- No destination button when a challenge has neither a valid link nor complete coordinates
- Progress bar counts only completions that map to known challenges
- Team lead sees checkboxes to toggle completion; participants see status dots
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
  user joining multiple teams.
- Completion validates that the challenge exists.
- Hidden/legacy data stays safe: `discoveredAreas` is migrated, capped, and deduplicated.
- The JWT token is passed to client components from the server page (same pattern as booking and
  elections) and is already present in the browser's `payload-token` cookie.

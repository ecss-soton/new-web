# City Challenge — Plan & Overview

## Summary

A scavenger-hunt page at `/citychallenge` with team-based challenge completion,
shared fog-of-war map discovery, and role-based views (team lead vs participant).

---

## Completed

### Payload CMS

- **Collection `city-challenge-locations`** — `src/payload/collections/CityChallengeLocations.ts`
  - `name` (text, required) — location name
  - `description` (textarea) — clue or hint
  - `latitude` / `longitude` (number, required, validated ±90 / ±180)
  - `discoveryRadius` (number, default 50) — how close in metres to trigger discovery
  - `sortOrder` (number, default 0)
  - Access: `read` = logged-in members only; `create/update/delete` = admins only

- **Collection `city-challenge-teams`** — `src/payload/collections/CityChallengeTeams.ts`
  - `name` (text, required) — team display name
  - `teamLead` (relationship → users, required) — the user who manages the team
  - `members` (relationship → users, hasMany) — participating team members
  - `completedChallenges` (relationship → city-challenge-locations, hasMany) — challenges marked done
  - `discoveredAreas` (JSON) — array of `{lat, lng}` points for shared fog-of-war
  - Access: `read` = any logged-in user; `create/update/delete` = admins only
  - Custom endpoints handle team lead and member interactions (see below)

- **Custom endpoints on `city-challenge-teams`:**
  - `POST /:id/discover` — any team member submits `{lat, lng}`; server checks haversine distance and appends if >50m from all existing points
  - `POST /:id/complete` — team lead toggles a challenge ID in `completedChallenges`
  - `POST /:id/members` — team lead adds/removes members by username

- Both collections registered in `payload.config.ts`

### Page / Routing

- **`/citychallenge`** — `src/app/(pages)/citychallenge/page.tsx`
  - Auth guard via `getMeUser()` — redirects unauthenticated users to `/login`
  - Fetches locations and team data; determines user role (`lead`, `participant`, `none`)
  - Supports `?view=list` (default) and `?view=map` query param for view switching
  - Role-based rendering:
    - No team → "Ask your team lead to add you!" message
    - Participant → list/map toggle, read-only challenge list, shared fog-of-war map
    - Team lead → same + team management panel + mark challenges complete

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ViewToggle` | `citychallenge/ViewToggle/` | Client component. List/Map switcher using URL query params |
| `NoTeamMessage` | `citychallenge/NoTeamMessage/` | "Ask your team lead" placeholder for unassigned users |
| `ChallengeList` | `citychallenge/ChallengeList/` | List view: all challenges with completion status/checkboxes |
| `TeamPanel` | `citychallenge/TeamPanel/` | Team lead: add/remove members by username |
| `CityChallengeMap` | `citychallenge/CityChallengeMap/` | Map view with shared fog-of-war and challenge pins |

### Map View — Shared Fog of War

- Canvas overlay with dark semi-transparent fill, grid pattern, and `?` marks
- Discovery areas loaded from server (team's `discoveredAreas` field)
- `destination-out` composite operation punches 80px-radius holes for each discovered point
- All challenge locations shown as numbered pins (lime for undone, cyan for completed)
- Geolocation tracking via `watchPosition` with event-driven discovery

### Discovery Efficiency

The client does NOT poll or use timers. Strategy:

1. **Event-driven** — `watchPosition` fires only when device detects movement
2. **Client-side dedup** — before any network call, checks if position is within 50m of any existing point in memory
3. **10-second throttle** — safety net to prevent GPS jitter bursts
4. **Optimistic local update** — appends to in-memory array immediately on successful POST
5. **Bounded storage** — ~50m grid spacing means max ~1,600 points for all of central Southampton; typical teams will have 50–200 points

### List View

- Shows ALL challenges openly (names, descriptions, locations)
- Progress bar showing X/Y completed
- Each card shows: name, description, coordinates, "Get me there" Google Maps link
- Team lead sees checkboxes to toggle completion; participants see status dots
- Sorted by `sortOrder`

### Admin/CMS Workflow

- Admins create teams in the Payload admin panel, assigning a user as `teamLead`
- Team leads manage their team from the `/citychallenge` page (add/remove members, mark challenges)
- Locations are managed entirely in Payload CMS by admins

---

## Skipped / Deferred

### Type Generation

- `npm run generate:types` and `npm run generate:graphQLSchema` could not be run because
  project dependencies were not installed in the sandbox environment. The `CityChallengeTeam`
  interface was manually added to `payload-types.ts`. **You should regenerate types** when
  running locally with full dependencies installed:
  ```bash
  npm run generate:types
  npm run generate:graphQLSchema
  ```

### GraphQL Schema

- The generated GraphQL schema file was not updated (same reason as above). Regeneration
  will handle this automatically.

### Build Verification

- `npm run build` could not be run due to missing dependencies. The code follows the same
  patterns as existing working components and should build cleanly once dependencies are
  installed.

---

## Concerns & Notes

### Payload Query for "members contains user.id"

The page uses `?where[members][contains]=userId` to find teams. Payload's `contains`
operator on relationship fields works with MongoDB's `$in` query on arrays of IDs.
This should work correctly with Payload 2 + Mongoose, but worth verifying with a
real test against the database. If it doesn't work as expected, the alternative is
to fetch all teams (there should be few) and filter client-side.

### Race Condition on Discovery

If two team members POST discoveries at exactly the same time, both could pass the
server-side "no existing point within 50m" check and both get appended. This results
in two close-together points rather than data loss. It's benign — the fog-of-war just
gets a slightly redundant extra hole. No locking/transactions needed for this.

### discoveredAreas Growth

The JSON field stores all discovery points for the team. For an event lasting a few
days with ~10 team members walking around, expect 50–200 points (~2–8 KB of JSON).
If teams run much longer or cover huge areas, consider:
- A separate `city-challenge-discoveries` collection with individual documents
- Periodic server-side dedup/cleanup job
- Pagination of the JSON field (unlikely needed for a university society event)

### Team Lead Discovery vs Completion

These are deliberately separate concepts:
- **Discovery** (fog-of-war): any team member walking near a point reveals the map area
- **Completion** (challenge done): only the team lead can tick this off in the list view

This means the team lead doesn't need to physically visit locations — they can mark
challenges complete based on photo proof, teammate reports, etc.

### No Leaderboard Yet

There's no cross-team leaderboard. Each team sees only their own progress. A future
enhancement could show "Team X: 8/15, Team Y: 12/15" — would need a public/aggregate
read endpoint.

### Session Token Passed to Client Components

The JWT token is passed as a prop from the server page to client components for API calls.
This is the same pattern used by booking, elections, and other pages. The token is
already in the `payload-token` cookie accessible to the browser, so this doesn't
introduce new security exposure — it just avoids client components needing to parse cookies.

### Mobile UX

The map view works on mobile but could benefit from:
- Full-screen mode (hiding header/footer)
- Larger touch targets
- Battery-aware geolocation (reduce `enableHighAccuracy` on low battery)
These are stretch goals, not blockers.

---

## Remaining / To Do

### Must-do (before launch)

- [ ] **Regenerate types** — run `npm run generate:types` and `npm run generate:graphQLSchema`
- [ ] **Test team queries** — verify `where[members][contains]` and `where[teamLead][equals]` work correctly with Payload REST API
- [ ] **Test custom endpoints** — verify discover/complete/members endpoints with real JWT auth
- [ ] **Seed test data** — create a test team with locations in the CMS admin

### Nice to have

- [ ] **Cross-team leaderboard** — public view of all teams' completion progress
- [ ] **Team discovery sync** — periodically poll or use SSE to show teammates' new discoveries in real-time (currently only loads on page mount)
- [ ] **Discovery animation** — animate hole punch when a new area is revealed
- [ ] **User position marker** — show pulsing dot at user's current GPS location
- [ ] **Distance indicator** — "Nearest challenge: 120m away"
- [ ] **Sound effect** — subtle audio feedback on discovery
- [ ] **Dark map tiles** — switch to a dark tile provider for better aesthetic
- [ ] **Mobile full-screen** — hide chrome on mobile for immersive map experience
- [ ] **Offline support** — cache tile data for areas with poor mobile signal

# City Challenge — Plan & Overview

## Summary

A new scavenger-hunt page at `/citychallenge` that tracks users' real-world
locations and reveals parts of a map as they get close to hidden treasures
(Minecraft-map-style).

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
  - Registered in `payload.config.ts`; types and GraphQL schema regenerated

### Page / Routing

- **`/citychallenge`** — `src/app/(pages)/citychallenge/page.tsx`
  - Server component
  - Auth guard via `getMeUser()` — redirects unauthenticated users to `/login`
  - Fetches location data via REST API (`/api/city-challenge-locations`) with JWT
  - Passes `isAdmin` flag for the mock-location panel
  - Dynamically imports `CityChallengeMap` with `ssr: false` (Leaflet/window compat)

### Client Map Component

- **`CityChallengeMap`** — `src/app/(pages)/citychallenge/CityChallengeMap/index.tsx`
  - Leaflet map centred on Southampton `[50.935, -1.396]`, zoom 15
  - OpenStreetMap tiles (`{s}.tile.openstreetmap.org`) — same source as Jumpstart
  - Geolocation tracking via `navigator.geolocation.watchPosition()`
  - Haversine distance calculation to each hidden location
  - Location discovered when user is within `discoveryRadius` (default 50m)
  - Discovered IDs persisted in `localStorage` (key: `citychallenge-discovered`)
  - Lime-green pin markers for discovered locations (numbered, rotated square shape)
  - Popups: location name + description (no number prefix)
  - "Discoveries: X / Y" counter in header

### Scratchcard (Fog of War)

- Canvas overlay sits at `z-index: 450` (above Leaflet tiles, below markers)
- Semi-transparent dark fill (`rgba(18, 18, 20, 0.82)`) — map tiles faintly visible
- Subtle grid pattern + `?` marks across the canvas
- "Move around to reveal hidden locations" hint text at bottom
- When a location is discovered, `destination-out` composite operation punches a clear
  80px-radius circular hole through the overlay, revealing full-brightness tiles
- A small lime-green dot marks the centre of each revealed area
- Canvas re-renders on every `moveend` and `zoomend` event (holes track with map
  panning/zooming)

### Admin Testing

- Admin-only mock-location panel (hidden unless `user.roles` includes `admin`)
- Collapsible panel with latitude/longitude text inputs
- "Start Mock" / "Stop Mock" toggle — overrides real geolocation with fake coords
- Allows testing discovery mechanic from any computer

### Security

- **CSP** updated in `csp.js`:
  - `script-src`: added `'unsafe-eval'` (required by Next.js dev-mode webpack)
  - `img-src`: added `data:` (Leaflet placeholder images) and
    `https://*.basemaps.cartocdn.com`, `https://*.cartocdn.com`
  - `connect-src`: added CartoDB CDN entries
  - `https://*.tile.openstreetmap.org` already present for both
- Page-level auth via `getMeUser()` — same pattern as `/elections`, `/booking`, etc.
- Payload collection access: `read: user` (any logged-in member), write restricted to admins

---

## Remaining / To Do

### Map Improvements

- [ ] **Dark map tiles** — switch from OSM light tiles to a dark-themed tile provider
  (CartoDB dark tiles failed due to CSP — need to either get them working or find
  another dark tile provider whose CSP entries work reliably)
- [ ] **User position indicator** — show a pulsing dot or marker at the user's
  current GPS location on the map
- [ ] **Distance indicator** — show remaining distance to nearest undiscovered
  location (e.g. "Nearest clue: 120m away")
- [ ] **Discovery animation** — animate the hole punch (scale from 0 to 80px radius)
  when a location is discovered
- [ ] **Scratchcard texture** — replace the grid + `?` pattern with a more
  interesting visual (hex grid, noise pattern, parchment texture)
- [ ] **Sound effect** — play a subtle sound when a location is discovered
- [ ] **Mini-map / overview** — show thumbnail of discovered vs total area
- [ ] **Zoom to user** — button to re-centre map on user's current position
- [ ] **Performance** — throttle `moveend` canvas redraws; investigate requestAnimationFrame
- [ ] **Offline caching** — cache tile data and discovered state for areas with
  poor mobile signal

### Social / Engagement

- [ ] **Leaderboard** — show who has discovered the most locations
- [ ] **Share progress** — generate a shareable image showing discovered areas
  with a screenshot of the revealed map
- [ ] **Team mode** — allow multiple users to share a single discovery set
  (via join code, similar to booking)

### Content / CMS

- [ ] **Rich description** — support markdown or rich text in location descriptions
- [ ] **Location images** — upload images to each location (revealed on discovery)
- [ ] **Location grouping** — group locations by area, difficulty, or day
- [ ] **Timed events** — locations that are only discoverable during specific
  time windows (e.g. "only during Jumpstart week")

### Mobile

- [ ] **Full-screen map** — hide header/footer on mobile to maximise map area
- [ ] **Touch-friendly UI** — larger tap targets for buttons
- [ ] **Battery optimisation** — reduce watchPosition frequency; offer passive
  mode (manual position update button)
- [ ] **Permission UX** — better onboarding flow explaining why location is needed

### Testing & Deploy

- [ ] **Seed data** — create sample locations in/around Southampton for testing
- [ ] **Manual QA** — walk to real locations on campus with a phone, verify
  discovery accuracy and timing
- [ ] **Edge cases** — device without GPS, permission denied, poor-accuracy
  readings, location services disabled mid-session
- [ ] **Production deployment** — ensure MongoDB collection exists; review CSP;
  verify tiles load behind CDN/proxy

# Jumpstart — Plan & Overview

## Summary

Design, layout, and content-management improvements to the Jumpstart homepage
(`/` when `settings.jumpstartEnabled` is true).

---

## Completed

### Logo

- **CMS-driven logo** — new `jumpstartLogo` upload field in Settings (Jumpstart tab,
  conditionally visible when Jumpstart is enabled)
- Added to GraphQL query: `jumpstartLogo { url alt filename ... }` in
  `src/app/_graphql/globals.ts`
- `JumpstartHero` accepts optional `logo` prop (`{ url, alt }`)
- Falls back to `public/jumpstart/logo.png` if no CMS logo is set
- Removed the old `permanentMarker` font text `<h1>jumpstart</h1>`

### Hero Layout (Desktop)

- Logo positioned **top-left**, enlarged (`max-width: 640px`, `max-height: 130px`)
- Date range positioned **top-right** in `Bungee` graffiti font (28px, neon lime,
  glow text-shadow)
- Row layout with `justify-content: space-between` — both elements share the
  same vertical space
- Stacks vertically (`flex-direction: column`) on small screens

### Hero Spacing

- Reduced padding: top `40→24px`, bottom `60→32px` (desktop)
- Reduced gap between logo and date: `12→6px`
- Overall hero height significantly reduced

### Desktop Width

- All max-width constraints bumped from `1100px` / `1180px` to `1400px`:
  - `Timeline/index.module.scss` — container max-width
  - `MapView/index.module.scss` — container max-width
  - `MapPage.module.scss` — page max-width
- Results in ~27–41% more content width on large screens

### About Sidebar ("What is Jumpstart?")

- **CMS-driven title** — new `jumpstartAboutTitle` text field in Settings
  (default: "WHAT IS JUMPSTART?"), added to GraphQL query
- `AboutSidebar` accepts `title` prop, falls back to default if not set
- `JumpstartTimeline` and `page.tsx` pass the CMS value through
- **Width** — sidebar grid column increased from `220px` to `300px` (desktop),
  `200px` to `220px` (mid-break) — prevents text clipping
- **Height** — reduced padding (`28→20px`), added `align-self: start`,
  removed unnecessary `transform: rotate` — card is now content-height only

### View Toggle (Timeline / Map)

- Complete redesign with graffiti/street-art aesthetic:
  - Asymmetric pill shapes (rounded on one side, sharp on the other)
  - Slight rotation on each button (`-1.5deg` / `+1.5deg`)
  - Spray-paint dot-pattern background (pseudo-element)
  - Active state: neon magenta fill, dark text, `scale(1.05)`, deeper rotation,
    glow `box-shadow`
  - Larger icons (`16→18px`), bolder stroke (`2→2.5`), uppercase labels
- Toggle no longer shifts position when switching between Timeline and Map views
  (removed `padding-top: 40px` from MapPage container)

### Map View Popup

- **Date added** — popup time badge now shows full date+time
  (e.g. "Mon 15th Sep, 14:00 – 16:00") instead of just "14:00"
- Removed sequence number prefix (was "1. 14:00", now just the date/time)
- Uses `formatPopupTime()` helper that handles start/end time ranges

### Security

- **CSP** updated in `csp.js`:
  - `script-src`: added `'unsafe-eval'` (required by Next.js dev-mode webpack)
  - `img-src`: added `data:` and CartoDB CDN entries
  - `connect-src`: added CartoDB CDN entries

### Code Quality

- Removed unused `permanentMarker` import from `JumpstartHero`
- Replaced fragile `as { url, alt }` type casts on `jumpstartLogo` with
  proper `typeof` type guard
- Removed dead `.popupNumber` CSS class from CityChallengeMap module
- Fixed import sort order in CityChallenge page
- All files pass ESLint and Prettier

---

## Remaining / To Do

### Content & CMS

- [ ] **Upload the Jumpstart logo** — an admin must go to Settings → Jumpstart
  and upload the `JumpStartLogo-year-nosplash.png` (or any other logo) to
  activate the CMS-driven logo
- [ ] **Populate `jumpstartAboutTitle`** — set a custom sidebar heading via CMS
- [ ] **Year-specific branding** — consider making the heading/year dynamic
  (e.g. "Jumpstart 2026") via CMS rather than defaulting

### Design

- [ ] **Hero splatter SVG** — the current viewBox/sizing was designed for a
  taller hero; consider adjusting or replacing the splatter gradients for the
  new shorter layout
- [ ] **Map tile theme** — the Jumpstart map uses light OSM tiles on a dark page;
  a dark tile theme (like CartoDB dark) would match the aesthetic better
- [ ] **Mobile responsive polish** — test and tune the hero row→column breakpoint,
  logo sizing, and date font size on various phone screens

### Features

- [ ] **Timeline heading** — the `jumpstartHeading` and `jumpstartSubtitle` are
  fetched but currently hidden via `display: none` in CSS; decide whether to
  show them or remove the dead code
- [ ] **View persistence** — remember last-used view (Timeline vs Map) in
  `localStorage` so it persists across page reloads

### Testing

- [ ] **Browser testing** — verify hero layout on Chrome, Firefox, Safari,
  and mobile browsers
- [ ] **CMS data flow** — test that all Jumpstart Settings fields save, appear
  in GraphQL, and render correctly on the page
- [ ] **Fallback behaviour** — test that the page falls back correctly when
  Jumpstart is disabled, when no logo is uploaded, and when no events exist

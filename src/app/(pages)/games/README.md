# Games

Everything under `/games` — how it fits together, and a checklist for adding a game (with or without a leaderboard).

## Layout

| Path | Purpose |
| --- | --- |
| `src/app/(pages)/games/page.tsx` | The `/games` hub |
| `src/utilities/games/registry.ts` | Game list shown on the hub (`GAMES`, `gamesIn`) |
| `src/app/(pages)/games/<slug>/` | One route folder per game |
| `src/app/(pages)/games/_components/` | Shared UI: `GameCard`, `GameBackLink`, `LeaderboardTable`, `LeaderboardVisibilityToggle` |
| `src/utilities/games/daily.ts` | Europe/London day keys, puzzle numbers, seeded RNG |
| `src/utilities/games/leaderboard.ts` | Shared scoring configs, stats/streak maths, leaderboard rows |
| `src/utilities/games/scoring.ts` | Server-side score validators (`GAME_SCORE_VALIDATORS`) |
| `src/payload/collections/GameScores/` | Generic score storage + `/api/game-scores/{submit,leaderboard}` |
| `src/payload/collections/GamePrefs/` | Per-user, per-game leaderboard visibility (`/api/game-prefs/me`) |

ECSSle is a special case: it keeps its original `wordle-scores` collection and endpoints, but its leaderboard and stats are computed by the same shared module and rendered with the same table as every other game.

## Adding a game

### 1. Register it

```ts
// src/utilities/games/registry.ts
{
  slug: 'my-game',
  title: 'My Game',
  tagline: 'One line for the hub card.',
  href: '/games/my-game',
  section: 'arcade', // or 'daily'
  order: 3,
}
```

### 2. Add the route

Create `src/app/(pages)/games/my-game/`:

- `page.tsx` — server component: `LowImpactHero` + `Gutter` + your client game + `GameBackLink`.
- `MyGame.tsx` — `'use client'` game component (if it needs state/browser APIs).
- `index.module.scss` — colocated styles.

If the game is members-only or records scores, gate the page like ECSSle:

```tsx
const { user, token } = await getMeUser({
  nullUserRedirect: `/login?error=${encodeURIComponent('You must be logged in to play My Game.')}&redirect=${encodeURIComponent('/games/my-game')}`,
})
```

### 3. Optional: a daily puzzle

Daily games use the UK day key so they roll over at midnight UK time and handle British Summer Time:

```ts
import { getDayKey, createSeededRandom, hashString } from '../../../../utilities/games/daily'

const date = getDayKey()                        // "2026-10-22"
const random = createSeededRandom(hashString(`my-game:${date}`))
```

Generate the puzzle on the server (the page is `force-dynamic`) and pass it to the client as a prop, so the server and browser never disagree. Date maths must use day keys, never timestamps.

### 4. Scored game: server validation

Never trust a client-sent score. Add a validator in `src/utilities/games/scoring.ts`; it receives the request data and `now`, rebuilds whatever it needs from **server-owned state**, and returns the score to store:

```ts
'my-game': ({ data, now }) => {
  const submission = data as { value?: unknown }
  const value = Number(submission?.value)

  if (!Number.isFinite(value) || value < 0) {
    return { valid: false, error: 'Invalid score' }
  }

  return {
    valid: true,
    result: {
      date: getDayKey(now),
      score: value,
      metrics: { value },
    },
  }
}
```

The shared submit endpoint (`POST /api/game-scores/submit`) then:

- derives the stored `date` from the validator (never from the client),
- stores one document per `game:user:date` (`entryKey` unique index),
- keeps the **lowest** score seen for that day and reports `{ recorded, improved, score, best }`.

Submit from the client:

```ts
await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/game-scores/submit`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ game: 'my-game', data: { /* game-specific payload */ } }),
})
```

The display name is reused from the player's existing game/ECSSle name, falling back to their profile (`src/payload/utilities/gameScores.ts`).

### 5. Scored game: leaderboard config

Add the table labels and rating formula to `GAME_LEADERBOARD_CONFIGS` in `src/utilities/games/leaderboard.ts`:

```ts
'my-game': {
  slug: 'my-game',
  title: 'My Game',
  leaderboardPath: '/games/my-game/leaderboard',
  labels: { wins: 'Wins', average: 'Avg score', showAccuracy: true },
  computeRating: stats =>
    stats.winRate * 500 +
    Math.log(stats.wins + 1) * 50 +
    stats.currentStreak * 5 +
    stats.maxStreak * 2 -
    stats.average * 30,
},
```

`computeLeaderboard(records, config)` does the rest: games, wins, win rate, current/max streak (London day keys), average, rating, and ranking. The server endpoint also removes players who opted out.

### 6. Leaderboard page

Create `src/app/(pages)/games/my-game/leaderboard/page.tsx` (see `logic-gate-lab/leaderboard/page.tsx`):

```tsx
const config = GAME_LEADERBOARD_CONFIGS['my-game']
// fetch `${NEXT_PUBLIC_SERVER_URL}/api/game-scores/leaderboard?game=my-game`
<LeaderboardVisibilityToggle game="my-game" />
<LeaderboardTable rows={rows} currentUserId={user.id} labels={config.labels} />
```

Keep the leaderboard login-gated with `getMeUser`, and keep the `/me` toggle nearby so the privacy control is discoverable.

### 7. Metadata, robots, sitemap

- Game pages: `title` only, `openGraph: null`, `twitter: null` (no link previews).
- Add public game routes to `src/app/sitemap.ts`; do not list login-gated leaderboards.
- Add `Disallow` rules to `src/app/robots.txt` only if a specific page must not be embedded.

### 8. Share/visibility (built in)

Every player can choose whether to appear on each leaderboard:

- Stored per user, per game in `game-prefs` (`hidden`).
- Their scores are **always recorded**; the leaderboard query filters them out (`getHiddenUserIds`).
- Toggle UI: `LeaderboardVisibilityToggle` on the leaderboard page.
- Endpoint: `GET /api/game-prefs/me?game=<slug>` and `POST /api/game-prefs/me` `{ game, hidden }`.

## Existing games

| Game | Route | Daily | Login | Scores |
| --- | --- | --- | --- | --- |
| ECSSle | `/games/wordle` | Yes | Yes | `wordle-scores` (legacy, shared leaderboard maths) |
| Logic Gate Lab | `/games/logic-gate-lab` | Yes | Yes | `game-scores`, validated circuit |
| Base Blitz | `/games/base-blitz` | No | No | local best score only |

## Validation

```bash
npm run lint
npm run prettier
npx tsc --noEmit
```

If you add or change a Payload collection, also run:

```bash
npm run generate:types
npm run generate:graphQLSchema
```

New `game-scores`/`game-prefs` indexes (`entryKey` unique, `game`, `user`, `date`) are created automatically by the Mongoose adapter (`autoIndex: true`). No data migration is needed for new games — only `wordle-scores` is legacy.

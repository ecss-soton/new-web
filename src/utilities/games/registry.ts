/**
 * Single source of truth for the /games hub.
 *
 * Games are code features, not CMS content, so the list lives in the repository:
 * adding a game means adding a route under `src/app/(pages)/games/<slug>` and an
 * entry here. Keep `href` in sync with the route and `slug` lowercase/kebab-case.
 */

export type GameSection = 'daily' | 'arcade'

export interface GameDefinition {
  /** Route segment under /games. */
  slug: string
  title: string
  tagline: string
  /** Absolute in-app URL, e.g. `/games/wordle`. */
  href: string
  section: GameSection
  /** Ascending display order within a section. */
  order: number
}

export const GAMES: GameDefinition[] = [
  {
    slug: 'wordle',
    title: 'ECSSle',
    tagline: 'Six guesses, one daily tech word.',
    href: '/games/wordle',
    section: 'daily',
    order: 1,
  },
  {
    slug: 'logic-gate-lab',
    title: 'Logic Gate Lab',
    tagline: 'Build a circuit to match today’s truth table.',
    href: '/games/logic-gate-lab',
    section: 'daily',
    order: 2,
  },
  {
    slug: 'base-blitz',
    title: 'Base Blitz',
    tagline: 'Binary, decimal, hex — sixty seconds.',
    href: '/games/base-blitz',
    section: 'arcade',
    order: 1,
  },
]

const byOrder = (a: GameDefinition, b: GameDefinition): number => a.order - b.order

export const gamesIn = (section: GameSection): GameDefinition[] =>
  GAMES.filter(game => game.section === section).sort(byOrder)

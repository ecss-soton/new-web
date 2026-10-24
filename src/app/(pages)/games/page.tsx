import React from 'react'
import { Metadata } from 'next'

import { getDisabledGames } from '../../../utilities/games/availability'
import type {
  GameDefinition,
  GameSection as GameSectionKind,
} from '../../../utilities/games/registry'
import { gamesIn } from '../../../utilities/games/registry'
import { Gutter } from '../../_components/Gutter'
import { LowImpactHero } from '../../_heros/LowImpact'
import { bungee } from '../../_utilities/font'
import { mergeOpenGraph } from '../../_utilities/mergeOpenGraph'
import { GameCard } from './_components/GameCard'

import classes from './index.module.scss'

export const dynamic = 'force-dynamic'

const GameSection: React.FC<{ heading: string; games: GameDefinition[] }> = ({
  heading,
  games,
}) => {
  if (games.length === 0) return null

  return (
    <section className={classes.section}>
      <h2 className={[classes.heading, bungee.className].join(' ')}>{heading}</h2>
      <div className={classes.grid}>
        {games.map(game => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>
    </section>
  )
}

export default async function GamesPage() {
  const disabled = await getDisabledGames()
  const available = (section: GameSectionKind): GameDefinition[] =>
    gamesIn(section).filter(game => !disabled.has(game.slug))

  return (
    <>
      <LowImpactHero title="Games" type="lowImpact" />
      <Gutter>
        <div className={classes.wrapper}>
          <GameSection heading="Daily" games={available('daily')} />
          <GameSection heading="Quick play" games={available('arcade')} />
        </div>
      </Gutter>
    </>
  )
}

export const metadata: Metadata = {
  title: 'Games',
  description: 'Daily puzzles and quick games from the Electronics and Computer Science Society.',
  openGraph: mergeOpenGraph({
    title: 'Games',
    url: '/games',
  }),
  twitter: null,
}

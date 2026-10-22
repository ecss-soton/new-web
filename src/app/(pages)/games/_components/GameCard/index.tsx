import React from 'react'
import Link from 'next/link'

import type { GameDefinition } from '../../../../../utilities/games/registry'
import { bungee } from '../../../../_utilities/font'

import classes from './index.module.scss'

export const GameCard: React.FC<{ game: GameDefinition }> = ({ game }) => (
  <Link href={game.href} className={classes.card}>
    <span className={[classes.title, bungee.className].join(' ')}>{game.title}</span>
    <span className={classes.tagline}>{game.tagline}</span>
  </Link>
)

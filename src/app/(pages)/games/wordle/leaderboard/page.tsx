import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'

import type { LeaderboardRow } from '../../../../../utilities/games/leaderboard'
import { GAME_LEADERBOARD_CONFIGS } from '../../../../../utilities/games/leaderboard'
import { Gutter } from '../../../../_components/Gutter'
import { LowImpactHero } from '../../../../_heros/LowImpact'
import { getMeUser } from '../../../../_utilities/getMeUser'
import { LeaderboardTable } from '../../_components/LeaderboardTable'
import { LeaderboardVisibilityToggle } from '../../_components/LeaderboardVisibilityToggle'

import classes from './index.module.scss'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const config = GAME_LEADERBOARD_CONFIGS.wordle

export default async function LeaderboardPage() {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to view the leaderboard.',
    )}&redirect=${encodeURIComponent('/games/wordle/leaderboard')}`,
  })

  let leaderboard: LeaderboardRow[] = []

  try {
    const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/wordle-scores/leaderboard`, {
      headers: { Authorization: `JWT ${token}` },
      // Leaderboards must never be served from Next's data cache.
      cache: 'no-store',
    })
    const json = await req.json()
    leaderboard = json.leaderboard || []
  } catch (err) {
    console.warn('Failed to fetch leaderboard:', err) // eslint-disable-line no-console
  }

  return (
    <>
      <LowImpactHero title="ECSSle Leaderboard" type="lowImpact" />
      <Gutter>
        <div className={classes.leaderboardWrapper}>
          <LeaderboardVisibilityToggle game="wordle" />
          <LeaderboardTable rows={leaderboard} currentUserId={user.id} labels={config.labels} />
          <div className={classes.backLinks}>
            <Link href="/games/wordle" className={classes.backLink}>
              &larr; Back to ECSSle
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/games" className={classes.backLink}>
              All games
            </Link>
          </div>
        </div>
      </Gutter>
    </>
  )
}

export const metadata: Metadata = {
  title: 'ECSSle Leaderboard',
  openGraph: null,
  twitter: null,
}

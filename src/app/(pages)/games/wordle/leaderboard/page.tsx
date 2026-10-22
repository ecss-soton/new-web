import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'

import { Gutter } from '../../../../_components/Gutter'
import { LowImpactHero } from '../../../../_heros/LowImpact'
import { getMeUser } from '../../../../_utilities/getMeUser'
import { type LeaderboardEntry, LeaderboardTable } from './LeaderboardTable'

import classes from './index.module.scss'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to view the leaderboard.',
    )}&redirect=${encodeURIComponent('/games/wordle/leaderboard')}`,
  })

  let leaderboard: LeaderboardEntry[] = []

  try {
    const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/wordle-scores/leaderboard`, {
      headers: { Authorization: `JWT ${token}` },
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
          <LeaderboardTable data={leaderboard} currentUserId={user.id} />
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

import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'

import { Gutter } from '../../../_components/Gutter'
import { LowImpactHero } from '../../../_heros/LowImpact'
import { getMeUser } from '../../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../../_utilities/mergeOpenGraph'
import { LeaderboardTable, type LeaderboardEntry } from './LeaderboardTable'

import classes from './index.module.scss'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to view the leaderboard.',
    )}&redirect=${encodeURIComponent('/wordle/leaderboard')}`,
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
          <Link href="/wordle" className={classes.backLink}>
            &larr; Back to ECSSle
          </Link>
        </div>
      </Gutter>
    </>
  )
}

export const metadata: Metadata = {
  title: 'ECSSle Leaderboard',
  description: 'See how you rank against other ECSSle players.',
  openGraph: mergeOpenGraph({
    title: 'ECSSle Leaderboard',
    url: '/wordle/leaderboard',
  }),
}

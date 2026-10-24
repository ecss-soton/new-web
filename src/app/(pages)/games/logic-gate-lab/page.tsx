import React from 'react'
import { Metadata } from 'next'

import { createDailyPuzzle } from '../../../../utilities/games/logicGate/puzzle'
import { Gutter } from '../../../_components/Gutter'
import { LowImpactHero } from '../../../_heros/LowImpact'
import { inter } from '../../../_utilities/font'
import { getMeUser } from '../../../_utilities/getMeUser'
import { GameBackLink } from '../_components/GameBackLink'
import { LeaderboardVisibilityToggle } from '../_components/LeaderboardVisibilityToggle'
import { LogicGateLab } from './LogicGateLab'

import classes from './index.module.scss'

// The puzzle is seeded from today's date, so it must be generated per request
// rather than baked into a static build.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function LogicGateLabPage() {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to play Logic Gate Lab.',
    )}&redirect=${encodeURIComponent('/games/logic-gate-lab')}`,
  })

  const puzzle = createDailyPuzzle()

  let todayScore: number | null = null

  try {
    const todayReq = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/game-scores?where[game][equals]=logic-gate-lab&where[user][equals]=${user.id}&where[date][equals]=${puzzle.date}&limit=1&depth=0`,
      {
        headers: { Authorization: `JWT ${token}` },
        // Always reflect the latest recorded score, not a cached page fetch.
        cache: 'no-store',
      },
    )
    const { docs } = await todayReq.json()
    const score = docs?.[0]?.score
    if (typeof score === 'number') todayScore = score
  } catch (err) {
    console.warn('Failed to fetch today’s Logic Gate Lab score:', err) // eslint-disable-line no-console
  }

  return (
    <>
      <LowImpactHero title="Logic Gate Lab" type="lowImpact" />
      <Gutter>
        <div className={[classes.page, inter.className].join(' ')}>
          <LogicGateLab puzzle={puzzle} todayScore={todayScore} />
          <LeaderboardVisibilityToggle game="logic-gate-lab" />
          <GameBackLink />
        </div>
      </Gutter>
    </>
  )
}

export const metadata: Metadata = {
  title: 'Logic Gate Lab',
  openGraph: null,
  twitter: null,
}

import React from 'react'
import { Metadata } from 'next'

import { Gutter } from '../../../_components/Gutter'
import { LowImpactHero } from '../../../_heros/LowImpact'
import { inter } from '../../../_utilities/font'
import { GameBackLink } from '../_components/GameBackLink'
import { LogicGateLab } from './LogicGateLab'
import { createDailyPuzzle } from './puzzle'

import classes from './index.module.scss'

// The puzzle is seeded from today's date, so it must be generated per request
// rather than baked into a static build.
export const dynamic = 'force-dynamic'

export default function LogicGateLabPage() {
  const puzzle = createDailyPuzzle()

  return (
    <>
      <LowImpactHero title="Logic Gate Lab" type="lowImpact" />
      <Gutter>
        <div className={[classes.page, inter.className].join(' ')}>
          <LogicGateLab puzzle={puzzle} />
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

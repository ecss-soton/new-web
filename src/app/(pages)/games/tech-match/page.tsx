import React from 'react'
import { Metadata } from 'next'

import { Gutter } from '../../../_components/Gutter'
import { LowImpactHero } from '../../../_heros/LowImpact'
import { inter } from '../../../_utilities/font'
import { GameBackLink } from '../_components/GameBackLink'
import { TechMatch } from './TechMatch'

import classes from './index.module.scss'

export default function TechMatchPage() {
  return (
    <>
      <LowImpactHero title="Tech Match" type="lowImpact" />
      <Gutter>
        <div className={[classes.page, inter.className].join(' ')}>
          <TechMatch />
          <GameBackLink />
        </div>
      </Gutter>
    </>
  )
}

export const metadata: Metadata = {
  title: 'Tech Match',
  openGraph: null,
  twitter: null,
}

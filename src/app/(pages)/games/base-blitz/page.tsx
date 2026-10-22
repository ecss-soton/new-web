import React from 'react'
import { Metadata } from 'next'

import { Gutter } from '../../../_components/Gutter'
import { LowImpactHero } from '../../../_heros/LowImpact'
import { inter } from '../../../_utilities/font'
import { GameBackLink } from '../_components/GameBackLink'
import { BaseBlitz } from './BaseBlitz'

import classes from './index.module.scss'

export default function BaseBlitzPage() {
  return (
    <>
      <LowImpactHero title="Base Blitz" type="lowImpact" />
      <Gutter>
        <div className={[classes.page, inter.className].join(' ')}>
          <BaseBlitz />
          <GameBackLink />
        </div>
      </Gutter>
    </>
  )
}

export const metadata: Metadata = {
  title: 'Base Blitz',
  openGraph: null,
  twitter: null,
}

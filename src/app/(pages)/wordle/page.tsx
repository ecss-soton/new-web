import React from 'react'
import { Metadata } from 'next'
import { Gutter } from '../../_components/Gutter'
import { LowImpactHero } from '../../_heros/LowImpact'
import { mergeOpenGraph } from '../../_utilities/mergeOpenGraph'
import { WordleGame } from './WordleGame'

export default async function WordlePage() {
  return (
    <>
      <LowImpactHero title="Wordle" type="lowImpact" />
      <Gutter>
        <WordleGame />
      </Gutter>
    </>
  )
}

export const metadata: Metadata = {
  title: 'Wordle',
  description: 'Play our custom Wordle game!',
  openGraph: mergeOpenGraph({
    title: 'Wordle',
    url: '/wordle',
  }),
}

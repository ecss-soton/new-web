import React from 'react'
import { Metadata } from 'next'

import { Gutter } from '../../_components/Gutter'
import { LowImpactHero } from '../../_heros/LowImpact'
import { getMeUser } from '../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../_utilities/mergeOpenGraph'
import { getDailyWord, getPuzzleNumber, getTodayDate } from './techWords'
import { WordleGame } from './WordleGame'

export default async function WordlePage() {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to play ECSSle.',
    )}&redirect=${encodeURIComponent('/wordle')}`,
  })

  let dailyWord = getDailyWord()
  const todayDate = getTodayDate()
  const puzzleNumber = getPuzzleNumber()

  try {
    const overrideReq = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/wordle-overrides?where[date][equals]=${todayDate}&depth=0`,
      {
        headers: { Authorization: `JWT ${token}` },
      },
    )
    const { docs: overrideDocs } = await overrideReq.json()
    if (overrideDocs && overrideDocs.length > 0) {
      dailyWord = overrideDocs[0].word.toUpperCase()
    }
  } catch (err) {
    console.warn('Failed to fetch word override:', err) // eslint-disable-line no-console
  }

  let todayScore = null
  let existingDisplayName = null

  try {
    const todayReq = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/wordle-scores?where[user][equals]=${user.id}&where[date][equals]=${todayDate}&depth=0`,
      {
        headers: { Authorization: `JWT ${token}` },
      },
    )
    const { docs: todayDocs } = await todayReq.json()
    if (todayDocs && todayDocs.length > 0) {
      todayScore = todayDocs[0]
      existingDisplayName = todayScore.displayName
    }
  } catch (err) {
    console.warn('Failed to fetch today score:', err) // eslint-disable-line no-console
  }

  if (!existingDisplayName) {
    try {
      const nameReq = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/wordle-scores?where[user][equals]=${user.id}&sort=-createdAt&limit=1&depth=0`,
        {
          headers: { Authorization: `JWT ${token}` },
        },
      )
      const { docs: nameDocs } = await nameReq.json()
      if (nameDocs && nameDocs.length > 0) {
        existingDisplayName = nameDocs[0].displayName
      }
    } catch (err) {
      console.warn('Failed to fetch display name:', err) // eslint-disable-line no-console
    }
  }

  return (
    <>
      <LowImpactHero title="ECSSle" type="lowImpact" />
      <Gutter>
        <WordleGame
          user={user}
          solution={dailyWord}
          todayDate={todayDate}
          puzzleNumber={puzzleNumber}
          todayScore={todayScore}
          existingDisplayName={existingDisplayName}
        />
      </Gutter>
    </>
  )
}

export const metadata: Metadata = {
  title: 'ECSSle',
  description: 'A daily tech-themed word puzzle for ECSS members.',
  openGraph: mergeOpenGraph({
    title: 'ECSSle',
    url: '/wordle',
  }),
}

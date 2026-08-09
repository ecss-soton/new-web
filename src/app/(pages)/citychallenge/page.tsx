import React from 'react'
import { Metadata } from 'next'
import nextDynamic from 'next/dynamic'

import type { CityChallengeLocation } from '../../../payload/payload-types'
import { getMeUser } from '../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../_utilities/mergeOpenGraph'

import wrapperClasses from '../../_components/Jumpstart/pageWrapper.module.scss'

const CityChallengeMap = nextDynamic(
  () => import('./CityChallengeMap').then(mod => mod.CityChallengeMap),
  { ssr: false },
)

export default async function CityChallengePage() {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to access the City Challenge.',
    )}&redirect=${encodeURIComponent('/citychallenge')}`,
  })

  const isAdmin = user?.roles?.includes('admin') ?? false

  let locations: CityChallengeLocation[] = []

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/city-challenge-locations?limit=100`,
      {
        headers: {
          Authorization: `JWT ${token}`,
        },
      },
    )

    if (res.ok) {
      const json = await res.json()
      locations = (json as { docs: CityChallengeLocation[] }).docs ?? []
    }
  } catch (err) {
    console.warn(err) // eslint-disable-line no-console
  }

  return (
    <div className={wrapperClasses.page}>
      <CityChallengeMap locations={locations} isAdmin={isAdmin} />
    </div>
  )
}

export const metadata: Metadata = {
  title: 'City Challenge',
  description: 'Discover hidden locations around Southampton in our scavenger hunt.',
  openGraph: mergeOpenGraph({
    title: 'City Challenge',
    url: '/citychallenge',
  }),
}

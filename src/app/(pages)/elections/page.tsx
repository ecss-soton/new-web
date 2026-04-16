import React from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import qs from 'qs'

import { Election, Position } from '../../../payload/payload-types'
import { Gutter } from '../../_components/Gutter'
import { LowImpactHero } from '../../_heros/LowImpact'
import { getMeUser } from '../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../_utilities/mergeOpenGraph'
import { ElectionCard } from './ElectionCard'

import classes from './index.module.scss'

export default async function Elections() {
  const { user, token } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to access your account.',
    )}&redirect=${encodeURIComponent('/elections')}`,
  })

  let elections: (Omit<Election, 'positions'> & { positions: Position[] })[] | null = null

  const searchQuery = qs.stringify(
    {
      depth: 2,
      sort: '-nominationStart',
    },
    { encode: false },
  )

  try {
    const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/elections?${searchQuery}`, {
      headers: {
        Authorization: `JWT ${token}`,
      },
    })

    const json = await req.json()

    const { docs } = json as { docs: (Election & { positions: Position[] })[] }

    elections = docs
  } catch (err) {
    console.warn(err) // eslint-disable-line no-console
  }

  if (!elections) {
    notFound()
  }

  return (
    <>
      <LowImpactHero title="Elections" type="lowImpact" />
      <Gutter className={classes.logout}>
        {elections.map((election, index) => (
          <ElectionCard key={election.id} election={election} user={user} />
        ))}
      </Gutter>
    </>
  )
}

export const metadata: Metadata = {
  title: 'Elections',
  description: 'An overview of all upcoming and current elections',
  openGraph: mergeOpenGraph({
    title: 'Elections',
    url: '/elections',
  }),
}

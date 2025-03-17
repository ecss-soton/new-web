import React, { Fragment } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import qs from 'qs'

import { Election, Position } from '../../../../payload/payload-types'
import { getMeUser } from '../../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../../_utilities/mergeOpenGraph'
import { NominationPage } from './NominationPage'

export default async function Nomination({ params: { electionId: nominationId } }) {
  const { user } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to view a nomination.',
    )}&redirect=${encodeURIComponent(`/nominations/${nominationId}`)}`,
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
    const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/elections?${searchQuery}`)

    const json = await req.json()

    const { docs } = json as { docs: (Election & { positions: Position[] })[] }

    elections = docs
  } catch (err) {
    console.warn(err) // eslint-disable-line no-console
  }

  if (!elections) {
    notFound()
  }

  const isBeingVoted = elections.some(
    election =>
      new Date().getTime() >= Date.parse(election.votingStart) &&
      new Date().getTime() <= Date.parse(election.votingEnd),
  )

  return (
    <Fragment>
      <NominationPage nominationId={nominationId} user={user} isBeingVoted={isBeingVoted} />
    </Fragment>
  )
}

export const metadata: Metadata = {
  title: 'Nomination',
  description: 'View a nomination.',
  openGraph: mergeOpenGraph({
    title: 'Nomination',
    url: '/nominations/[nominationId]',
  }),
}

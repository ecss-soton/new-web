import React, { Fragment } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import qs from 'qs'

import { Election, Position } from '../../../payload/payload-types'
import { fetchSettings } from '../../_api/fetchGlobals'
import { Gutter } from '../../_components/Gutter'
import { CMSLink } from '../../_components/Link'
import { Positions } from '../../_components/Positions'
import { getMeUser } from '../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../_utilities/mergeOpenGraph'

import classes from './index.module.scss'

function formatDate(dateString: string) {
  const date = new Date(Date.parse(dateString))
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(date)
}

export default async function Elections() {
  const { user } = await getMeUser({
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

  return (
    <Gutter className={classes.logout}>
      {elections.map((election, index) => {
        const { id, name, nominationStart, nominationEnd, votingStart, votingEnd, positions } =
          election
        const now = new Date().getTime()
        const canCreateNomination =
          now >= Date.parse(nominationStart) && now <= Date.parse(nominationEnd)
        return (
          <Fragment key={id}>
            <h1>{name}</h1>
            <p>
              Nomination start: {formatDate(nominationStart)}
              <br />
              Nomination end: {formatDate(nominationEnd)}
              <br />
              Voting start: {formatDate(votingStart)}
              <br />
              Voting end: {formatDate(votingEnd)}
            </p>
            <Positions
              positions={positions}
              election={election}
              canCreateNominations={canCreateNomination}
              user={user}
            />
          </Fragment>
        )
      })}
    </Gutter>
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

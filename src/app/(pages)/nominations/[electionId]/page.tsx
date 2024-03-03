import React, { Fragment } from 'react'
import { Metadata } from 'next'

import { getMeUser } from '../../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../../_utilities/mergeOpenGraph'
import { NominationPage } from './NominationPage'

export default async function Nomination({ params: { electionId: nominationId } }) {
  const { user } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to view a nomination.',
    )}&redirect=${encodeURIComponent(`/nominations/${nominationId}`)}`,
  })

  return (
    <Fragment>
      <NominationPage nominationId={nominationId} user={user} />
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

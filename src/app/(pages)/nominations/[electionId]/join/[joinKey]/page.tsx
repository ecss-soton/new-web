import React from 'react'
import { Metadata } from 'next'

import { Gutter } from '../../../../../_components/Gutter'
import { getMeUser } from '../../../../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../../../../_utilities/mergeOpenGraph'
import { JoinNominationForm } from './JoinNominationForm'

import classes from './index.module.scss'

export default async function JoinNomination({
  params: { electionId: nominationId, joinKey },
}: {
  params: { electionId: string; joinKey: string }
}) {
  const { user } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to join a nomination.',
    )}&redirect=${encodeURIComponent(`/nominations/${nominationId}/join/${joinKey}`)}`,
  })

  return (
    <Gutter className={classes.recoverPassword}>
      <JoinNominationForm nominationId={nominationId} joinKey={joinKey} />
    </Gutter>
  )
}

export const metadata: Metadata = {
  title: 'Join Nomination',
  description: 'Join a joint nomination ticket.',
  openGraph: mergeOpenGraph({
    title: 'Join Nomination',
    url: '/nominations',
  }),
}

import React from 'react'
import { Metadata } from 'next'

import { Gutter } from '../../../../../_components/Gutter'
import { getMeUser } from '../../../../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../../../../_utilities/mergeOpenGraph'
import { JoinNominationForm } from './JoinNominationForm'

import classes from './index.module.scss'

export default async function JoinNomination({ params: { electionId: nominationId, joinKey } }) {
  const { user } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to access your account.',
    )}&redirect=${encodeURIComponent(`/nominations/${nominationId}/join/${joinKey}`)}`,
  })

  return (
    <Gutter className={classes.recoverPassword}>
      <JoinNominationForm nominationId={nominationId} joinKey={joinKey} />
    </Gutter>
  )
}

export const metadata: Metadata = {
  title: 'Recover Password',
  description: 'Enter your email address to recover your password.',
  openGraph: mergeOpenGraph({
    title: 'Recover Password',
    url: '/recover-password',
  }),
}

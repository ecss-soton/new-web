import React, { Fragment } from 'react'
import { Metadata } from 'next'
import Link from 'next/link'

import { fetchComments } from '../../../../_api/fetchComments'
import { Button } from '../../../../_components/Button'
import { Gutter } from '../../../../_components/Gutter'
import { HR } from '../../../../_components/HR'
import { RenderParams } from '../../../../_components/RenderParams'
import { LowImpactHero } from '../../../../_heros/LowImpact'
import { formatDateTime } from '../../../../_utilities/formatDateTime'
import { getMeUser } from '../../../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../../../_utilities/mergeOpenGraph'
import NominationForm from './NominationForm'

import classes from './index.module.scss'

export default async function CreateNomination({ params: { electionId, positionId } }) {
  const { user } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to create a nomination.',
    )}&redirect=${encodeURIComponent(`/nominations/${electionId}/${positionId}`)}`,
  })

  return (
    <Fragment>
      <Gutter className={classes.account}>
        <NominationForm electionId={electionId} positionId={positionId} />
      </Gutter>
    </Fragment>
  )
}

export const metadata: Metadata = {
  title: 'Account',
  description: 'Create an account or log in to your existing account.',
  openGraph: mergeOpenGraph({
    title: 'Account',
    url: '/account',
  }),
}

import React, { Fragment } from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import qs from 'qs'

import nominations from '../../../../payload/collections/Nominations'
import { Nomination, Position, User } from '../../../../payload/payload-types'
import { fetchComments } from '../../../_api/fetchComments'
import { Button } from '../../../_components/Button'
import { Gutter } from '../../../_components/Gutter'
import { HR } from '../../../_components/HR'
import { Media } from '../../../_components/Media'
import { Image } from '../../../_components/Media/Image'
import { RenderParams } from '../../../_components/RenderParams'
import { LowImpactHero } from '../../../_heros/LowImpact'
import { formatDateTime } from '../../../_utilities/formatDateTime'
import { getMeUser } from '../../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../../_utilities/mergeOpenGraph'
import AccountForm from '../../account/AccountForm'

import classes from './index.module.scss'

export default async function Nomination({ params: { electionId: nominationId } }) {
  const { user } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to access your account.',
    )}&redirect=${encodeURIComponent(`/nominations/${nominationId}`)}`,
  })

  let nomination: Nomination | null = null

  try {
    const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/nominations/${nominationId}`)

    const json = await req.json()

    nomination = json as Nomination
  } catch (err) {
    console.warn(err) // eslint-disable-line no-console
  }

  if (!nomination) {
    notFound()
  }

  const names = nomination.populatedNominees.map(n => n.name).join(' & ')
  const position = nomination.position as Position
  const isMyNomination = nomination.populatedNominees.some(p => p.id === user.id)
  const droppedOut = nomination.droppedOut

  return (
    <Fragment>
      <Gutter>
        <h3>
          {droppedOut && <s>{nomination.nickname ?? names}</s>}
          {!droppedOut && <span>{nomination.nickname ?? names}</span>}
        </h3>
        {nomination.populatedNominees.map(n => {
          const email = `${n.username}@soton.ac.uk`
          return (
            <Fragment key={n.id}>
              {' '}
              <Link href={`mailto:${email}`}>{n.name}</Link>{' '}
            </Fragment>
          )
        })}
        <h4>Running for {position.name}</h4>
        {isMyNomination && (
          <Button
            href={`/nominations/${nominationId}/edit`}
            appearance="primary"
            label={'Edit Nomination'}
          ></Button>
        )}
        <Media resource={nomination.image} imgClassName={classes.image} />
        <p>{nomination.manifesto}</p>
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

'use client'
import React, { Fragment, Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Nomination, Position, Settings, User } from '../../../../../payload/payload-types'
import { Button } from '../../../../_components/Button'
import { Gutter } from '../../../../_components/Gutter'
import { Media } from '../../../../_components/Media'

import classes from './index.module.scss'

export const NominationPage: React.FC<{
  nominationId?: string
  user?: User
}> = props => {
  const { nominationId, user } = props
  const [nomination, setNomination] = useState<Nomination | null>(null)

  useEffect(() => {
    const asyncEffect = async () => {
      try {
        const req = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/nominations/${nominationId}`,
        )

        const json = await req.json()

        setNomination(json as Nomination)
      } catch (err) {
        console.warn(err) // eslint-disable-line no-console
        notFound()
      }
    }

    asyncEffect()
  }, [nominationId])

  if (nomination === null) {
    return <Fragment>Loading...</Fragment>
  }

  const names = nomination.populatedNominees.map(n => n.name).join(' & ')
  const position = nomination.position as Position
  const isMyNomination = nomination.populatedNominees.some(p => p.id === user.id)
  const droppedOut = nomination.droppedOut

  return (
    <Fragment>
      <Gutter>
        <Button href={`/elections`} appearance="primary" label={'Back'} />
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
          />
        )}
        <Suspense fallback={<Fragment>Loading...</Fragment>}>
          <Media resource={nomination.image} imgClassName={classes.image} />
        </Suspense>
        <span className={classes.manifesto}>{nomination.manifesto}</span>
      </Gutter>
    </Fragment>
  )
}

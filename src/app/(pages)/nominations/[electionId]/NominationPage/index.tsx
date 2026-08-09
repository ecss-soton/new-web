'use client'
import React, { Fragment, Suspense, useEffect, useState } from 'react'

import { Nomination, Position, User } from '../../../../../payload/payload-types'
import { Button } from '../../../../_components/Button'
import { Gutter } from '../../../../_components/Gutter'
import { Media } from '../../../../_components/Media'

import classes from './index.module.scss'

export const NominationPage: React.FC<{
  nominationId?: string
  user?: User
  isBeingVoted?: Boolean
}> = props => {
  const { nominationId, user, isBeingVoted } = props
  const [nomination, setNomination] = useState<Nomination | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const asyncEffect = async () => {
      try {
        const req = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/nominations/${nominationId}`,
        )

        if (!req.ok) {
          throw new Error('Nomination not found')
        }

        const json = await req.json()

        setNomination(json as Nomination)
      } catch {
        setError('This nomination could not be loaded.')
      }
    }

    asyncEffect()
  }, [nominationId])

  if (nomination === null) {
    if (error) {
      return <Fragment>{error}</Fragment>
    }
    return <Fragment>Loading...</Fragment>
  }

  const names = nomination.populatedNominees.map(n => n.name).join(' & ')
  const position = nomination.position as Position
  const isMyNomination = nomination.populatedNominees.some(p => p.id === user?.id)
  const droppedOut = nomination.droppedOut

  return (
    <Fragment>
      <Gutter>
        {isMyNomination || isBeingVoted ? (
          <>
            <Button href={`/elections`} appearance="primary" label={'Back'} />
            <h3>
              {droppedOut && <s>{nomination.nickname ?? names}</s>}
              {!droppedOut && <span>{nomination.nickname ?? names}</span>}
            </h3>

            {/* {nomination.populatedNominees.map(n => {
          const email = `${n.username}@soton.ac.uk`
          return (
            <Fragment key={n.id}>
              {' '}
              <Link href={`mailto:${email}`}>{n.name}</Link>{' '}
            </Fragment>
          )
        })} */}
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
          </>
        ) : (
          <span> Error: This user does not have acess to this nomination page</span>
        )}
        {/* <span>{nomination.id} hello</span>
        {user && <span> {user.id}</span>}
        {!user && <span>wompwomp</span>} */}
      </Gutter>
    </Fragment>
  )
}

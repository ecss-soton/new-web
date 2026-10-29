'use client'
import React, { Fragment } from 'react'

import { Election, Position, User } from '../../../payload/payload-types'
import { Button } from '../Button'
import { Nominations } from '../Nominations'
import { VotingButton } from '../VotingButton'

/**
 * Nomination/voting UI for elections that have not finished. Finished elections
 * use `ElectionOutcome` instead, which shows only position + winner (and the
 * optional detailed result).
 */
export const Positions: React.FC<{
  positions?: Position[]
  election?: Election
  canCreateNominations?: boolean
  user?: User
}> = props => {
  const { user, positions, election, canCreateNominations } = props

  const orderedPositions = [...(positions ?? [])].sort(
    (first, second) => first.importance - second.importance,
  )
  const isBeingVoted =
    new Date().getTime() >= Date.parse(election.votingStart) &&
    new Date().getTime() <= Date.parse(election.votingEnd)

  return (
    <div>
      {orderedPositions.map(position => {
        const { name, description } = position

        return (
          <Fragment key={name}>
            <h3>{name}</h3>
            <em>
              {description}
              <br />
            </em>
            {canCreateNominations && (
              <Button
                href={`/nominations/${election.id}/${position.id}`}
                appearance="primary"
                label={'Create Nomination'}
              ></Button>
            )}
            {isBeingVoted && (
              <VotingButton label={'Vote'} position={position} election={election} />
            )}
            <Nominations
              positionId={position.id}
              election={election}
              user={user}
              showSupport={canCreateNominations}
              isBeingVoted={isBeingVoted}
            />
          </Fragment>
        )
      })}
    </div>
  )
}

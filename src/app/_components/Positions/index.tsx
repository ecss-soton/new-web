'use client'
import React, { Fragment } from 'react'

import {
  Election,
  Media,
  Nomination,
  Position,
  Sponsor,
  User,
} from '../../../payload/payload-types'
import { Button } from '../Button'
import { ElectionResults } from '../ElectionResults'
import { Nominations } from '../Nominations'
import { VotingButton } from '../VotingButton'

export const Positions: React.FC<{
  positions?: Position[]
  election?: Election
  canCreateNominations?: boolean
  user?: User
}> = props => {
  const { user, positions, election, canCreateNominations } = props

  // const { slug, title, categories, meta } = doc || {}
  // const { description, image: metaImage } = meta || {}

  // const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  // const titleToUse = titleFromProps || title
  // const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  // const href = `/${relationTo}/${slug}`
  positions?.sort((p1, p2) => p1.importance - p2.importance)
  const hasPassedVoting = new Date().getTime() > Date.parse(election.votingEnd)
  const isBeingVoted =
    new Date().getTime() >= Date.parse(election.votingStart) &&
    new Date().getTime() <= Date.parse(election.votingEnd)

  return (
    <div>
      {positions?.map((position, index) => {
        const { name, description } = position

        return (
          <Fragment key={name}>
            <h3>{name}</h3>
            <p>{description}</p>
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
            {!hasPassedVoting && (
              <Nominations
                positionId={position.id}
                election={election}
                user={user}
                showSupport={canCreateNominations}
                isBeingVoted={isBeingVoted}
              />
            )}
            {hasPassedVoting && (
              <ElectionResults election={election} positionId={position.id} user={user} />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

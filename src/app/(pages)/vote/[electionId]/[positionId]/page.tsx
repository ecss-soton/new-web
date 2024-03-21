import React, { Fragment, Suspense } from 'react'
import { Metadata } from 'next'

import { getMeUser } from '../../../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../../../_utilities/mergeOpenGraph'
import { Position } from '../../../../../payload/payload-types'
import { Gutter } from '../../../../_components/Gutter'
import Link from 'next/link'
import { Button } from '../../../../_components/Button'
import { Media } from '../../../../_components/Media'
import classes from '../../../nominations/[electionId]/NominationPage/index.module.scss'
import payload from 'payload'
import { VoteCandidate } from '../../../../_components/VoteCandidate'
import { getID } from '../../../../../payload/utilities/getID'
import DraggableList from '../../../../_components/DraggableList'
import { VoteCandidateList } from '../../../../_components/VoteCandidateList'

// Pres = http://localhost:3000/vote/65ea0784b436290ac4943c39/65e62035b733f7583ee3b795

const getCandidates = async (electionId: string, positionId: string) => {
  return await payload.find({
    collection: 'nominations',
    pagination: false,
    where: {
      election: {
        equals: electionId,
      },
      position: {
        equals: positionId,
      },
      droppedOut: {
        equals: false,
      },
    },
  })
}

const getPosition = async (positionId: string) => {
  return await payload.findByID({
    collection: 'positions',
    id: positionId,
  })
}

export default async function Nomination({ params: { electionId, positionId } }) {
  const { user } = await getMeUser({
    nullUserRedirect: `/login?error=${encodeURIComponent(
      'You must be logged in to vote.',
    )}&redirect=${encodeURIComponent(`/vote/${electionId}/${positionId}`)}`,
  })

  const candidates = (await getCandidates(electionId, positionId)).docs
  const position = await getPosition(positionId)

  return (
    <Fragment>
      <Gutter>
        <div>
          <h3>Voting for {position.name}</h3>
          <p>{position.description}</p>
        </div>
        <VoteCandidateList candidates={candidates} position={position} user={user} />
      </Gutter>
    </Fragment>
  )
}

export const metadata: Metadata = {
  title: 'Vote',
  description: 'Vote for your favourite candidate.',
  openGraph: mergeOpenGraph({
    title: 'Nomination',
    url: '/nominations/[electionId]/[positionId]',
  }),
}

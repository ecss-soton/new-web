import React, { Fragment, Suspense } from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
// eslint-disable-next-line import/no-duplicates
import payload from 'payload'
import qs from 'qs'

import payloadConfig from '../../../../../payload/payload.config'
import { Position } from '../../../../../payload/payload-types'
import { getID } from '../../../../../payload/utilities/getID'
import { Button } from '../../../../_components/Button'
import DraggableList from '../../../../_components/DraggableList'
import { Gutter } from '../../../../_components/Gutter'
import { Media } from '../../../../_components/Media'
import { VoteCandidate } from '../../../../_components/VoteCandidate'
import { VoteCandidateList } from '../../../../_components/VoteCandidateList'
import { getMeUser } from '../../../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../../../_utilities/mergeOpenGraph'

import classes from '../../../nominations/[electionId]/NominationPage/index.module.scss'

// Pres = http://localhost:3000/vote/65ea0784b436290ac4943c39/65e62035b733f7583ee3b795

// const initializePayload = async () => {
//   const config = await payloadConfig
//   const initOptions = {
//     ...config,
//     secret: process.env.PAYLOAD_SECRET, // Ensure this environment variable is set
//   }
//   return getPayload(initOptions)
// }

const getCandidates = async (electionId: string, positionId: string) => {
  const query = {
    election: {
      equals: electionId,
    },
    position: {
      equals: positionId,
    },
    droppedOut: {
      equals: false,
    },
  }

  const stringifiedQuery = qs.stringify(
    {
      where: query,
      pagination: false,
      depth: 2,
    },
    { addQueryPrefix: true },
  )

  const response = await fetch(`http://localhost:3000/api/nominations${stringifiedQuery}`)
  if (!response.ok) {
    throw new Error('Failed to fetch candidates')
  }
  return await response.json()
}

const getPosition = async (positionId: string) => {
  const response = await fetch(`http://localhost:3000/api/positions/${positionId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch position')
  }
  return await response.json()
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
          <Button href={`/elections`} appearance="primary" label={'Back'} />
          <h2>Voting for {position.name}</h2>
          <em>{position.description}</em>
          <h4>How to vote</h4>
          <p>
            Select the candidates you wish to vote for from the{' '}
            <strong>Available Candidates</strong> list. Use the buttons to move the candidates up
            and down to set your preferences, remember you don't have to vote for everyone. When you
            are happy with your selection press the submit button and your ranking, seen in the{' '}
            <strong>Your ranking</strong> section will be submitted. You will no longer be able to
            vote again or view your vote.
          </p>
        </div>
        <VoteCandidateList
          candidates={candidates}
          position={position}
          electionId={electionId}
          user={user}
        />
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

import React, { Fragment } from 'react'
import { Metadata } from 'next'
import qs from 'qs'

import { Button } from '../../../../_components/Button'
import { Gutter } from '../../../../_components/Gutter'
import { VoteCandidateList } from '../../../../_components/VoteCandidateList'
import { getMeUser } from '../../../../_utilities/getMeUser'
import { mergeOpenGraph } from '../../../../_utilities/mergeOpenGraph'

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

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SERVER_URL}/api/nominations${stringifiedQuery}`,
  )
  if (!response.ok) {
    throw new Error('Failed to fetch candidates')
  }
  return await response.json()
}

const getPosition = async (positionId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/positions/${positionId}`)
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
            and down to set your preferences, remember you don&apos;t have to vote for everyone.
            When you are happy with your selection press the submit button and your ranking, seen in
            the <strong>Your ranking</strong> section will be submitted. You will no longer be able
            to vote again or view your vote.
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
    title: 'Vote',
    url: '/vote/[electionId]/[positionId]',
  }),
}

'use client'
import React, { Fragment, useEffect, useState } from 'react'

import { Election, Position } from '../../../payload/payload-types'
import { Button } from '../Button'

export const VotingButton: React.FC<{
  position?: Position
  election?: Election
}> = props => {
  const { position, election } = props

  const [hasVoted, setHasVoted] = useState(false)

  useEffect(() => {
    const asyncEffect = async () => {
      try {
        const req = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/votes/${election.id}/${position.id}/hasVoted`,
        )

        const json = (await req.json()) as { hasVoted: boolean }

        return json.hasVoted
      } catch (err) {
        console.warn(err) // eslint-disable-line no-console
      }
    }

    asyncEffect().then(v => {
      setHasVoted(v)
    })
  }, [election.id, position.id])

  return (
    <Fragment>
      {hasVoted && <h6>Already Voted</h6>}
      {!hasVoted && (
        <Button
          href={`/vote/${election.id}/${position.id}`}
          appearance="primary"
          label={`Vote`}
        ></Button>
      )}
    </Fragment>
  )
}

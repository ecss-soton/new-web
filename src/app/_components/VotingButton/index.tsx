'use client'
import React, { Fragment, useEffect, useState } from 'react'

import { Election, Position } from '../../../payload/payload-types'
import { Button } from '../Button'

export const VotingButton: React.FC<{
  className?: string
  position?: Position
  election?: Election
  electionId?: string
  label: string
  onClick?: () => void
  appearance?: 'primary' | 'secondary'
}> = props => {
  let { position, election, electionId, onClick, label, appearance } = props

  if (appearance !== 'primary' && appearance !== 'secondary') {
    appearance = 'primary'
  }

  const [hasVoted, setHasVoted] = useState(false)

  useEffect(() => {
    const asyncEffect = async () => {
      try {
        const req = await fetch(`/api/votes/${electionId || election?.id}/${position.id}/hasVoted`)

        const json = (await req.json()) as { hasVoted: boolean }

        return json.hasVoted
      } catch (err) {
        console.warn(err) // eslint-disable-line no-console
      }
    }

    asyncEffect().then(v => {
      setHasVoted(v)
    })
  }, [electionId, election?.id, position.id])

  return (
    <Fragment>
      {hasVoted && <h6>Already Voted</h6>}
      {!hasVoted && (
        <Button
          className={props.className}
          href={`/vote/${electionId || election?.id}/${position.id}`}
          appearance={appearance}
          onClick={onClick}
          label={label}
        ></Button>
      )}
    </Fragment>
  )
}

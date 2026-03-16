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

  const [isSusuMember, setIsSusu] = useState(false)

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

  useEffect(() => {
    const asyncEffect = async () => {
      try {
        const req = await fetch(`/api/votes/isSusuMember`)

        const json = (await req.json()) as { isSusuMember: boolean }

        return json.isSusuMember
      } catch (err) {
        console.warn(err) // eslint-disable-line no-console
      }
    }

    asyncEffect().then(v => {
      setIsSusu(v)
    })
  }, [electionId, election?.id, position.id])

  return (
    <Fragment>
      {hasVoted && <h6>Already Voted</h6>}
      {!isSusuMember && <h6>Please Register as a member of ECSS on SUSU to Vote</h6>}
      {!hasVoted && isSusuMember && (
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

'use client'

import React, { useState } from 'react'

import classes from './index.module.scss'
import { Nomination, Position, User } from '../../../payload/payload-types'
import { VoteCandidate } from '../VoteCandidate'
import { Button } from '../Button'

type Props = {
  candidates: Nomination[]
  position: Position
  user: User
}

export const VoteCandidateList: React.FC<Props> = ({ candidates, position }) => {
  const [ranking, setRanking] = useState({
    ranked: [],
    unranked: candidates,
  })

  const submitVotes = async () => {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        position: position.id,
        preferences: ranking.ranked.map(candidate => candidate.id),
      }),
    })
  }

  const swapElements = (array, index1, index2) => {
    array[index1] = array.splice(index2, 1, array[index1])[0]
  }

  const onMoveUp = (id: string) => {
    const candidateIndex = ranking.ranked.findIndex(candidate => candidate.id === id)
    if (candidateIndex == -1) return

    let newRanking = [...ranking.ranked]

    swapElements(newRanking, candidateIndex - 1, candidateIndex)

    setRanking({
      ranked: newRanking,
      unranked: ranking.unranked,
    })
  }

  const onMoveDown = (id: string) => {
    const candidateIndex = ranking.ranked.findIndex(candidate => candidate.id === id)
    if (candidateIndex == -1) return

    const newRanking = [...ranking.ranked]

    swapElements(newRanking, candidateIndex + 1, candidateIndex)

    setRanking({
      ranked: newRanking,
      unranked: ranking.unranked,
    })
  }

  const onRemove = (id: string) => {
    const candidate = ranking.ranked.find(candidate => candidate.id === id)
    if (!candidate) return
    setRanking({
      ranked: ranking.ranked.filter(candidate => candidate.id !== id),
      unranked: [candidate, ...ranking.unranked],
    })
  }

  const onAdd = (id: string) => {
    const candidate = ranking.unranked.find(candidate => candidate.id === id)
    if (!candidate) return
    setRanking({
      ranked: [...ranking.ranked, candidate],
      unranked: ranking.unranked.filter(candidate => candidate.id !== id),
    })
  }

  return (
    <div className={classes.container}>
      <div>
        <h4>Your ranking</h4>
        <p>Drag and drop the candidates to rank them in order of preference.</p>
        {ranking.ranked.map(candidate => {
          return (
            <div key={candidate.id}>
              <VoteCandidate
                ranking={ranking}
                candidate={candidate}
                onAdd={e => onAdd(e)}
                onRemove={e => onRemove(e)}
                onMoveUp={e => onMoveUp(e)}
                onMoveDown={e => onMoveDown(e)}
              />
            </div>
          )
        })}
      </div>
      <div>
        <h4>Candidates</h4>
        <p>Drag and drop the candidates to rank them in order of preference.</p>
        {ranking.unranked.map(candidate => {
          return (
            <div key={candidate.id}>
              <VoteCandidate
                ranking={ranking}
                candidate={candidate}
                onAdd={e => onAdd(e)}
                onRemove={e => onRemove(e)}
                onMoveUp={e => onMoveUp(e)}
                onMoveDown={e => onMoveDown(e)}
              />
            </div>
          )
        })}
      </div>
      <Button label="Submit" appearance="primary" onClick={submitVotes} />
    </div>
  )
}

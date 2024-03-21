'use client'

import React, { useState } from 'react'

import classes from './index.module.scss'
import { Nomination, Position, User } from '../../../payload/payload-types'
import { VoteCandidate } from '../VoteCandidate'
import { Button } from '../Button'

type Props = {
  candidates: Nomination[]
  electionId: string
  position: Position
  user: User
}

export const VoteCandidateList: React.FC<Props> = ({ candidates, electionId, position }) => {
  const [ranking, setRanking] = useState({
    ranked: [],
    unranked: candidates,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submitVotes = async () => {
    setLoading(true)
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        election: electionId,
        position: position.id,
        preference: ranking.ranked.map(candidate => candidate.id),
      }),
    })
    setLoading(false)

    const data = await res.json()

    if (data.errors) {
      setError(data.errors[0].message)
      return
    }

    setError('')
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
      <div className={classes.containerRow}>
        <div className={classes.containerList}>
          <h4>Your ranking</h4>
          <p>Your preferences ranked from favourite (1) to least favourite ({candidates.length})</p>
          {ranking.ranked.map((candidate, index) => {
            return (
              <div key={candidate.id} className={classes.rankPosContainer}>
                <div>
                  <h3>{index + 1}</h3>
                </div>
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
        <div className={classes.containerList}>
          <h4>Available Candidates</h4>
          <p>Choose the candidates that you want to vote for from below</p>
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
      </div>
      {error && <p>{error}</p>}
      {loading && <p>Loading...</p>}
      <Button label="Submit" appearance="primary" onClick={submitVotes} />
    </div>
  )
}

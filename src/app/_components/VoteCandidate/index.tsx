'use client'

import React, { useState } from 'react'

import classes from './index.module.scss'
import { Nomination, User } from '../../../payload/payload-types'
import { Media } from '../Media'
import NextImage from 'next/image'
import { Button } from '../Button'

type Props = {
  candidate: Nomination
  ranking: {
    ranked: Nomination[]
    unranked: Nomination[]
  }
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onRemove: (id: string) => void
  onAdd: (id: string) => void
}

export const VoteCandidate: React.FC<Props> = ({
  candidate,
  ranking,
  onAdd,
  onRemove,
  onMoveDown,
  onMoveUp,
}) => {
  const rankPos = ranking.ranked.indexOf(candidate)
  const isRanked = rankPos !== -1

  const [manifestoOpen, setManifestoOpen] = useState(false)

  if (typeof candidate.nominees === 'string') {
    return null
  }

  return (
    <div className={classes.container}>
      <div className={classes.flexContainer}>
        <div>
          {isRanked && (
            <div className={classes.buttonContainer}>
              <Button
                className={classes.moveButton}
                label="Move up"
                appearance="secondary"
                onClick={() => onMoveUp(candidate.id)}
                disabled={rankPos === 0}
              />
              <Button
                className={classes.moveButton}
                label="Move down"
                appearance="secondary"
                onClick={() => onMoveDown(candidate.id)}
                disabled={rankPos === ranking.ranked.length - 1}
              />
            </div>
          )}
          {rankPos !== -1 && (
            <Button
              className={classes.moveButton}
              label="Remove"
              appearance="secondary"
              onClick={() => onRemove(candidate.id)}
            />
          )}
          {rankPos === -1 && (
            <Button
              label={`Rank #${ranking.ranked.length + 1}`}
              appearance="secondary"
              onClick={() => onAdd(candidate.id)}
            />
          )}
        </div>

        <div>
          {!candidate.image && <div className={classes.placeholder}>No image</div>}
          {candidate.image && typeof candidate.image !== 'string' && (
            <Media imgClassName={classes.image} resource={candidate.image} />
          )}
        </div>
        <div className={classes.content}>
          <h3 className={classes.name}>
            {candidate.nickname ||
              candidate.populatedNominees.map(n => n.name.split(' ')[0]).join(' & ')}
          </h3>
          {candidate.id !== 'RON' ? (
            <p className={classes.name}>
              {candidate.populatedNominees.map(n => n.name).join(' & ')}
            </p>
          ) : (
            ''
          )}
        </div>
        <div>
          {candidate.manifesto && (
            <Button label={'Read manifesto'} onClick={() => setManifestoOpen(!manifestoOpen)} />
          )}
        </div>
      </div>
      {manifestoOpen && <p className={classes.manifesto}>{candidate.manifesto}</p>}
    </div>
  )
}

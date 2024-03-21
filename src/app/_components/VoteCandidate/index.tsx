import React from 'react'

import classes from './index.module.scss'
import { Media, Nomination, User } from '../../../payload/payload-types'
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
  if (typeof candidate.image === 'string') {
    return null
  }

  const rankPos = ranking.ranked.indexOf(candidate)
  const isRanked = rankPos !== -1

  return (
    <div className={classes.container}>
      <div>
        {isRanked && (
          <Button
            label="Move up"
            appearance="secondary"
            onClick={() => onMoveUp(candidate.id)}
            disabled={rankPos === 0}
          />
        )}
        {isRanked && (
          <Button
            label="Move down"
            appearance="secondary"
            onClick={() => onMoveDown(candidate.id)}
            disabled={rankPos === ranking.ranked.length - 1}
          />
        )}
        {rankPos !== -1 ? (
          <Button label="Remove" appearance="secondary" onClick={() => onRemove(candidate.id)} />
        ) : (
          <Button
            label={`Rank #${ranking.ranked.length + 1}`}
            appearance="secondary"
            onClick={() => onAdd(candidate.id)}
          />
        )}
      </div>

      <div className={classes.image}>{/*<NextImage src={image.url} alt={nickname} />*/}</div>
      <div className={classes.content}>
        <h3>{candidate.nickname}</h3>
        {/*<p>{manifesto}</p>*/}
      </div>
    </div>
  )
}

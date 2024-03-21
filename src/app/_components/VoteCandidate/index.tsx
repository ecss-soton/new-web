import React from 'react'

import classes from './index.module.scss'
import { Media, User } from '../../../payload/payload-types'
import NextImage from 'next/image'

type Props = {
  nominees: (User | string)[]
  nickname: string
  manifesto: string
  image: Media | string
  droppedOut: boolean
}

export const VoteCandidate: React.FC<Props> = ({
  nominees,
  nickname,
  manifesto,
  image,
  droppedOut,
}) => {
  if (typeof image === 'string') {
    return null
  }
  return (
    <div className={classes.container}>
      <div className={classes.image}>{/*<NextImage src={image.url} alt={nickname} />*/}</div>
      <div className={classes.content}>
        <h3>{nickname}</h3>
        {/*<p>{manifesto}</p>*/}
      </div>
    </div>
  )
}

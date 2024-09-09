import React from 'react'

import { Page } from '../../../payload/payload-types'
import { Media as MediaComp } from '../../_components/Media'
import { Image } from '../../_components/Media/Image'
import RichText from '../../_components/RichText'
import { VerticalPadding } from '../../_components/VerticalPadding'

import classes from './index.module.scss'

type Props = Extract<Page['layout'][0], { blockType: 'intro' }>

export const IntroBlock: React.FC<
  Props & {
    id?: string
  }
> = ({ content, media }) => {
  return (
    <div className={classes.container}>
      <div className={classes.grey}>
        <RichText content={content} />
      </div>
      <Image resource={media} alt="Image 4" imgClassName={classes.image} />
      <div className={classes.red} />
    </div>
  )
}

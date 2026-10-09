import React from 'react'

import { Newsletter } from '../../../payload/payload-types'
import { Media } from '../../_components/Media'
import { sourceSerif } from '../../_utilities/font'

import classes from './index.module.scss'

type Props = Extract<Newsletter['layout'][0], { blockType: 'figure' }>

export const Figure: React.FC<Props> = ({ image, caption, figureSpan = 'full' }) => {
  return (
    <figure className={classes.figure} data-span={figureSpan}>
      <div className={classes.imageWrap}>
        <Media resource={image} />
      </div>
      {caption && (
        <figcaption className={[classes.caption, sourceSerif.className].join(' ')}>
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

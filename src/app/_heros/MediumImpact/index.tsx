import React from 'react'

import { Page } from '../../../payload/payload-types'
import { Gutter } from '../../_components/Gutter'
import { CMSLink } from '../../_components/Link'
import { Media } from '../../_components/Media'
import RichText from '../../_components/RichText'

import classes from './index.module.scss'

export const MediumImpactHero: React.FC<Page['hero']> = props => {
  const { richText, media, links } = props

  return (
    <Gutter className={classes.hero}>
      <div className={classes.mediaContainer}>
        {typeof media === 'object' && <Media className={classes.media} resource={media} />}
      </div>
      <RichText content={richText} className={classes.richText} />
    </Gutter>
  )
}

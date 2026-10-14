import React from 'react'

import { Newsletter } from '../../../payload/payload-types'
import { Media } from '../../_components/Media'
import RichText from '../../_components/RichText'
import { newsreader, spectral } from '../../_utilities/font'

import classes from './index.module.scss'

type Props = Extract<Newsletter['layout'][0], { blockType: 'article' }>

export const Article: React.FC<Props> = ({
  headline,
  byline,
  body,
  image,
  imagePosition = 'top',
  articleSpan = 'full',
  featured,
}) => {
  const hasImage = image && typeof image === 'object'
  const inlineImage = hasImage && imagePosition !== 'top'

  return (
    <article
      className={[classes.article, featured ? classes.featured : ''].filter(Boolean).join(' ')}
      data-span={articleSpan}
    >
      {featured && <p className={classes.kicker}>Feature</p>}
      <h2 className={[classes.headline, newsreader.className].join(' ')}>{headline}</h2>
      {byline && <p className={classes.byline}>{byline}</p>}
      {hasImage && !inlineImage && (
        <figure className={classes.figure}>
          <Media resource={image} />
        </figure>
      )}
      <div className={classes.body}>
        {inlineImage && (
          <figure className={[classes.figure, classes[`figure--${imagePosition}`]].join(' ')}>
            <Media resource={image} />
          </figure>
        )}
        <RichText content={body} fontClassName={spectral.className} />
      </div>
    </article>
  )
}

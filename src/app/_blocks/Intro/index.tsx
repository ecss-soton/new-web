import React from 'react'

import { Page } from '../../../payload/payload-types'
import { Image } from '../../_components/Media/Image'
import RichText from '../../_components/RichText'

import classes from './index.module.scss'

type Props = Extract<Page['layout'][0], { blockType: 'intro' }>

export const IntroBlock: React.FC<
  Props & {
    id?: string
  }
> = ({ content, media, quickLinks }) => {
  return (
    <div className={classes.container}>
      <div className={classes.grey}>
        <RichText content={content} className={classes.text} />
        {quickLinks && quickLinks.length > 0 && (
          <div className={classes.quickLinks}>
            {quickLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                className={classes.quickLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
      <Image resource={media} alt="Intro image" imgClassName={classes.image} />
      <div className={classes.red} />
    </div>
  )
}

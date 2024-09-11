/* eslint-disable @next/next/no-img-element */
import React from 'react'
import { Inter } from '@next/font/google'

import { Page } from '../../../payload/payload-types'
import { Button } from '../../_components/Button'
import { Gutter } from '../../_components/Gutter'
import { Media as MediaComp } from '../../_components/Media'
import { Image } from '../../_components/Media/Image'
import { VerticalPadding } from '../../_components/VerticalPadding'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

type Props = Extract<Page['layout'][0], { blockType: 'homeTop' }>

export const HomeTopBlock: React.FC<
  Props & {
    id?: string
  }
> = ({ heading, image1, image2, image3 }) => {
  return (
    <VerticalPadding top="none" bottom="none">
      <div className={[classes.container, inter.className].join(' ')}>
        <div className={classes.intro}>
          <h1 className={[classes.heading, inter.className].join(' ')}>{heading}</h1>
          <Button
            label="Meet our team"
            appearance="primary"
            className={classes.button}
            href="/committee"
          />
          <div className={[classes.stats, inter.className].join(' ')}>
            <div className={classes.stat}>
              <span className={classes.number}>2500+</span>
              <span className={classes.label}>members</span>
            </div>
            <div className={classes.stat}>
              <span className={classes.number}>12</span>
              <span className={classes.label}>committee</span>
            </div>
          </div>
        </div>
        <div className={classes.imageContainer}>
          <Image resource={image1} alt="Image 1" imgClassName={classes.image1} />
          <Image resource={image2} alt="Image 2" imgClassName={classes.image2} />
          <Image resource={image3} alt="Image 3" imgClassName={classes.image3} />
        </div>
      </div>
    </VerticalPadding>
  )
}

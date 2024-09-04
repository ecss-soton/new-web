import React from 'react'
import { Inter } from '@next/font/google'

import { Page } from '../../../payload/payload-types'
import { Gutter } from '../../_components/Gutter'
import RichText from '../../_components/RichText'
import { VerticalPadding } from '../../_components/VerticalPadding'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

export const LowImpactHero: React.FC<Page['hero']> = ({ title, richText }) => {
  return (
    <Gutter className={classes.lowImpactHero}>
      <div className={classes.content}>
        <VerticalPadding>
          <h1 className={[classes.title, inter.className].join(' ')}>
            {' '}
            <span className={classes.bracket}> &gt;</span> {title}
          </h1>
          <RichText className={classes.richText} content={richText} />
        </VerticalPadding>
      </div>
    </Gutter>
  )
}

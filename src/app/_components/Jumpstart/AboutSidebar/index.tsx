import React from 'react'

import { rubikMono } from '../../../_utilities/font'

import classes from './index.module.scss'

type Props = {
  title?: string | null
  aboutText?: string | null
}

export const AboutSidebar: React.FC<Props> = ({ title, aboutText }) => {
  if (!aboutText) return null

  return (
    <aside className={classes.sidebar}>
      <h3 className={[classes.title, rubikMono.className].join(' ')}>
        {title || 'WHAT IS JUMPSTART?'}
      </h3>
      <p className={classes.text}>{aboutText}</p>
    </aside>
  )
}

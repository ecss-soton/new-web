import React from 'react'

import { bebasNeue, inter } from '../../../_utilities/font'

import classes from './index.module.scss'

type Props = {
  aboutText?: string | null
}

export const AboutSidebar: React.FC<Props> = ({ aboutText }) => {
  if (!aboutText) return null

  return (
    <aside className={classes.sidebar}>
      <h3 className={[classes.title, bebasNeue.className].join(' ')}>Who Are ECSS?</h3>
      <p className={[classes.text, inter.className].join(' ')}>{aboutText}</p>
    </aside>
  )
}

import React from 'react'
import Link from 'next/link'

import classes from './index.module.scss'

export const GameBackLink: React.FC<{
  href?: string
  label?: string
}> = ({ href = '/games', label = 'All games' }) => {
  return (
    <Link href={href} className={classes.backLink}>
      &larr; {label}
    </Link>
  )
}

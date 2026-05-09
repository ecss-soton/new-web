import React from 'react'
import Link from 'next/link'

import { Media as MediaComp } from '../Media'

import classes from './index.module.scss'

export const SocietyItem: React.FC<{
  slug?: string
  name?: string
  logo?: any
}> = props => {
  const { slug, name, logo } = props

  return (
    <Link href={`/societies/${slug}`} className={classes.card}>
      <div className={classes.logoCol}>
        {!logo && <div className={classes.placeholder}>No image</div>}
        {logo && typeof logo !== 'string' && (
          <MediaComp imgClassName={classes.logo} resource={logo} fill />
        )}
      </div>
      <div className={classes.content}>{name && <h4 className={classes.title}>{name}</h4>}</div>
    </Link>
  )
}

import React from 'react'
import Link from 'next/link'

import { Media } from '../../../payload/payload-types'
import { Media as MediaComp } from '../Media'

import classes from './index.module.scss'

export const SponsorItem: React.FC<{
  // alignItems?: 'center'
  // className?: string
  // showCategories?: boolean
  // hideImagesOnMobile?: boolean
  // title?: string
  // doc?: Project | Post
  // orientation?: 'horizontal' | 'vertical'
  slug?: string
  name?: string
  logo?: string | Media | null
}> = props => {
  const {
    // relationTo,
    // showCategories,
    // title: titleFromProps,
    // doc,
    // className,
    // orientation = 'vertical',
    slug,
    name,
    logo,
  } = props

  // const { slug, title, categories, meta } = doc || {}
  // const { description, image: metaImage } = meta || {}

  // const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  // const titleToUse = titleFromProps || title
  // const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  // const href = `/${relationTo}/${slug}`

  return (
    <div className={[classes.card].filter(Boolean).join(' ')}>
      <Link href={`/sponsors/${slug}`} className={classes.mediaWrapper}>
        {!logo && <div className={classes.placeholder}>No image</div>}
        {logo && typeof logo !== 'string' && (
          <MediaComp imgClassName={classes.image} resource={logo} fill />
        )}
      </Link>
      <div className={classes.content}>{name && <h4 className={classes.title}>{name}</h4>}</div>
    </div>
  )
}

import React, { Fragment } from 'react'
import Link from 'next/link'

import { Media, Sponsor } from '../../../payload/payload-types'
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
      <div className={classes.content}>
        {name && <h4 className={classes.title}>{name}</h4>}
        {/*{showCategories && hasCategories && (*/}
        {/*  <div className={classes.leader}>*/}
        {/*    {showCategories && hasCategories && (*/}
        {/*      <div>*/}
        {/*        {categories?.map((category, index) => {*/}
        {/*          if (typeof category === 'object') {*/}
        {/*            const { title: titleFromCategory } = category*/}

        {/*            const categoryTitle = titleFromCategory || 'Untitled category'*/}

        {/*            const isLast = index === categories.length - 1*/}

        {/*            return (*/}
        {/*              <Fragment key={index}>*/}
        {/*                {categoryTitle}*/}
        {/*                {!isLast && <Fragment>, &nbsp;</Fragment>}*/}
        {/*              </Fragment>*/}
        {/*            )*/}
        {/*          }*/}

        {/*          return null*/}
        {/*        })}*/}
        {/*      </div>*/}
        {/*    )}*/}
        {/*  </div>*/}
        {/*)}*/}
        {/*{titleToUse && (*/}
        {/*  <h4 className={classes.title}>*/}
        {/*    <Link href={href} className={classes.titleLink}>*/}
        {/*      {titleToUse}*/}
        {/*    </Link>*/}
        {/*  </h4>*/}
        {/*)}*/}
        {/*{description && (*/}
        {/*  <div className={classes.body}>*/}
        {/*    {description && <p className={classes.description}>{sanitizedDescription}</p>}*/}
        {/*  </div>*/}
        {/*)}*/}
      </div>
    </div>
  )
}

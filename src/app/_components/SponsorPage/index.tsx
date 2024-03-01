import React, { Fragment } from 'react'
import Link from 'next/link'

import { Media, Sponsor } from '../../../payload/payload-types'
import { Media as MediaComp } from '../Media'

import classes from './index.module.scss'
import { LinkList } from '../LinkList'
import RichText from '../RichText'
import { Gutter } from '../Gutter'
import { CMSLinkType } from '../Link'

export const SponsorPage: React.FC<{
  sponsor?: Sponsor
}> = props => {
  const {
    sponsor: { logo, description, links, level, name, websiteUrl },
  } = props

  // const { slug, title, categories, meta } = doc || {}
  // const { description, image: metaImage } = meta || {}

  // const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  // const titleToUse = titleFromProps || title
  // const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  // const href = `/${relationTo}/${slug}`

  return (
    <Gutter>
      <div>{level && <h4 className={classes.title}>{level}</h4>}</div>

      <Link href={websiteUrl} className={classes.mediaWrapper}>
        {!logo && <div className={classes.placeholder}>No image</div>}
        {logo && typeof logo !== 'string' && (
          <MediaComp imgClassName={classes.image} resource={logo} fill />
        )}
      </Link>

      <div className={classes.content}>{name && <h2 className={classes.title}>{name}</h2>}</div>

      <div>{websiteUrl && <Link href={websiteUrl} />}</div>

      <RichText content={description} />

      <div>
        <LinkList links={links.map(link => link.link)} />
      </div>
    </Gutter>
  )
}

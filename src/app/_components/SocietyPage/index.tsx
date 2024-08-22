import React from 'react'
import Link from 'next/link'

import { Society } from '../../../payload/payload-types'
import { Gutter } from '../Gutter'
import { LinkList } from '../LinkList'
import { Media as MediaComp } from '../Media'
import RichText from '../RichText'

import classes from './index.module.scss'

export const SocietyPage: React.FC<{
  society?: Society
}> = props => {
  const {
    society: { logo, description, links, email, name, website, susu, github, instagram, discord },
  } = props

  // const { slug, title, categories, meta } = doc || {}
  // const { description, image: metaImage } = meta || {}

  // const hasCa  tegories = categories && Array.isArray(categories) && categories.length > 0
  // const titleToUse = titleFromProps || title
  // const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  // const href = `/${relationTo}/${slug}`

  return (
    <Gutter>
      <Link href={website} className={classes.mediaWrapper}>
        {!logo && <div className={classes.placeholder}>No image</div>}
        {logo && typeof logo !== 'string' && (
          <MediaComp imgClassName={classes.image} resource={logo} fill />
        )}
      </Link>

      <div className={classes.content}>{name && <h2 className={classes.title}>{name}</h2>}</div>

      <div>{website && <Link href={website} />}</div>

      <RichText content={description} />

      <div>{email && <Link href={'mailto: ' + email} />}</div>

      <div>{susu && <Link href={susu} />}</div>

      <div>{github && <Link href={'https://github.com/' + github} />}</div>

      <div>{instagram && <Link href={'https://instagram.com/' + instagram} />}</div>

      <div>{discord && <Link href={discord} />}</div>

      <div>
        <LinkList links={links.map(link => link.link)} />
      </div>
    </Gutter>
  )
}

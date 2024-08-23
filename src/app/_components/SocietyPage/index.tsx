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
      <div>
        {website && (
          <Link href={website} className={classes.mediaWrapper}>
            {!logo && <div className={classes.placeholder}>No image</div>}
            {logo && typeof logo !== 'string' && (
              <MediaComp imgClassName={classes.image} resource={logo} fill />
            )}
          </Link>
        )}
      </div>

      <div className={classes.content}>{name && <h2 className={classes.title}>{name}</h2>}</div>

      <div>{website && <Link href={website}>Website</Link>}</div>

      <RichText content={description} />

      <div>{email && <Link href={'mailto: ' + email}>Email</Link>}</div>

      <div>{susu && <Link href={susu}>Susu Page</Link>}</div>

      <div>{github && <Link href={'https://github.com/' + github}>Github</Link>}</div>

      <div>{instagram && <Link href={'https://instagram.com/' + instagram}>Instagram</Link>}</div>

      <div>{discord && <Link href={discord}>Discord</Link>}</div>

      <div>
        <LinkList links={links.map(link => link.link)} />
      </div>
    </Gutter>
  )
}

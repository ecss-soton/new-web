import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { Sponsor } from '../../../payload/payload-types'
import { LowImpactHero } from '../../_heros/LowImpact'
import { Gutter } from '../Gutter'
import { LinkList } from '../LinkList'
import { Media } from '../Media'
import RichText from '../RichText'

import classes from './index.module.scss'

export const SponsorPage: React.FC<{
  sponsor?: Sponsor
}> = props => {
  const {
    sponsor: { logo, description, links, level, name, websiteUrl },
  } = props

  // const { slug, title, categories, meta } = doc || {}
  // const { description, image: metaImage } = meta || {}

  // const hasCa  tegories = categories && Array.isArray(categories) && categories.length > 0
  // const titleToUse = titleFromProps || title
  // const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  // const href = `/${relationTo}/${slug}`

  return (
    <>
      {name && <LowImpactHero type="lowImpact" title={name} />}
      <Gutter>
        {logo && (
          <Media className={classes.imageContainer} imgClassName={classes.image} resource={logo} />
        )}

        <div>
          {level && (
            <h4 className={classes.title} style={{ textTransform: 'capitalize' }}>
              {level}
            </h4>
          )}
        </div>

        <RichText content={description} />

        <div className={classes.links}>
          <div>
            {websiteUrl && (
              <Link href={websiteUrl}>
                <Image
                  src="/link-svgrepo-com.svg"
                  alt="website"
                  width={40}
                  height={40}
                  className={classes.icon}
                />
              </Link>
            )}
          </div>

          <div>
            <LinkList links={links.map(link => link.link)} />
          </div>
        </div>
      </Gutter>
    </>
  )
}

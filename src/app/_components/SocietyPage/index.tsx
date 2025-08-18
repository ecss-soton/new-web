import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { Society } from '../../../payload/payload-types'
import { LowImpactHero } from '../../_heros/LowImpact'
import { Button } from '../Button'
import { Gutter } from '../Gutter'
import { LinkList } from '../LinkList'
import { Media } from '../Media'
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
    <>
      {name && <LowImpactHero type="lowImpact" title={name} />}
      <Gutter>
        {logo && (
          <Media className={classes.imageContainer} imgClassName={classes.image} resource={logo} />
        )}

        <RichText content={description} />

        <div className={classes.links}>
          <div>
            {website && (
              <Link href={website}>
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
            {email && (
              <Link href={'mailto: ' + email}>
                <Image
                  src="/mail-142.svg"
                  alt="mail"
                  width={40}
                  height={40}
                  className={classes.icon}
                />
              </Link>
            )}
          </div>

          <div>
            {discord && (
              <Link href={discord}>
                <Image
                  src="/discord.svg"
                  alt="discord"
                  width={40}
                  height={40}
                  className={classes.icon}
                />
              </Link>
            )}
          </div>

          <div>
            {instagram && (
              <Link href={'https://instagram.com/' + instagram}>
                <Image
                  src="/instagram-logo-facebook-2-svgrepo-com.svg"
                  alt="instagram"
                  width={40}
                  height={40}
                  className={classes.icon}
                />
              </Link>
            )}
          </div>

          <div>
            {github && (
              <Link href={'https://github.com/' + github}>
                <Image
                  src="/github-mark.svg"
                  alt="github"
                  width={40}
                  height={40}
                  className={classes.icon}
                />
              </Link>
            )}
          </div>

          <div>
            {susu && (
              <Button
                href={susu}
                label="SUSU Page"
                appearance="secondary"
                className={classes.icon}
              />
            )}
          </div>

          <LinkList links={links.map(link => link.link)} />
        </div>

        {/* <div>
          <LinkList links={links.map(link => link.link)} />
        </div> */}
      </Gutter>
    </>
  )
}

import React from 'react'
import { Poppins } from '@next/font/google'
import Image from 'next/image'
import Link from 'next/link'

import { Committee, Media } from '../../../payload/payload-types'
import { Media as MediaComp } from '../Media'

import classes from './index.module.scss'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

export const CommitteeItem: React.FC<{
  committee?: Committee
}> = props => {
  const {
    committee: { firstName, lastName, position, bio, logo },
  } = props

  // const { slug, title, categories, meta } = doc || {}
  // const { description, image: metaImage } = meta || {}

  // const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  // const titleToUse = titleFromProps || title
  // const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  // const href = `/${relationTo}/${slug}`

  return (
    <div className={classes.person}>
      {logo && (
        <MediaComp
          className={classes.container}
          resource={logo}
          imgClassName={classes.profileImage}
          alt={'Profile Picture for' + firstName + ' ' + lastName}
        />
      )}
      <div className={classes.rectangle}>
        <p className={[classes.title, poppins.className].join(' ')}>
          <span className={classes.firstName}>
            {firstName}
            <br />
          </span>
          <span className={classes.lastName}>
            {lastName}
            <br />
          </span>
          <span className={classes.role}>{position}</span>
        </p>
      </div>
    </div>
  )
}

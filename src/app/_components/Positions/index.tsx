'use client'
import React, { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import qs from 'qs'

import {
  Election,
  Media,
  Nomination,
  Position,
  Sponsor,
  User,
} from '../../../payload/payload-types'
import { Button } from '../Button'
import { Gutter } from '../Gutter'
import { CMSLinkType } from '../Link'
import { LinkList } from '../LinkList'
import { Media as MediaComp } from '../Media'
import { Nominations } from '../Nominations'
import RichText from '../RichText'

import classes from './index.module.scss'

export const Positions: React.FC<{
  positions?: Position[]
  election?: Election
  canCreateNominations?: boolean
  user?: User
}> = props => {
  const { user, positions, election, canCreateNominations } = props

  // const { slug, title, categories, meta } = doc || {}
  // const { description, image: metaImage } = meta || {}

  // const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  // const titleToUse = titleFromProps || title
  // const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  // const href = `/${relationTo}/${slug}`
  positions?.sort((p1, p2) => p1.importance - p2.importance)

  return (
    <div>
      {positions?.map((position, index) => {
        const { name, description } = position
        return (
          <Fragment key={name}>
            <h3>{name}</h3>
            <p>{description}</p>
            {canCreateNominations && (
              <Button
                href={`/nominations/${election.id}/${position.id}`}
                appearance="primary"
                label={'Create Nomination'}
              ></Button>
            )}
            <Nominations positionId={position.id} election={election} user={user} />
          </Fragment>
        )
      })}
    </div>
  )
}

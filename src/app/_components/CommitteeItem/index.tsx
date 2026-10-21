'use client'

import React from 'react'

import { Committee, Position } from '../../../payload/payload-types'
import { poppins } from '../../_utilities/font'
import { Media as MediaComp } from '../Media'

import classes from './index.module.scss'

export const CommitteeItem: React.FC<{
  committee?: Committee
  onCommitteeClick: (committee: Committee | null) => void
}> = ({ committee, onCommitteeClick }) => {
  const { firstName, lastName, positionRef, position, logo } = committee || {}

  const positionThing = positionRef as Position
  const roleName = positionThing?.name || position

  const content = (
    <>
      {logo && (
        <div className={classes.imageWrap}>
          <MediaComp
            resource={logo}
            imgClassName={classes.profileImage}
            alt={`Profile Picture for ${firstName} ${lastName}`}
          />
        </div>
      )}
      <div className={[classes.info, poppins.className].join(' ')}>
        <span className={classes.firstName}>{firstName}</span>
        <span className={classes.lastName}>{lastName}</span>
        <span className={classes.role}>{roleName}</span>
      </div>
    </>
  )

  return (
    <button
      type="button"
      className={classes.card}
      onClick={() => onCommitteeClick(committee || null)}
      aria-label={`${firstName} ${lastName}${roleName ? `, ${roleName}` : ''}`}
    >
      {content}
    </button>
  )
}

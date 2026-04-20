'use client'

import React from 'react'
import { Poppins } from '@next/font/google'
import Image from 'next/image'
import Link from 'next/link'

import { Committee, Position } from '../../../payload/payload-types' // Make sure Position is imported if needed
import { CommitteePopUp } from '../CommitteePopUp'
import { Media as MediaComp } from '../Media'

import classes from './index.module.scss'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

export const CommitteeItem: React.FC<{
  committee?: Committee
  onCommitteeClick: (committee: Committee | null) => void
}> = ({ committee, onCommitteeClick }) => {
  const { firstName, lastName, positionRef, position, bio, logo } = committee || {}
  const fullName = firstName + ' ' + lastName

  const handleClose = () => {
    onCommitteeClick(null)
  }

  const handleClick = () => {
    onCommitteeClick(committee || null) // Add fallback just in case
  }

  // Safely extract the position name.
  // Payload returns relationships as either an ID string OR a populated object.
  const positionThing = positionRef as Position

  // Now TypeScript happily lets you access .name
  const roleName = positionThing?.name || position

  return (
    <div className={classes.person} onClick={handleClick}>
      {logo && (
        <MediaComp
          className={classes.container}
          resource={logo}
          imgClassName={classes.profileImage}
          alt={`Profile Picture for ${firstName} ${lastName}`}
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
          {/* Use the safely extracted roleName here */}
          <span className={classes.role}>{roleName}</span>
        </p>
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import { Poppins } from 'next/font/google'

import { Committee, Position } from '../../../payload/payload-types'
import { Media as MediaComp } from '../Media'

import classes from './index.module.scss'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

const richTextHasContent = (bio: Committee['bio']): boolean => {
  if (!bio || !Array.isArray(bio) || bio.length === 0) return false

  const walk = (nodes: unknown[]): boolean =>
    nodes.some(node => {
      if (!node || typeof node !== 'object') return false
      const n = node as { text?: unknown; children?: unknown[] }
      if (typeof n.text === 'string' && n.text.trim().length > 0) return true
      if (Array.isArray(n.children)) return walk(n.children)
      return false
    })

  return walk(bio)
}

export const CommitteeItem: React.FC<{
  committee?: Committee
  onCommitteeClick: (committee: Committee | null) => void
}> = ({ committee, onCommitteeClick }) => {
  const { firstName, lastName, positionRef, position, logo, bio, link } = committee || {}

  const positionThing = positionRef as Position
  const roleName = positionThing?.name || position
  const hasBio = richTextHasContent(bio)
  const externalLink =
    !hasBio && typeof link === 'string' && /^https:\/\//i.test(link) ? link : null

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

  if (externalLink) {
    return (
      <a
        className={classes.card}
        href={externalLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${firstName} ${lastName}${roleName ? `, ${roleName}` : ''}`}
      >
        {content}
      </a>
    )
  }

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

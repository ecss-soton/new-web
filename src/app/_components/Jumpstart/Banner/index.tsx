'use client'

import React, { useState } from 'react'
import Link from 'next/link'

import { inter } from '../../../_utilities/font'

import classes from './index.module.scss'

export const JumpstartBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  return (
    <div className={[classes.banner, inter.className].join(' ')}>
      <div className={classes.content}>
        <Link href="/home" className={classes.link}>
          View regular site →
        </Link>
      </div>
      <button
        className={classes.close}
        onClick={() => setIsDismissed(true)}
        aria-label="Dismiss banner"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 4L12 12M12 4L4 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}

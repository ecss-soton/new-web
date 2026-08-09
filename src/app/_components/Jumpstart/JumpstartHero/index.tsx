import React from 'react'

import { bungee } from '../../../_utilities/font'

import classes from './index.module.scss'

type Props = {
  dateRange: string
  logo?: {
    url?: string | null
    alt?: string | null
  } | null
}

export const JumpstartHero: React.FC<Props> = ({ dateRange, logo }) => {
  const logoSrc = logo?.url || '/jumpstart/logo.png'
  const logoAlt = logo?.alt || 'Jumpstart'

  return (
    <div className={classes.hero}>
      <div className={classes.splatter} aria-hidden="true">
        <svg
          viewBox="0 0 800 400"
          xmlns="http://www.w3.org/2000/svg"
          className={classes.splatterSvg}
        >
          <defs>
            <radialGradient id="splatter-1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--jumpstart-neon-magenta)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--jumpstart-neon-magenta)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="splatter-2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--jumpstart-neon-cyan)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--jumpstart-neon-cyan)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="splatter-3" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--jumpstart-neon-orange)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--jumpstart-neon-orange)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="splatter-4" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--jumpstart-neon-lime)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--jumpstart-neon-lime)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="120" cy="200" rx="180" ry="160" fill="url(#splatter-1)" />
          <ellipse cx="680" cy="100" rx="200" ry="140" fill="url(#splatter-2)" />
          <ellipse cx="400" cy="340" rx="250" ry="100" fill="url(#splatter-3)" />
          <ellipse cx="700" cy="280" rx="140" ry="90" fill="url(#splatter-4)" />
          <circle cx="60" cy="60" r="3" fill="var(--jumpstart-neon-cyan)" opacity="0.6" />
          <circle cx="200" cy="40" r="2" fill="var(--jumpstart-neon-magenta)" opacity="0.7" />
          <circle cx="500" cy="30" r="2.5" fill="var(--jumpstart-neon-lime)" opacity="0.6" />
          <circle cx="750" cy="50" r="1.5" fill="var(--jumpstart-neon-orange)" opacity="0.5" />
          <circle cx="340" cy="80" r="2" fill="var(--jumpstart-neon-cyan)" opacity="0.5" />
          <circle cx="620" cy="350" r="2" fill="var(--jumpstart-neon-magenta)" opacity="0.5" />
          <circle cx="100" cy="340" r="1.5" fill="var(--jumpstart-neon-lime)" opacity="0.4" />
        </svg>
      </div>

      <div className={classes.content}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt={logoAlt} className={classes.brandLogo} />
        <span className={[classes.dateRange, bungee.className].join(' ')}>{dateRange}</span>
      </div>
    </div>
  )
}

import React from 'react'

import { bebasNeue } from '../../../_utilities/font'

import classes from './index.module.scss'

type Props = {
  dateRange: string
  logoUrl?: string | null
  logoDarkUrl?: string | null
}

export const JumpstartHero: React.FC<Props> = ({ dateRange, logoUrl, logoDarkUrl }) => {
  const logoSrc = logoUrl || '/ecss.svg'

  return (
    <div className={classes.hero}>
      <div className={classes.wave}>
        <svg
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          className={classes.waveSvg}
        >
          <defs>
            <linearGradient id="js-wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--jumpstart-cat-welcome)" />
              <stop offset="50%" stopColor="var(--jumpstart-cat-social)" />
              <stop offset="100%" stopColor="var(--jumpstart-cat-academic)" />
            </linearGradient>
          </defs>
          <path
            d="M0 100 C360 0, 720 200, 1080 120 S1440 40, 1440 40 L1440 200 L0 200 Z"
            fill="url(#js-wave-gradient)"
            className={classes.wavePath}
          />
        </svg>
      </div>

      <div className={classes.content}>
        <div className={classes.left}>
          <img
            src={logoSrc}
            alt="ECSS logo"
            className={classes.logo}
            data-theme-light-src={logoUrl || '/ecss.svg'}
            data-theme-dark-src={logoDarkUrl || logoUrl || '/ecss-light.svg'}
          />
        </div>

        <div className={classes.center}>
          <span className={[classes.brand, bebasNeue.className].join(' ')}>jumpstart</span>
          <span className={classes.dateRange}>{dateRange}</span>
        </div>

        <div className={classes.right}>
          <img src="/ECSS_cog.svg" alt="" className={classes.cog} />
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

import type { Footer as FooterType } from '../../../payload/payload-types'
import { fetchFooter, fetchSettings } from '../../_api/fetchGlobals'
import { ThemeSelector } from '../../_providers/Theme/ThemeSelector'
import { Gutter } from '../Gutter'
import { CMSLink } from '../Link'
import { Media } from '../Media'

import classes from './index.module.scss'

export async function Footer() {
  let footer: FooterType | null = null
  let settings: { footerLogo?: any } = {}

  try {
    footer = await fetchFooter()
    settings = await fetchSettings()
  } catch (error) {
    // When deploying on Payload Cloud, the page needs to build before APIs are live
    // So swallow the error and render footer without nav items if one occurs
  }

  const navItems = footer?.navItems || []
  const footerLogo = settings?.footerLogo

  return (
    <footer className={classes.footer}>
      <Gutter className={classes.wrap}>
        <Link href="/">
          {footerLogo && typeof footerLogo !== 'string' && footerLogo.url ? (
            <picture>
              <img
                className={classes.logo}
                alt={footerLogo.alt || 'ECSS Logo'}
                src={footerLogo.url}
              />
            </picture>
          ) : (
            <picture>
              <img className={classes.logo} alt="ECSS Logo" src="/ecss-light.svg" />
            </picture>
          )}
        </Link>
        <nav className={classes.nav}>
          <ThemeSelector />
          {navItems.map(({ link, icon }, i) => {
            return icon ? (
              <Link key={i} href={link.url}>
                <Media resource={icon} className={classes.icon} imgClassName={classes.iconImage} />
              </Link>
            ) : (
              <CMSLink key={i} {...link} />
            )
          })}
        </nav>
      </Gutter>
    </footer>
  )
}

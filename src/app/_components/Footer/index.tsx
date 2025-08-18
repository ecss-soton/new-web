import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

import type { Footer as FooterType } from '../../../payload/payload-types'
import { fetchFooter } from '../../_api/fetchGlobals'
import { ThemeSelector } from '../../_providers/Theme/ThemeSelector'
import { Gutter } from '../Gutter'
import { CMSLink } from '../Link'
import { Media } from '../Media'

import classes from './index.module.scss'

export async function Footer() {
  let footer: FooterType | null = null

  try {
    footer = await fetchFooter()
  } catch (error) {
    // When deploying this template on Payload Cloud, this page needs to build before the APIs are live
    // So swallow the error here and simply render the footer without nav items if one occurs
    // in production you may want to redirect to a 404  page or at least log the error somewhere
    // console.error(error)
  }

  const navItems = footer?.navItems || []

  return (
    <footer className={classes.footer}>
      <Gutter className={classes.wrap}>
        <Link href="/">
          <picture>
            <img className={classes.logo} alt="ECSS Logo" src="/ecss-light.svg" />
          </picture>
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

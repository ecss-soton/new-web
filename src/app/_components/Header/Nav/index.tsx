'use client'

import React from 'react'
import { CssVariable } from '@next/font'
import { Inter } from '@next/font/google'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Header as HeaderType, Page } from '../../../../payload/payload-types'
import { useAuth } from '../../../_providers/Auth'
import { CMSLink } from '../../Link'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

export const HeaderNav: React.FC<{ header: HeaderType }> = ({ header }) => {
  const navItems = header?.navItems || []
  const { user } = useAuth()
  const currentPath = usePathname()

  return (
    <nav
      className={[
        classes.nav,
        // fade the nav in on user load to avoid flash of content and layout shift
        // Vercel also does this in their own website header, see https://vercel.com
        user === undefined && classes.hide,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {navItems.map(({ link }, i) => {
        const slug = (link.reference?.value as Page)?.slug
        const isActive = link.url === currentPath || `/${slug}` === currentPath
        const style: React.CSSProperties = isActive
          ? {
              color: 'red',
              opacity: 1,
            }
          : {
              color: 'red',
            }
        const label = (
          <div className={classes.fadeIn}>
            <span style={style} className={classes.redBrackets}>
              [&nbsp;
            </span>
            {link.label}
            <span style={style} className={classes.redBrackets}>
              &nbsp;]
            </span>
          </div>
        )
        return <CMSLink key={i} {...link} label={label} appearance="header" />
      })}
      {user && (
        <Link href="/account" className={[inter.className, classes.account].join(' ')}>
          <>
            <span className={classes.redBrackets}>&nbsp;&nbsp;</span>
            Account
            <span className={classes.redBrackets}>&nbsp;&nbsp;</span>
          </>
        </Link>
      )}
      {/*
        // Uncomment this code if you want to add a login link to the header
        {!user && (
          <React.Fragment>
            <Link href="/login">Login</Link>
            <Link href="/create-account">Create Account</Link>
          </React.Fragment>
        )}
      */}
    </nav>
  )
}

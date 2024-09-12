'use client'

import React, { useCallback, useEffect, useState } from 'react'
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

interface HeaderNavComponentProps {
  header: HeaderType
  onToggleMenu: (isOpen: boolean) => void
  onIsBreakpoint: boolean
}

export const HeaderNav: React.FC<HeaderNavComponentProps> = ({
  header,
  onToggleMenu,
  onIsBreakpoint,
}) => {
  const navItems = header?.navItems || []
  const { user } = useAuth()
  const currentPath = usePathname()

  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => {
    const newIsOpen = !isOpen
    setIsOpen(newIsOpen)
    onToggleMenu(newIsOpen)
  }

  const burger1: React.CSSProperties = {
    transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
  }

  const burger2: React.CSSProperties = {
    transform: isOpen ? 'translateX(100%)' : 'translateX(0)',
    opacity: isOpen ? 0 : 1,
  }

  const burger3: React.CSSProperties = {
    transform: isOpen ? 'rotate(-45deg)' : 'rotate(0)',
  }

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
      {onIsBreakpoint ? (
        <div className={classes.menuContainer}>
          <div className={classes.hamburger} onClick={toggleMenu}>
            <div style={burger1} className={classes.burger} />
            <div style={burger2} className={classes.burger} />
            <div style={burger3} className={classes.burger} />
          </div>
        </div>
      ) : (
        <div>
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
            <Link
              href="/account"
              className={[inter.className, classes.account, classes.fadeIn].join(' ')}
            >
              <>
                <span className={classes.redBrackets}>&#91;&nbsp;</span>
                Account
                <span className={classes.redBrackets}>&nbsp;&#93;</span>
              </>
            </Link>
          )}
        </div>
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

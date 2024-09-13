'use client'

{
  /* eslint-disable @next/next/no-img-element */
}

import React, { useCallback, useEffect, useState } from 'react'
import { Inter } from '@next/font/google'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Header as HeaderType, Page } from '../../../payload/payload-types'
import { fetchHeader } from '../../_api/fetchGlobals'
import { useAuth } from '../../_providers/Auth'
import { useTheme } from '../../_providers/Theme'
import { Gutter } from '../Gutter'
import { CMSLink } from '../Link'
import { ThemeImage } from '../ThemeImage'
import { HeaderNav } from './Nav'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

const useMediaQuery = width => {
  const [targetReached, setTargetReached] = useState(false)

  const updateTarget = useCallback(e => {
    if (e.matches) {
      setTargetReached(true)
    } else {
      setTargetReached(false)
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${width}px)`)
    media.addEventListener('change', updateTarget)

    // Check on mount (callback is not called until a change occurs)
    if (media.matches) {
      setTargetReached(true)
    }

    return () => media.removeEventListener('change', updateTarget)
  }, [])

  return targetReached
}

const fetchHeaderData = async () => {
  try {
    const header = await fetchHeader()
    return header
  } catch (error) {
    // Handle the error appropriately
    // console.error(error);
    return null
  }
}

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [header, setHeader] = useState<HeaderType | null>(null)
  const { user } = useAuth()
  const currentPath = usePathname()
  const isBreakpoint = useMediaQuery(900)

  useEffect(() => {
    const getHeaderData = async () => {
      const headerData = await fetchHeaderData()
      setHeader(headerData)
    }

    getHeaderData()
  }, [])

  const toggleMenu = (newIsOpen: boolean) => {
    setIsOpen(newIsOpen)
  }

  return (
    <>
      <header className={classes.header}>
        <Gutter className={classes.wrap}>
          <Link href="/" className={classes.home}>
            {/* Cannot use the `<picture>` element here with `srcSet`
              This is because the theme is able to be overridden by the user
              And so `@media (prefers-color-scheme: dark)` will not work
              Instead, we just use CSS to invert the color via `filter: invert(1)` based on `[data-theme="dark"]`
            */}
            <ThemeImage
              className={classes.logo}
              src="/ecss.svg"
              darksrc="ecss-light.svg"
              alt="ECSS logo"
            />
            {/* <span className={[classes.title, inter.className].join(' ')}>ECSS</span> */}
          </Link>
          <HeaderNav onToggleMenu={toggleMenu} header={header} onIsBreakpoint={isBreakpoint} />
        </Gutter>
        {isBreakpoint && (
          <div className={`${classes.menu} ${isOpen ? classes.open : ''}`}>
            {header?.navItems.map(({ link }, i) => {
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
                    &nbsp;[&nbsp;
                  </span>
                  {link.label}
                  <span style={style} className={classes.redBrackets}>
                    &nbsp;]&nbsp;
                  </span>
                </div>
              )
              return <CMSLink key={i} {...link} label={label} appearance="header" />
            })}
          </div>
        )}
      </header>
    </>
  )
}

export default Header

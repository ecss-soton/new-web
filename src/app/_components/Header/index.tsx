'use client'

/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Header as HeaderType, Page, Settings } from '../../../payload/payload-types'
import { fetchHeader, fetchSettings } from '../../_api/fetchGlobals'
import { useAuth } from '../../_providers/Auth'
import { Gutter } from '../Gutter'
import { CMSLink } from '../Link'
import { ThemeImage } from '../ThemeImage'
import { HeaderNav } from './Nav'

import classes from './index.module.scss'

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

    if (media.matches) {
      setTargetReached(true)
    }

    return () => media.removeEventListener('change', updateTarget)
  }, [updateTarget, width])

  return targetReached
}

const fetchHeaderData = async () => {
  try {
    const header = await fetchHeader()
    return header
  } catch (error) {
    return null
  }
}

const fetchSettingsData = async () => {
  try {
    const settings = await fetchSettings()
    return settings
  } catch (error) {
    return null
  }
}

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [header, setHeader] = useState<HeaderType | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const { user } = useAuth()
  const currentPath = usePathname()
  const isBreakpoint = useMediaQuery(1100)

  useEffect(() => {
    const getData = async () => {
      const [headerData, settingsData] = await Promise.all([fetchHeaderData(), fetchSettingsData()])
      setHeader(headerData)
      setSettings(settingsData)
    }

    getData()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleMenu = (newIsOpen: boolean) => {
    setIsOpen(newIsOpen)
  }

  const logoSrc =
    settings?.siteLogo && typeof settings.siteLogo !== 'string' && settings.siteLogo.url
      ? settings.siteLogo.url
      : '/ecss.svg'

  const logoDarkSrc =
    settings?.siteLogoDark && typeof settings.siteLogoDark !== 'string' && settings.siteLogoDark.url
      ? settings.siteLogoDark.url
      : settings?.siteLogo && typeof settings.siteLogo !== 'string' && settings.siteLogo.url
      ? settings.siteLogo.url
      : '/ecss-light.svg'

  const logoAlt =
    settings?.siteLogo && typeof settings.siteLogo !== 'string' && settings.siteLogo.alt
      ? settings.siteLogo.alt
      : 'ECSS logo'

  return (
    <>
      <header
        className={[classes.header, isScrolled ? classes.scrolled : ''].filter(Boolean).join(' ')}
      >
        <Gutter className={classes.wrap}>
          <Link href="/" className={classes.home}>
            <ThemeImage
              className={classes.logo}
              src={logoSrc}
              darksrc={logoDarkSrc}
              alt={logoAlt}
            />
          </Link>
          <HeaderNav onToggleMenu={toggleMenu} header={header} onIsBreakpoint={isBreakpoint} />
        </Gutter>
        {isBreakpoint && (
          <div className={`${classes.menu} ${isOpen ? classes.open : ''}`}>
            {header?.navItems.map(({ link }, i) => {
              const slug = (link.reference?.value as Page)?.slug
              const isActive = link.url === currentPath || `/${slug}` === currentPath
              const label = (
                <div className={classes.fadeIn}>
                  <span className={classes.redBrackets}>&nbsp;[&nbsp;</span>
                  {link.label}
                  <span className={classes.redBrackets}>&nbsp;]&nbsp;</span>
                </div>
              )
              return <CMSLink key={i} {...link} label={label} appearance="header" />
            })}
            {user && (
              <Link href="/account" className={classes.menuAccountLink}>
                <span className={classes.redBrackets}>&nbsp;[&nbsp;</span>
                Account
                <span className={classes.redBrackets}>&nbsp;]&nbsp;</span>
              </Link>
            )}
          </div>
        )}
      </header>
    </>
  )
}

export default Header

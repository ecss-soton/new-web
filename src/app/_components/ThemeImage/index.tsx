/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useEffect, useState } from 'react'

import { useTheme } from '../../_providers/Theme'
import { themeLocalStorageKey } from '../../_providers/Theme/shared'

export const ThemeImage: React.FC<{
  src: string
  darksrc: string
  alt: string
  className: string
}> = ({ src, darksrc, alt, className }) => {
  const { theme } = useTheme()
  const [logoSrc, setLogoSrc] = useState(src) // Default to light theme image

  useEffect(() => {
    let newTheme
    if (typeof window !== 'undefined') {
      // Check if running in the browser
      if (!theme) {
        newTheme = window.localStorage.getItem(themeLocalStorageKey)
      } else {
        newTheme = theme
      }
    } else {
      // Default to light theme if running on the server
      newTheme = 'light'
    }

    const updatedLogoSrc = newTheme === 'dark' ? darksrc : src
    setLogoSrc(updatedLogoSrc)
  }, [theme, src, darksrc])

  return <img className={className} src={logoSrc} alt={alt} />
}

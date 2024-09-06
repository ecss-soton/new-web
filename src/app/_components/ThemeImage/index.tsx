/* eslint-disable @next/next/no-img-element */
'use client'

import React from 'react'

import { useTheme } from '../../_providers/Theme'

export const ThemeImage: React.FC<{
  src: string
  darksrc: string
  alt: string
  className: string
}> = ({ src, darksrc, alt, className }) => {
  const { theme } = useTheme()

  const logoSrc = theme === 'dark' ? darksrc : src

  return <img className={className} src={logoSrc} alt={alt} />
}

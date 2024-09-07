{
  /* eslint-disable @next/next/no-img-element */
}

import React from 'react'
import { Inter } from '@next/font/google'
import Link from 'next/link'

import { Header } from '../../../payload/payload-types'
import { fetchHeader } from '../../_api/fetchGlobals'
import { useTheme } from '../../_providers/Theme'
import { Gutter } from '../Gutter'
import { ThemeImage } from '../ThemeImage'
import { HeaderNav } from './Nav'

import classes from './index.module.scss'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

export async function Header() {
  let header: Header | null = null

  try {
    header = await fetchHeader()
  } catch (error) {
    // When deploying this template on Payload Cloud, this page needs to build before the APIs are live
    // So swallow the error here and simply render the header without nav items if one occurs
    // in production you may want to redirect to a 404  page or at least log the error somewhere
    // console.error(error)
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
          <HeaderNav header={header} />
        </Gutter>
      </header>
    </>
  )
}

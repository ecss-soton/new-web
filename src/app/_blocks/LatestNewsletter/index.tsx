import React from 'react'
import Link from 'next/link'

import type { Newsletter, Page } from '../../../payload/payload-types'
import { fetchDocs } from '../../_api/fetchDoc'
import { Gutter } from '../../_components/Gutter'
import { inter } from '../../_utilities/font'

import classes from './index.module.scss'

type Props = Extract<Page['layout'][0], { blockType: 'latestNewsletter' }>

export const LatestNewsletterBlock = async ({
  subheading = 'Latest Newsletter',
  linkText = 'Read the latest issue →',
}: Props & { id?: string }) => {
  let newsletter: Newsletter | null = null

  try {
    const newsletters = await fetchDocs<Newsletter>('newsletters')
    newsletter = newsletters?.[0] ?? null
  } catch (error) {
    newsletter = null
  }

  if (!newsletter?.slug) return null

  const href = `/news/${newsletter.slug}`

  return (
    <Gutter className={[classes.block, inter.className].join(' ')}>
      <p className={classes.subheading}>{subheading}</p>
      <h2 className={classes.title}>
        <Link href={href}>{newsletter.title}</Link>
      </h2>
      {newsletter.summary && <p className={classes.summary}>{newsletter.summary}</p>}
      <Link href={href} className={classes.link}>
        {linkText}
      </Link>
    </Gutter>
  )
}

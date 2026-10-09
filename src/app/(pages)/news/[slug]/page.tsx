import React from 'react'
import { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import type { Newsletter, Settings } from '../../../../payload/payload-types'
import { fetchDoc, fetchDocs } from '../../../_api/fetchDoc'
import { fetchSettings } from '../../../_api/fetchGlobals'
import { Gutter } from '../../../_components/Gutter'
import { generateMeta } from '../../../_utilities/generateMeta'
import { Masthead } from '../Masthead'
import { NewsletterLayout } from './NewsletterLayout'

import classes from './index.module.scss'

export default async function NewsletterPage({ params: { slug } }) {
  const { isEnabled: isDraftMode } = draftMode()

  let newsletter: Newsletter | null = null

  try {
    newsletter = await fetchDoc<Newsletter>({
      collection: 'newsletters',
      slug,
      draft: isDraftMode,
    })
  } catch (error) {
    console.error(error) // eslint-disable-line no-console
  }

  if (!newsletter) {
    notFound()
  }

  const { issueNumber, publishedAt, printEdition, layout } = newsletter

  const date = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : null

  const pdf = printEdition && typeof printEdition === 'object' ? printEdition : null

  let settings: Settings | null = null

  try {
    settings = await fetchSettings()
  } catch (error) {
    console.error(error) // eslint-disable-line no-console
  }

  const mastheadTitle = settings?.newsMastheadTitle || 'The ECSS Times'
  const mastheadEyebrow =
    settings?.newsMastheadEyebrow ||
    'University of Southampton Electronics & Computer Science Society'
  const printEditionLabel = settings?.newsPrintEditionLabel || 'Download the print edition (PDF)'

  return (
    <div className="news-page">
      <Gutter className={classes.page}>
        <Masthead
          title={mastheadTitle}
          eyebrow={mastheadEyebrow}
          href="/news"
          issueNumber={issueNumber}
          date={date}
        />
        <NewsletterLayout blocks={layout} />
        {pdf && (
          <p className={classes.printEdition}>
            <a
              href={pdf.url ?? `${process.env.NEXT_PUBLIC_SERVER_URL}/media/${pdf.filename}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {printEditionLabel}
            </a>
          </p>
        )}
      </Gutter>
    </div>
  )
}

export async function generateStaticParams() {
  try {
    const newsletters = await fetchDocs<Newsletter>('newsletters')
    return newsletters.flatMap(issue => (issue.slug ? [{ slug: issue.slug }] : []))
  } catch (error) {
    return []
  }
}

export async function generateMetadata({ params: { slug } }): Promise<Metadata> {
  const { isEnabled: isDraftMode } = draftMode()

  let newsletter: Newsletter | null = null

  try {
    newsletter = await fetchDoc<Newsletter>({
      collection: 'newsletters',
      slug,
      draft: isDraftMode,
    })
  } catch (error) {} // eslint-disable-line no-empty

  return generateMeta({ doc: newsletter, fallbackImage: newsletter.coverImage })
}

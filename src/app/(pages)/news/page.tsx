import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'

import type { Newsletter, Settings } from '../../../payload/payload-types'
import { fetchDocs } from '../../_api/fetchDoc'
import { fetchSettings } from '../../_api/fetchGlobals'
import { Gutter } from '../../_components/Gutter'
import { Media } from '../../_components/Media'
import { playfair, sourceSerif } from '../../_utilities/font'
import { Masthead } from './Masthead'

import classes from './index.module.scss'

export default async function NewsPage() {
  let newsletters: Newsletter[] = []
  let settings: Settings | null = null

  try {
    newsletters = await fetchDocs<Newsletter>('newsletters')
  } catch (error) {
    console.error(error) // eslint-disable-line no-console
  }

  try {
    settings = await fetchSettings()
  } catch (error) {
    console.error(error) // eslint-disable-line no-console
  }

  const mastheadTitle = settings?.newsMastheadTitle || 'The ECSS Times'
  const mastheadEyebrow =
    settings?.newsMastheadEyebrow ||
    'University of Southampton Electronics & Computer Science Society'
  const tagline = settings?.newsArchiveTagline || ''
  const emptyState = settings?.newsEmptyState || ''
  const coverPlaceholder = settings?.newsCoverPlaceholder || ''
  const readIssueLabel = settings?.newsReadIssueLabel || ''

  return (
    <div className="news-page">
      <Gutter className={classes.page}>
        <Masthead title={mastheadTitle} eyebrow={mastheadEyebrow} tagline={tagline} />

        {newsletters.length === 0 ? (
          <p className={[classes.empty, sourceSerif.className].join(' ')}>{emptyState}</p>
        ) : (
          <ul className={classes.archive}>
            {newsletters.map(issue => {
              const { id, slug, title, issueNumber, publishedAt, summary, coverImage } = issue
              const date = publishedAt
                ? new Date(publishedAt).toLocaleDateString('en-GB', {
                    month: 'long',
                    year: 'numeric',
                  })
                : null

              return (
                <li key={id} className={classes.issue}>
                  <Link href={`/news/${slug}`} className={classes.issueLink}>
                    <div className={classes.cover}>
                      {coverImage && typeof coverImage === 'object' ? (
                        <Media resource={coverImage} />
                      ) : (
                        <span className={[classes.coverPlaceholder, playfair.className].join(' ')}>
                          {issueNumber ? `Issue ${issueNumber}` : coverPlaceholder}
                        </span>
                      )}
                    </div>
                    <div className={classes.issueMeta}>
                      <p className={classes.issueKicker}>
                        {issueNumber ? `Issue ${issueNumber}` : 'Newsletter'}
                        {date ? ` · ${date}` : null}
                      </p>
                      <h2 className={[classes.issueTitle, playfair.className].join(' ')}>
                        {title}
                      </h2>
                      {summary && (
                        <p className={[classes.issueSummary, sourceSerif.className].join(' ')}>
                          {summary}
                        </p>
                      )}
                      <span className={classes.readMore}>{readIssueLabel} &rarr;</span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Gutter>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  let settings: Settings | null = null

  try {
    settings = await fetchSettings()
  } catch (error) {} // eslint-disable-line no-empty

  return {
    title: settings?.newsSeoTitle || 'The ECSS Times',
    description: settings?.newsSeoDescription || 'Monthly newsletters and the ECSS Times archive.',
  }
}

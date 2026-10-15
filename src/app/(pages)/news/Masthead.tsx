import React from 'react'
import Link from 'next/link'

import { newsreader } from '../../_utilities/font'

import classes from './Masthead.module.scss'

const DEFAULT_TITLE = 'The ECSS Times'
const DEFAULT_EYEBROW = 'University of Southampton Electronics & Computer Science Society'

type Props = {
  title?: string
  eyebrow?: string
  href?: string
  isDraft?: boolean
  issueNumber?: number | null
  date?: string | null
  tagline?: string
}

export const Masthead: React.FC<Props> = ({
  title = DEFAULT_TITLE,
  eyebrow = DEFAULT_EYEBROW,
  href,
  isDraft,
  issueNumber,
  date,
  tagline,
}) => {
  const hasIssueLine = Boolean(issueNumber || date)

  return (
    <header className={classes.masthead}>
      <p className={classes.above}>{eyebrow}</p>
      {isDraft && <p className={classes.draft}>This is a draft</p>}
      <h1 className={[classes.title, newsreader.className].join(' ')}>
        {href ? <Link href={href}>{title}</Link> : title}
      </h1>
      {hasIssueLine && (
        <p className={classes.issueLine}>
          {issueNumber ? `Issue ${issueNumber}` : null}
          {issueNumber && date ? ' · ' : null}
          {date}
        </p>
      )}
      {!hasIssueLine && tagline && <p className={classes.issueLine}>{tagline}</p>}
    </header>
  )
}

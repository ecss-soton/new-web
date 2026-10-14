import React from 'react'

import { Newsletter } from '../../../payload/payload-types'
import { newsreader, spectral } from '../../_utilities/font'
import { getSafeHref } from '../../_utilities/getSafeHref'

import classes from './index.module.scss'

type Props = Extract<Newsletter['layout'][0], { blockType: 'briefs' }>

export const Briefs: React.FC<Props> = ({ heading, entries, briefsSpan = 'full' }) => {
  if (!entries?.length) return null

  return (
    <section className={[classes.briefs, spectral.className].join(' ')} data-span={briefsSpan}>
      <h3 className={[classes.heading, newsreader.className].join(' ')}>{heading}</h3>
      <ul className={classes.list}>
        {entries.map((entry, index) => {
          const href = getSafeHref(entry.url)
          const isExternal = href?.startsWith('http')
          return (
            <li key={entry.id ?? index} className={classes.entry}>
              {entry.title && <h4 className={classes.entryTitle}>{entry.title}</h4>}
              {entry.text && <p className={classes.entryText}>{entry.text}</p>}
              {href && (
                <a
                  className={classes.link}
                  href={href}
                  {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {entry.linkLabel || 'Read more'}
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

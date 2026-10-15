import React, { useState } from 'react'
import moment from 'moment-timezone'
import Image from 'next/image'

import { Hackathon, Media } from '../../../payload/payload-types'
import { inter } from '../../_utilities/font'
import { getSafeHref } from '../../_utilities/getSafeHref'
import RichText from '../RichText'

import classes from './index.module.scss'

const formatDate = (value?: string | null) =>
  value ? moment.utc(value).tz('Europe/London').format('D MMM YYYY, HH:mm') : null

const getDescriptionLength = (desc: Hackathon['description']): number => {
  if (!desc) return 0
  const walk = (nodes: unknown[]): number =>
    nodes.reduce<number>((total, node) => {
      if (node && typeof node === 'object') {
        const { text, children } = node as { text?: unknown; children?: unknown }
        if (typeof text === 'string') total += text.length
        if (Array.isArray(children)) total += walk(children)
      }
      return total
    }, 0)
  return walk(desc as unknown[])
}

export const HackathonItem: React.FC<{ hackathon: Hackathon }> = ({ hackathon }) => {
  const { name, startDate, endDate, location, mapsUrl, description, image, organiser, prize } =
    hackathon
  const [isExpanded, setIsExpanded] = useState(false)

  let imageUrl: string | null = null
  let imageAlt = name
  if (image && typeof image === 'object') {
    const media = image as Media
    imageUrl = media.url || null
    if (media.alt) imageAlt = media.alt
  }

  const start = formatDate(startDate)
  const end = formatDate(endDate)
  const dateLabel = end && end !== start ? `${start} - ${end}` : start

  const mapHref = getSafeHref(mapsUrl)

  const links = [
    { key: 'website', label: 'Website', href: getSafeHref(hackathon.websiteUrl) },
    { key: 'apply', label: 'Apply', href: getSafeHref(hackathon.applyUrl) },
    { key: 'luma', label: 'Luma', href: getSafeHref(hackathon.lumaUrl) },
    { key: 'discord', label: 'Discord', href: getSafeHref(hackathon.discordUrl) },
  ].filter((link): link is { key: string; label: string; href: string } => Boolean(link.href))

  return (
    <article className={[classes.card, inter.className].join(' ')}>
      {imageUrl && (
        <div className={classes.imageWrapper}>
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className={classes.image}
            sizes="(max-width: 768px) 100vw, 400px"
          />
        </div>
      )}

      <div className={classes.body}>
        <h3 className={classes.name}>{name}</h3>

        <div className={classes.meta}>
          {dateLabel && <span>{dateLabel}</span>}
          {location && (
            <span>
              {location}
              {mapHref && (
                <>
                  {' - '}
                  <a href={mapHref} target="_blank" rel="noopener noreferrer">
                    Map
                  </a>
                </>
              )}
            </span>
          )}
          {organiser && <span>Organised by {organiser}</span>}
          {prize && <span className={classes.prize}>Prize: {prize}</span>}
        </div>

        {description && (
          <div className={classes.description}>
            <div className={!isExpanded ? classes.truncated : ''}>
              <RichText content={description} />
            </div>
            {getDescriptionLength(description) > 150 && (
              <button className={classes.expandButton} onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? 'Show Less' : 'Read More'}
              </button>
            )}
          </div>
        )}

        {links.length > 0 && (
          <div className={classes.links}>
            {links.map(link => (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={classes.linkButton}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

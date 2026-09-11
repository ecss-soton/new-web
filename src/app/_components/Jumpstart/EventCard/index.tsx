'use client'

import React, { useState } from 'react'
import moment from 'moment-timezone'

import type { Event } from '../../../../payload/payload-types'
import { Media } from '../../../_components/Media'
import RichText from '../../../_components/RichText'
import { bungee, inter } from '../../../_utilities/font'

import classes from './index.module.scss'

const CATEGORY_COLORS: Record<string, string> = {
  welcome: 'var(--jumpstart-cat-welcome)',
  academic: 'var(--jumpstart-cat-academic)',
  social: 'var(--jumpstart-cat-social)',
  competitive: 'var(--jumpstart-cat-competitive)',
}

const ROTATIONS = [-1, 0.8, -0.5, 1.2, -0.8, 0.3, -1.1, 0.7]

type Props = {
  event: Event
  index: number
}

const TIMEZONE = 'Europe/London'

const formatTimeRange = (startDate: string, endTime?: string | null): string => {
  const start = moment.utc(startDate).tz(TIMEZONE).format('HH:mm')
  if (!endTime) return start
  const end = moment.utc(endTime).tz(TIMEZONE).format('HH:mm')
  return `${start} – ${end}`
}

function extractPlainText(nodes: { text?: string; children?: unknown[] }[]): string {
  let out = ''
  for (const node of nodes) {
    if (typeof node.text === 'string') out += node.text
    if (Array.isArray(node.children))
      out += extractPlainText(node.children as { text?: string; children?: unknown[] }[])
  }
  return out
}

function getDescriptionLength(desc: unknown): number {
  if (typeof desc === 'string') return desc.length
  if (Array.isArray(desc))
    return extractPlainText(desc as { text?: string; children?: unknown[] }[]).length
  return 0
}

export const JumpstartEventCard: React.FC<Props> = ({ event, index }) => {
  const { name, date, endTime, location, description, mapsUrl, link, image, jumpstartCategory } =
    event

  const [isExpanded, setIsExpanded] = useState(false)

  const catKey = jumpstartCategory && CATEGORY_COLORS[jumpstartCategory] ? jumpstartCategory : null
  const catColor = catKey ? CATEGORY_COLORS[catKey] : 'var(--jumpstart-neon-magenta)'
  const rotation = ROTATIONS[index % ROTATIONS.length]
  const timeRange = formatTimeRange(date, endTime)

  const rawDesc: unknown = description
  const isRich = Array.isArray(rawDesc)
  const descLength = getDescriptionLength(rawDesc)
  const showToggle = descLength > 150

  return (
    <div
      className={[classes.card, inter.className].join(' ')}
      style={
        {
          '--card-cat': catColor,
          '--card-rotation': `${rotation}deg`,
        } as React.CSSProperties
      }
    >
      {image && typeof image !== 'string' && (
        <div className={classes.imageColumn}>
          <Media resource={image} className={classes.image} imgClassName={classes.imageImg} />
        </div>
      )}
      <div className={classes.content}>
        <div className={classes.titleRow}>
          <h3 className={[classes.title, bungee.className].join(' ')}>{name}</h3>
          <span className={classes.time}>{timeRange}</span>
        </div>
        {location && <p className={classes.location}>{location}</p>}
        {rawDesc != null && rawDesc !== '' && (
          <div className={classes.descriptionBox}>
            <div className={!isExpanded ? classes.truncatedDesc : ''}>
              {isRich ? (
                <RichText content={rawDesc} className={classes.richTextDescription} />
              ) : (
                <p className={classes.description}>{rawDesc as string}</p>
              )}
            </div>
            {showToggle && (
              <button
                type="button"
                className={classes.expandButton}
                onClick={() => setIsExpanded(v => !v)}
              >
                {isExpanded ? 'Show Less' : 'Read More'}
              </button>
            )}
          </div>
        )}
        <div className={classes.actions}>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={[classes.mapsButton, bungee.className].join(' ')}
            >
              GET ME THERE
            </a>
          )}
          {link && link.startsWith('https://') && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={[classes.linkButton, bungee.className].join(' ')}
            >
              EVENT LINK
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

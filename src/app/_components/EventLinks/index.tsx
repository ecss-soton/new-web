import React from 'react'

import type { Event } from '../../../payload/payload-types'
import { getSafeHref } from '../../_utilities/getSafeHref'

type LinkKey = 'link' | 'luma' | 'discord'

type EventLink = {
  key: LinkKey
  label: string
  href: string
}

export const getEventLinks = (
  event: Pick<Event, 'link' | 'lumaUrl' | 'discordUrl'>,
): EventLink[] => {
  const links: EventLink[] = []

  const link = getSafeHref(event.link)
  const luma = getSafeHref(event.lumaUrl)
  const discord = getSafeHref(event.discordUrl)

  if (link) links.push({ key: 'link', label: 'Event Link', href: link })
  if (luma) links.push({ key: 'luma', label: 'Luma', href: luma })
  if (discord) links.push({ key: 'discord', label: 'Discord', href: discord })

  return links
}

type Props = {
  event: Pick<Event, 'link' | 'lumaUrl' | 'discordUrl' | 'discordInterestedCount'>
  linkClassName?: string
  labels?: Partial<Record<LinkKey, string>>
  discordCountClassName?: string
  wrapperClassName?: string
}

export const EventLinks: React.FC<Props> = ({
  event,
  linkClassName,
  labels,
  discordCountClassName,
  wrapperClassName,
}) => {
  const links = getEventLinks(event)
  const discordCount = event.discordInterestedCount ?? 0

  if (links.length === 0) return null

  const content = (
    <>
      {links.map(({ key, label, href }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          {labels?.[key] ?? label}
        </a>
      ))}
      {discordCount > 0 && (
        <span className={discordCountClassName} title="Number of people interested on Discord">
          {discordCount} interested on Discord
        </span>
      )}
    </>
  )

  return wrapperClassName ? <div className={wrapperClassName}>{content}</div> : content
}

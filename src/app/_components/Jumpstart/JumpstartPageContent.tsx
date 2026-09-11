import React from 'react'
import moment from 'moment-timezone'
import nextDynamic from 'next/dynamic'

import type { Event, Settings } from '../../../payload/payload-types'
import { JumpstartFaq } from './Faq'
import { JumpstartHero } from './JumpstartHero'
import { JumpstartTimeline } from './Timeline'

import mapPageClasses from './MapPage.module.scss'
import wrapperClasses from './pageWrapper.module.scss'

const JumpstartViewToggle = nextDynamic(
  () => import('./ViewToggle').then(mod => mod.JumpstartViewToggle),
  { ssr: false },
)

const JumpstartMapView = nextDynamic(() => import('./MapView').then(mod => mod.JumpstartMapView), {
  ssr: false,
})

const TIMEZONE = 'Europe/London'

const computeDateRange = (events: Event[]): string | null => {
  const dates = events
    .map(e => {
      try {
        return moment.utc(e.date).tz(TIMEZONE)
      } catch {
        return null
      }
    })
    .filter((d): d is moment.Moment => d !== null)
    .sort((a, b) => a.valueOf() - b.valueOf())

  if (dates.length === 0) return null

  const first = dates[0]
  const last = dates[dates.length - 1]

  const firstFormatted = first.format('Do')
  const lastFormatted = last.format('Do MMMM YYYY')

  return `${firstFormatted} – ${lastFormatted}`
}

type Props = {
  currentView?: string
  settings: Settings | null
  events: Event[]
}

export const JumpstartPageContent: React.FC<Props> = ({
  currentView = 'timeline',
  settings,
  events,
}) => {
  const jumpstartEvents = events.filter(e => e.isJumpstart)
  const heading = settings?.jumpstartHeading || 'Jumpstart'
  const subtitle = settings?.jumpstartSubtitle || undefined
  const faqTitle = settings?.jumpstartFaqTitle || undefined
  const faqJumpLabel = settings?.jumpstartFaqJumpLabel || 'Questions?'
  const faqs = settings?.jumpstartFaqs || undefined
  const dateRange = computeDateRange(jumpstartEvents) || undefined

  const logo =
    settings?.jumpstartLogo && typeof settings.jumpstartLogo !== 'string'
      ? {
          url: settings.jumpstartLogo.url,
          alt: settings.jumpstartLogo.alt,
        }
      : null

  if (currentView === 'map') {
    return (
      <div className={wrapperClasses.page}>
        <JumpstartHero dateRange={dateRange || ''} logo={logo} />
        <div className={mapPageClasses.page}>
          <JumpstartViewToggle />
        </div>
        <div className={mapPageClasses.mapWrapper}>
          <JumpstartMapView events={jumpstartEvents} />
        </div>
        <JumpstartFaq title={faqTitle} faqs={faqs} />
      </div>
    )
  }

  return (
    <div className={wrapperClasses.page}>
      <JumpstartHero dateRange={dateRange || ''} logo={logo} />
      <JumpstartTimeline
        events={jumpstartEvents}
        heading={heading}
        subtitle={subtitle}
        faqJumpLabel={faqJumpLabel}
      />
      <JumpstartFaq title={faqTitle} faqs={faqs} />
    </div>
  )
}

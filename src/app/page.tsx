import React from 'react'
import moment from 'moment-timezone'
import { Metadata } from 'next'
import nextDynamic from 'next/dynamic'

import type { Event, Settings } from '../payload/payload-types'
import { fetchDocs } from './_api/fetchDoc'
import { fetchSettings } from './_api/fetchGlobals'
import { JumpstartBanner } from './_components/Jumpstart/Banner'
import { JumpstartFaq } from './_components/Jumpstart/Faq'
import { JumpstartHero } from './_components/Jumpstart/JumpstartHero'
import { JumpstartTimeline } from './_components/Jumpstart/Timeline'
import PageTemplate, {
  generateMetadata as pageTemplateGenerateMetadata,
} from './(pages)/[slug]/page'

import mapPageClasses from './_components/Jumpstart/MapPage.module.scss'
import wrapperClasses from './_components/Jumpstart/pageWrapper.module.scss'

const JumpstartViewToggle = nextDynamic(
  () => import('./_components/Jumpstart/ViewToggle').then(mod => mod.JumpstartViewToggle),
  { ssr: false },
)

const JumpstartMapView = nextDynamic(
  () => import('./_components/Jumpstart/MapView').then(mod => mod.JumpstartMapView),
  { ssr: false },
)

export const dynamic = 'force-dynamic'

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

export default async function Page({ searchParams }: { searchParams: { view?: string } }) {
  let settings: Settings | null = null
  try {
    settings = await fetchSettings()
  } catch (_error) {
    // swallow — fall back to regular homepage below
  }

  if (settings?.jumpstartEnabled) {
    let events: Event[] = []
    try {
      events = await fetchDocs<Event>('events')
    } catch (_error) {
      // swallow
    }

    const jumpstartEvents = events.filter(e => e.isJumpstart)
    const heading = settings.jumpstartHeading || 'Jumpstart'
    const subtitle = settings.jumpstartSubtitle || undefined
    const faqTitle = settings.jumpstartFaqTitle || undefined
    const faqJumpLabel = settings.jumpstartFaqJumpLabel || 'Questions?'
    const faqs = settings.jumpstartFaqs || undefined
    const dateRange = computeDateRange(jumpstartEvents) || undefined
    const currentView = searchParams?.view || 'timeline'

    const logo =
      settings.jumpstartLogo && typeof settings.jumpstartLogo !== 'string'
        ? {
            url: settings.jumpstartLogo.url,
            alt: settings.jumpstartLogo.alt,
          }
        : null

    if (currentView === 'map') {
      return (
        <div className={wrapperClasses.page}>
          <JumpstartBanner />
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
        <JumpstartBanner />
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

  return await PageTemplate({ params: { slug: 'home' } })
}

export async function generateMetadata(): Promise<Metadata> {
  let settings: Settings | null = null
  try {
    settings = await fetchSettings()
  } catch (_error) {
    // swallow — fall back to normal metadata
  }

  if (settings?.jumpstartEnabled) {
    return {
      title: settings.jumpstartHeading || 'Jumpstart',
      description: settings.jumpstartSubtitle || undefined,
    }
  }

  return pageTemplateGenerateMetadata({ params: { slug: 'home' } })
}

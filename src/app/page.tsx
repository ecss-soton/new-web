import React from 'react'
import { Metadata } from 'next'
import dynamic from 'next/dynamic'

import type { Event, Settings } from '../payload/payload-types'
import { fetchDocs } from './_api/fetchDoc'
import { fetchSettings } from './_api/fetchGlobals'
import { JumpstartBanner } from './_components/Jumpstart/Banner'
import { JumpstartTimeline } from './_components/Jumpstart/Timeline'
import { inter } from './_utilities/font'
import PageTemplate, {
  generateMetadata as pageTemplateGenerateMetadata,
} from './(pages)/[slug]/page'

import mapPageClasses from './_components/Jumpstart/MapPage.module.scss'

const JumpstartViewToggle = dynamic(
  () => import('./_components/Jumpstart/ViewToggle').then(mod => mod.JumpstartViewToggle),
  { ssr: false },
)

const JumpstartMapView = dynamic(
  () => import('./_components/Jumpstart/MapView').then(mod => mod.JumpstartMapView),
  { ssr: false },
)

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
      // swallow — render timeline with empty events
    }

    const jumpstartEvents = events.filter(e => e.isJumpstart)
    const heading = settings.jumpstartHeading || 'Jumpstart'
    const subtitle = settings.jumpstartSubtitle || undefined
    const currentView = searchParams?.view || 'timeline'

    if (currentView === 'map') {
      return (
        <>
          <JumpstartBanner />
          <div className={mapPageClasses.page}>
            <div className={mapPageClasses.header}>
              <h1 className={[mapPageClasses.heading, inter.className].join(' ')}>{heading}</h1>
              {subtitle && (
                <p className={[mapPageClasses.subtitle, inter.className].join(' ')}>{subtitle}</p>
              )}
            </div>
            <JumpstartViewToggle />
          </div>
          <div className={mapPageClasses.mapWrapper}>
            <JumpstartMapView events={jumpstartEvents} />
          </div>
        </>
      )
    }

    return (
      <>
        <JumpstartBanner />
        <JumpstartTimeline events={jumpstartEvents} heading={heading} subtitle={subtitle} />
      </>
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

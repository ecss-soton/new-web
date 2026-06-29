import React from 'react'
import { Metadata } from 'next'

import type { Event, Settings } from '../payload/payload-types'
import { fetchDocs } from './_api/fetchDoc'
import { fetchSettings } from './_api/fetchGlobals'
import { JumpstartBanner } from './_components/Jumpstart/Banner'
import { JumpstartTimeline } from './_components/Jumpstart/Timeline'
import PageTemplate, {
  generateMetadata as pageTemplateGenerateMetadata,
} from './(pages)/[slug]/page'

export default async function Page() {
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

    return (
      <>
        <JumpstartBanner />
        <JumpstartTimeline
          events={jumpstartEvents}
          heading={settings.jumpstartHeading}
          subtitle={settings.jumpstartSubtitle}
        />
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

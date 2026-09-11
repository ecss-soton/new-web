import React from 'react'
import { Metadata } from 'next'

import type { Event, Settings } from '../../../payload/payload-types'
import { fetchDocs } from '../../_api/fetchDoc'
import { fetchSettings } from '../../_api/fetchGlobals'
import { JumpstartPageContent } from '../../_components/Jumpstart/JumpstartPageContent'

export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: { view?: string } }) {
  const currentView = searchParams?.view || 'timeline'

  let settings: Settings | null = null
  let events: Event[] = []

  try {
    settings = await fetchSettings()
  } catch {
    settings = null
  }

  try {
    events = await fetchDocs<Event>('events')
  } catch {
    events = []
  }

  return <JumpstartPageContent currentView={currentView} settings={settings} events={events} />
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await fetchSettings()
    return {
      title: settings?.jumpstartHeading || 'Jumpstart',
      description: settings?.jumpstartSubtitle || undefined,
    }
  } catch {
    return { title: 'Jumpstart' }
  }
}

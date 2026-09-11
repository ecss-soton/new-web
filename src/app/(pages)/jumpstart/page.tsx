import React from 'react'
import { Metadata } from 'next'

import { fetchSettings } from '../../_api/fetchGlobals'
import { JumpstartPageContent } from '../../_components/Jumpstart/JumpstartPageContent'

export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: { view?: string } }) {
  const currentView = searchParams?.view || 'timeline'
  return <JumpstartPageContent currentView={currentView} />
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

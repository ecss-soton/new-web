import React from 'react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

import type { Settings } from '../payload/payload-types'
import { fetchSettings } from './_api/fetchGlobals'
import { JumpstartSettingsProvider } from './_providers/JumpstartSettings'
import PageTemplate, {
  generateMetadata as pageTemplateGenerateMetadata,
} from './(pages)/[slug]/page'

export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: { noredirect?: string } }) {
  let settings: Settings | null = null
  try {
    settings = await fetchSettings()
  } catch (_error) {
    // swallow — fall back to regular homepage below
  }

  if (settings?.jumpstartEnabled && !searchParams?.noredirect) {
    redirect('/jumpstart')
  }

  return (
    <JumpstartSettingsProvider
      jumpstartEnabled={!!settings?.jumpstartEnabled}
      jumpstartHeading={settings?.jumpstartHeading || 'Jumpstart'}
    >
      {await PageTemplate({ params: { slug: 'home' } })}
    </JumpstartSettingsProvider>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return pageTemplateGenerateMetadata({ params: { slug: 'home' } })
}

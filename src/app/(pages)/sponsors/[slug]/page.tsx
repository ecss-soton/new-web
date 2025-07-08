import React from 'react'
import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import type { Sponsor } from '../../../../payload/payload-types'
import { fetchDoc } from '../../../_api/fetchDoc'
import { fetchDocs } from '../../../_api/fetchDocs'
import { SponsorPage } from '../../../_components/SponsorPage'

// Force this page to be dynamic so that Next.js does not cache it
// See the note in '../../../[slug]/page.tsx' about this
export const dynamic = 'force-dynamic'

export default async function Sponsor({ params: { slug } }) {
  const { isEnabled: isDraftMode } = draftMode()

  let sponsor: Sponsor | null = null

  try {
    sponsor = await fetchDoc<Sponsor>({
      collection: 'sponsors',
      slug,
      draft: isDraftMode,
    })
  } catch (error) {
    console.warn(error) // eslint-disable-line no-console
  }

  if (!sponsor) {
    notFound()
  }

  return (
    <React.Fragment>
      <SponsorPage sponsor={sponsor} />
    </React.Fragment>
  )
}

export async function generateStaticParams() {
  try {
    const sponsors = await fetchDocs<Sponsor>('sponsors')
    return sponsors?.map(({ slug }) => slug)
  } catch (error) {
    return []
  }
}

export async function generateMetadata({ params: { slug } }): Promise<Metadata> {
  const { isEnabled: isDraftMode } = draftMode()

  let sponsor: Sponsor | null = null

  try {
    sponsor = await fetchDoc<Sponsor>({
      collection: 'sponsors',
      slug,
      draft: isDraftMode,
    })
  } catch (error) {}

  return {
    title: sponsor?.name || 'Sponsor',
    description: sponsor?.description ? 'Learn more about ' + sponsor.name : undefined,
  }
}

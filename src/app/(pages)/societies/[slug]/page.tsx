import React from 'react'
import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import type { Society } from '../../../../payload/payload-types'
import { fetchDoc } from '../../../_api/fetchDoc'
import { fetchDocs } from '../../../_api/fetchDocs'
import { SocietyPage } from '../../../_components/SocietyPage'

// Force this page to be dynamic so that Next.js does not cache it
// See the note in '../../../[slug]/page.tsx' about this
export const dynamic = 'force-dynamic'

export default async function Society({ params: { slug } }) {
  const { isEnabled: isDraftMode } = draftMode()

  let society: Society | null = null

  try {
    society = await fetchDoc<Society>({
      collection: 'societies',
      slug,
      draft: isDraftMode,
    })
  } catch (error) {
    console.warn(error) // eslint-disable-line no-console
  }

  if (!society) {
    notFound()
  }

  return (
    <React.Fragment>
      <SocietyPage society={society} />
    </React.Fragment>
  )
}

export async function generateStaticParams() {
  try {
    const societies = await fetchDocs<Society>('societies')
    return societies?.map(({ slug }) => slug)
  } catch (error) {
    return []
  }
}

export async function generateMetadata({ params: { slug } }): Promise<Metadata> {
  const { isEnabled: isDraftMode } = draftMode()

  let society: Society | null = null

  try {
    society = await fetchDoc<Society>({
      collection: 'societies',
      slug,
      draft: isDraftMode,
    })
  } catch (error) {}

  return {
    title: society?.name || 'Society',
    description: society?.description ? 'Learn more about ' + society.name : undefined,
  }
}

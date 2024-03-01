import React from 'react'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import { Sponsor } from '../../../../payload/payload-types'
import { fetchDocs } from '../../../_api/fetchDocs'
import { SponsorPage } from '../../../_components/SponsorPage'
import qs from 'qs'

// Force this page to be dynamic so that Next.js does not cache it
// See the note in '../../../[slug]/page.tsx' about this
export const dynamic = 'force-dynamic'

export default async function Sponsor({ params: { slug } }) {
  const { isEnabled: isDraftMode } = draftMode()

  let sponsor: Sponsor | null = null

  const searchQuery = qs.stringify(
    {
      depth: 1,
      sort: '-level',
      where: {
        slug: {
          equals: slug,
        },
      },
    },
    { encode: false },
  )

  try {
    const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/sponsors?${searchQuery}`)

    const json = await req.json()

    const { docs } = json as { docs: Sponsor[] }

    sponsor = docs[0]
  } catch (err) {
    console.warn(err) // eslint-disable-line no-console
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
    const projects = await fetchDocs<Sponsor>('sponsors')
    return projects?.map(({ slug }) => slug)
  } catch (error) {
    return []
  }
}

// export async function generateMetadata({ params: { slug } }): Promise<Metadata> {
//   const { isEnabled: isDraftMode } = draftMode()
//
//   let sponsor: Sponsor | null = null
//
//   try {
//     sponsor = await fetchDoc<Sponsor>({
//       collection: 'projects',
//       slug,
//       draft: isDraftMode,
//     })
//   } catch (error) {}
//
//   return generateMeta({ doc: sponsor })
// }

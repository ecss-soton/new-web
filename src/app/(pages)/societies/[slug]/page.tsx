import React from 'react'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import qs from 'qs'

import { Society } from '../../../../payload/payload-types'
import { fetchDocs } from '../../../_api/fetchDocs'
import { SocietyPage } from '../../../_components/SocietyPage'

// Force this page to be dynamic so that Next.js does not cache it
// See the note in '../../../[slug]/page.tsx' about this
export const dynamic = 'force-dynamic'

export default async function Society({ params: { slug } }) {


  const { isEnabled: isDraftMode } = draftMode()

  let society: Society | null = null

  const searchQuery = qs.stringify(
    {
      depth: 1,
      where: {
        slug: {
          equals: slug,
        },
      },
    },
    { encode: false },
  )

  try {
    
    const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/societies?${searchQuery}`)

    const json = await req.json()

    const { docs } = json as { docs: Society[] }

    society = docs[0]
  } catch (err) {
    console.warn(err) // eslint-disable-line no-console
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
    const projects = await fetchDocs<Society>('societies')
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

import type { Metadata } from 'next'

import type { Media, Newsletter, Page, Post, Project } from '../../payload/payload-types'
import { mergeOpenGraph } from './mergeOpenGraph'

export const generateMeta = async (args: {
  doc: Newsletter | Page | Project | Post
  fallbackImage?: string | Media | null
}): Promise<Metadata> => {
  const { doc, fallbackImage } = args || {}

  const image = doc?.meta?.image ?? fallbackImage
  const imageUrl =
    typeof image === 'object' && image !== null && 'url' in image ? image.url : undefined

  const ogImage = imageUrl ? `${process.env.NEXT_PUBLIC_SERVER_URL}${imageUrl}` : undefined

  return {
    title: doc?.meta?.title || 'Payload',
    description: doc?.meta?.description,
    openGraph: mergeOpenGraph({
      title: doc?.meta?.title || 'Payload',
      description: doc?.meta?.description,
      url: Array.isArray(doc?.slug) ? doc?.slug.join('/') : '/',
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
    }),
  }
}

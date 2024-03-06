import type { Metadata } from 'next'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  siteName: 'ECCS',
  title: 'ECSS - University of Southampton Electronics and Computer Science Society',
  description: 'An open-source website built for ECSS.',
  images: [
    {
      url: 'https://society.ecs.soton.ac.uk/logo.png',
    },
  ],
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}

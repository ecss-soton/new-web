import type { RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies'

import type { Config } from '../../payload/payload-types'
import { EVENTS } from '../_graphql/events'
import { PAGE, PAGES } from '../_graphql/pages'
import { POST, POSTS } from '../_graphql/posts'
import { PROJECT, PROJECTS } from '../_graphql/projects'
import { SOCIETIES, SOCIETY } from '../_graphql/societies'
import { SPONSOR, SPONSORS } from '../_graphql/sponsors'
import { GRAPHQL_API_URL } from './shared'
import { payloadToken } from './token'

interface QueryConfig {
  query: string
  key: string
}

const singleQueryMap: Record<string, QueryConfig> = {
  pages: { query: PAGE, key: 'Pages' },
  posts: { query: POST, key: 'Posts' },
  projects: { query: PROJECT, key: 'Projects' },
  societies: { query: SOCIETY, key: 'Societies' },
  sponsors: { query: SPONSOR, key: 'Sponsors' },
}

const pluralQueryMap: Record<string, QueryConfig> = {
  ...singleQueryMap,
  pages: { query: PAGES, key: 'Pages' },
  posts: { query: POSTS, key: 'Posts' },
  projects: { query: PROJECTS, key: 'Projects' },
  events: { query: EVENTS, key: 'Events' },
  societies: { query: SOCIETIES, key: 'Societies' },
  sponsors: { query: SPONSORS, key: 'Sponsors' },
}

const fetchGraphQL = async <T>(
  collection: string,
  opts: {
    query: string
    key: string
    variables?: Record<string, unknown>
    draft?: boolean
    tag: string
  },
): Promise<T> => {
  const { query, key, variables, draft, tag } = opts

  let token: RequestCookie | undefined

  if (draft) {
    const { cookies } = await import('next/headers')
    token = cookies().get(payloadToken)
  }

  const res = await fetch(`${GRAPHQL_API_URL}/api/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token?.value && draft ? { Authorization: `JWT ${token.value}` } : {}),
    },
    next: { tags: [tag], revalidate: 60 },
    body: JSON.stringify({ query, variables }),
  })

  const json = await res.json()

  if (json.errors) throw new Error(json?.errors?.[0]?.message ?? 'Error fetching docs')

  return json?.data?.[key]
}

export const fetchDoc = async <T>(args: {
  collection: keyof Config['collections']
  slug?: string
  id?: string
  draft?: boolean
}): Promise<T> => {
  const { collection, slug, draft } = args || {}

  if (!singleQueryMap[collection]) throw new Error(`Collection ${collection} not found`)

  const result = await fetchGraphQL<{ docs: T[] }>(collection, {
    query: singleQueryMap[collection].query,
    key: singleQueryMap[collection].key,
    variables: { slug },
    draft,
    tag: `${collection}_${slug}`,
  })

  return result?.docs?.[0] as T
}

export const fetchDocs = async <T>(
  collection: keyof Config['collections'],
  draft?: boolean,
  variables?: Record<string, unknown>,
): Promise<T[]> => {
  if (!pluralQueryMap[collection]) throw new Error(`Collection ${collection} not found`)

  const result = await fetchGraphQL<{ docs: T[] }>(collection, {
    query: pluralQueryMap[collection].query,
    key: pluralQueryMap[collection].key,
    variables,
    draft,
    tag: collection,
  })

  return result?.docs ?? []
}

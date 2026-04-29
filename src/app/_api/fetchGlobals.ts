import type { Footer, Header, Settings } from '../../payload/payload-types'
import { FOOTER_QUERY, HEADER_QUERY, SETTINGS_QUERY } from '../_graphql/globals'
import { GRAPHQL_API_URL } from './shared'

interface GlobalConfig {
  query: string
  dataPath: string
  tag: string
  label: string
}

async function fetchGlobal<T>(config: GlobalConfig): Promise<T> {
  if (!GRAPHQL_API_URL) throw new Error('NEXT_PUBLIC_SERVER_URL not found')

  const res = await fetch(`${GRAPHQL_API_URL}/api/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    next: { tags: [config.tag], revalidate: 300 },
    body: JSON.stringify({ query: config.query }),
  })

  if (!res.ok) throw new Error(`Error fetching ${config.label}`)

  const json = await res.json()

  if (json?.errors) throw new Error(json?.errors[0]?.message || `Error fetching ${config.label}`)

  return json.data?.[config.dataPath]
}

export const fetchSettings = (): Promise<Settings> =>
  fetchGlobal<Settings>({
    query: SETTINGS_QUERY,
    dataPath: 'Settings',
    tag: 'global_settings',
    label: 'settings',
  })

export const fetchHeader = (): Promise<Header> =>
  fetchGlobal<Header>({
    query: HEADER_QUERY,
    dataPath: 'Header',
    tag: 'global_header',
    label: 'header',
  })

export const fetchFooter = (): Promise<Footer> =>
  fetchGlobal<Footer>({
    query: FOOTER_QUERY,
    dataPath: 'Footer',
    tag: 'global_footer',
    label: 'footer',
  })

export const fetchGlobals = async (): Promise<{
  settings: Settings
  header: Header
  footer: Footer
}> => {
  const [settings, header, footer] = await Promise.all([
    fetchSettings(),
    fetchHeader(),
    fetchFooter(),
  ])

  return { settings, header, footer }
}

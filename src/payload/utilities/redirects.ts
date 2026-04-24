import type { Payload } from 'payload'

interface RedirectDoc {
  from: string
  to?: {
    type?: 'reference' | 'custom' | null
    url?: string | null
    reference?: {
      relationTo?: string
      value?: {
        slug?: string | null
        _status?: 'draft' | 'published' | null
      } | null
    } | null
  } | null
}

interface RedirectRule {
  source: string
  destination: string
  permanent: boolean
}

const FALLBACK_BASE_URL = 'http://localhost:3000'

let redirectRulesPromise: Promise<RedirectRule[]> | null = null
let redirectRulesPayload: Payload | null = null

const getBaseUrl = (): string => {
  return (
    process.env.NEXT_PUBLIC_SERVER_URL || process.env.PAYLOAD_PUBLIC_SERVER_URL || FALLBACK_BASE_URL
  )
}

const normalizePath = (value: string): string => {
  const baseUrl = getBaseUrl()

  try {
    const parsed = new URL(value, baseUrl)
    const path = `${parsed.pathname}${parsed.search}`.toLowerCase()

    if (path.length > 1 && path.endsWith('/')) {
      return path.slice(0, -1)
    }

    return path
  } catch {
    const withoutQuery = value.split('?')[0].toLowerCase()

    if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
      return withoutQuery.slice(0, -1)
    }

    return withoutQuery
  }
}

const normalizeRequestPath = (value: string): string => {
  if (value.length > 1 && value.endsWith('/')) {
    return value.slice(0, -1).toLowerCase()
  }

  return value.toLowerCase()
}

const toRule = (doc: RedirectDoc): RedirectRule | null => {
  const source = normalizePath(doc.from)
  const redirectType = doc.to?.type ?? 'reference'
  let destination = ''

  if (redirectType === 'custom' && doc.to?.url) {
    destination = doc.to.url
  }

  if (redirectType === 'reference' && doc.to?.reference?.value?._status === 'published') {
    const relationPath =
      doc.to.reference.relationTo && doc.to.reference.relationTo !== 'pages'
        ? `${doc.to.reference.relationTo}/`
        : ''

    const slug = doc.to.reference.value.slug

    if (slug) {
      destination = `${getBaseUrl()}/${relationPath}${slug}`
    }
  }

  if (!source.startsWith('/') || !destination || source === destination) {
    return null
  }

  return {
    source,
    destination,
    permanent: true,
  }
}

export const matchRedirectRule = (rules: RedirectRule[], pathname: string): RedirectRule | null => {
  const normalizedPath = normalizeRequestPath(pathname)

  return (
    rules.find(rule => rule.source === normalizedPath) ??
    rules.find(rule => rule.source === `${normalizedPath}/`) ??
    null
  )
}

const loadRedirectRules = async (payload?: Payload): Promise<RedirectRule[]> => {
  if (!payload) {
    return []
  }

  const response = await payload.find({
    collection: 'redirects',
    limit: 1000,
    overrideAccess: true,
    depth: 1,
  })

  return (response.docs as RedirectDoc[])
    .map(toRule)
    .filter((rule): rule is RedirectRule => Boolean(rule))
}

export const getRedirectRules = async (payload?: Payload): Promise<RedirectRule[]> => {
  if (!redirectRulesPromise || redirectRulesPayload !== payload) {
    redirectRulesPayload = payload ?? null
    redirectRulesPromise = loadRedirectRules(payload)
  }

  return redirectRulesPromise
}

export const resetRedirectRules = (): void => {
  redirectRulesPromise = null
  redirectRulesPayload = null
}

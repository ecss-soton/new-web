const SAFE_PROTOCOLS = ['https:', 'mailto:', 'tel:']

export const getSafeHref = (href: string | null | undefined): string | undefined => {
  if (!href) return undefined
  if (href.startsWith('/') && !href.startsWith('//')) return href

  try {
    const parsed = new URL(href)
    return SAFE_PROTOCOLS.includes(parsed.protocol) ? href : undefined
  } catch {
    return undefined
  }
}

// Platform-aware map destination links for the City Challenge.
// Kept free of Payload/React imports so any client component can use it.

export type MapPlatform = 'apple' | 'android' | 'desktop'

export interface MapLinkLocation {
  name?: string | null
  link?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface DestinationLink {
  href: string
  label: string
}

/** Returns a validated HTTPS link, or null for empty/invalid/non-HTTPS values. */
function safeHttpsLink(value?: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    return url.href
  } catch {
    return null
  }
}

/**
 * Picks the map app to open based on the current device: Apple Maps on
 * iOS/iPadOS, the Android `geo:` handler (which respects the user's default
 * maps app, e.g. GrapheneOS), and Google Maps on desktop.
 */
export function detectMapPlatform(): MapPlatform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return 'apple'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export function buildMapHref(
  platform: MapPlatform,
  lat: number,
  lng: number,
  label?: string | null,
): string {
  const coords = `${lat},${lng}`
  switch (platform) {
    case 'apple':
      return `https://maps.apple.com/?ll=${coords}&q=${coords}`
    case 'android': {
      const name = label?.trim()
      return name ? `geo:${coords}?q=${coords}(${encodeURIComponent(name)})` : `geo:${coords}`
    }
    default:
      return `https://www.google.com/maps/search/?api=1&query=${coords}`
  }
}

/**
 * Resolves the best destination for a challenge. A validated HTTPS CMS link
 * always wins; otherwise the coordinates open in the device's default map app.
 * A null platform defers generated map links (used during SSR to avoid a
 * hydration mismatch) while still allowing CMS links through.
 */
export function getDestinationLink(
  location: MapLinkLocation,
  platform: MapPlatform | null,
): DestinationLink | null {
  const safe = safeHttpsLink(location.link)
  if (safe) return { href: safe, label: 'Open link now' }

  if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return null
  }
  if (!platform) return null

  return {
    href: buildMapHref(platform, location.latitude, location.longitude, location.name),
    label: 'Get me there →',
  }
}

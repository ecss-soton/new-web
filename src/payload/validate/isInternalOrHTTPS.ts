import { text } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

// Allows either a root-relative internal path (e.g. /events) or an https URL.
// Protocol-relative URLs (//host) are rejected.
export const isInternalOrHTTPS: Validate = async (value, args) => {
  if (value) {
    if (value.startsWith('/') && !value.startsWith('//')) {
      return text(value, args)
    }

    try {
      const url = new URL(value)
      if (url.protocol !== 'https:') {
        return 'Expected an https link or an internal /path'
      }
      return text(value, args)
    } catch (err: unknown) {
      return 'Expected an https link or an internal /path'
    }
  }
  return text(value, args)
}

import { text } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

const SAFE_PROTOCOLS = ['https:', 'mailto:', 'tel:']

export const isSafeLink: Validate = async (value, args) => {
  if (value) {
    try {
      const url = new URL(value)
      if (!SAFE_PROTOCOLS.includes(url.protocol)) {
        return 'Expected an https, mailto, or tel link'
      }
      return text(value, args)
    } catch {
      return 'failed to create URL'
    }
  }
  return text(value, args)
}

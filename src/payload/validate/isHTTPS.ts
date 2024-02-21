import { text } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

export const isHTTPS: Validate = async (value, args) => {
  if (value) {
    try {
      let url = new URL(value)
      if (url.protocol !== 'https') {
        return 'Expected an https link'
      }
      return text(value, args)
    } catch (err: unknown) {
      return 'failed to create URL'
    }
  }
  return text(value, args)
}

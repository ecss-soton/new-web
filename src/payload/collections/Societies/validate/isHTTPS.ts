import type { Validate } from 'payload/types'

export const isHTTPS: Validate = async value => {
  try {
    let url = new URL(value)
    if (url.protocol !== 'https') {
      return 'Expected an https link'
    }
    return true
  } catch (err: unknown) {
    return 'failed to create URL'
  }
}

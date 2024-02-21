import { number } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

export const isAnInt: Validate = (num, args) => {
  if (num && !Number.isInteger(num)) {
    return 'Expected an integer'
  }

  return number(num, args)
}

export function testMatchesRegex(regex: RegExp): Validate {
  return async value => {
    if (typeof value !== 'string') {
      return 'expected a string'
    }
    if (!regex.test(value)) {
      return 'did not match regex: ' + regex
    }
    return true
  }
}

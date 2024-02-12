import { number } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

export const isAnInt: Validate = (num, args) => {
  if (num && !Number.isInteger(num)) {
    return 'Expected an integer'
  }

  return number(num, args)
}

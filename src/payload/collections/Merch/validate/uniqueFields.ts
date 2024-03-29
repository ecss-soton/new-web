import { array } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

import type { Merch } from '../../../payload-types'

// eslint-disable-next-line no-unused-vars
type getData<In, Out> = (data: Partial<In>) => Out | undefined

export function uniqueFields<T, C = Merch>(
  getArray: getData<C, T[]>,
  getField: getData<T, string>,
  checkSizeNotOne: boolean,
): Validate {
  return (length, args) => {
    if (checkSizeNotOne && length === 1) {
      return 'Cannot have an array of size 1'
    }

    const dataArray = getArray(args.data)

    const fieldNames = Array.isArray(dataArray) ? dataArray.map(getField) : []

    if (fieldNames.length !== new Set(fieldNames).size) {
      return 'Array names are not unique'
    }

    return array(length, args)
  }
}

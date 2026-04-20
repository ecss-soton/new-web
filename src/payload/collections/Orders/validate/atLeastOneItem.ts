import { relationship } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

export const atLeastOneItem: Validate = (items, args) => {
  if (!items || items.length === 0) {
    return 'Must have at least one ticket in the basket'
  }
  return relationship(items, args)
}

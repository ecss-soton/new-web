import { relationship } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

export const atLeastOneItem: Validate = (items, args) => {
  const tickets = args.data?.tickets

  if ((!items || items.length === 0) && (!tickets || tickets.length === 0)) {
    return 'Must have at least one merch item or ticket in the basket'
  }
  return relationship(items, args)
}

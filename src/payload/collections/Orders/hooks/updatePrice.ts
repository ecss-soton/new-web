import type { BeforeChangeHook } from 'payload/dist/collections/config/types'

import type { Order } from '../../../payload-types'
import { getArrayID } from '../../../utilities/getID'

function sameElements<T>(lhs: T[], rhs: T[]): boolean {
  return lhs.length === rhs.length && lhs.every((element, index) => element === rhs[index])
}

export const updatePrice: BeforeChangeHook<Order> = async ({ data, originalDoc, req }) => {
  const orderedTicketIDs = getArrayID(data.tickets)

  if (!data.forceUpdate && sameElements(getArrayID(originalDoc?.tickets), orderedTicketIDs)) {
    return data
  }

  const orderedTickets = await req.payload.find({
    collection: 'orderedTickets',
    pagination: false,
    depth: 1,
    where: {
      id: {
        in: orderedTicketIDs,
      },
    },
  })

  // @ts-expect-error
  const ticketPrice = orderedTickets.docs.reduce((sum, ot) => sum + ot.ticket.price, 0)

  data.forceUpdate = false
  data.price = ticketPrice
  data.stripeTax = 0
  if (data.price > 0) {
    // Calculated by doing some simple napkin math
    // price = (price + stripeTax) * 0.985 - 20
    data.stripeTax = Math.ceil((3 * data.price + 4000) / 197)
  }

  return data
}

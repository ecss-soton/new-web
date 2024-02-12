import type { BeforeChangeHook } from 'payload/dist/collections/config/types'

import type { Order } from '../../../payload-types'
import { getArrayID } from '../../../utilities/getID'

function sameElements<T>(lhs: T[], rhs: T[]): boolean {
  return lhs.length === rhs.length && lhs.every((element, index) => element === rhs[index])
}

export const updatePrice: BeforeChangeHook<Order> = async ({ data, originalDoc, req }) => {
  const orderedTicketIDs = getArrayID(data.tickets)
  const orderedMerchIDs = getArrayID(data.merch)

  if (
    !data.forceUpdate &&
    sameElements(getArrayID(originalDoc?.tickets), orderedTicketIDs) &&
    sameElements(getArrayID(originalDoc?.merch), orderedMerchIDs)
  ) {
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

  const orderedMerch = await req.payload.find({
    collection: 'orderedMerch',
    pagination: false,
    depth: 1,
    where: {
      id: {
        in: orderedMerchIDs,
      },
    },
  })

  // @ts-expect-error
  const ticketPrice = orderedTickets.docs.reduce((sum, ot) => sum + ot.ticket.price, 0)

  const merchPrice = orderedMerch.docs.reduce((sum, om) => {
    // @ts-expect-error
    const variation = om.merch.variations.find(v => v.variation === om.variation)
    return sum + variation.price
  }, 0)

  data.forceUpdate = false
  data.price = ticketPrice + merchPrice
  data.stripeTax = 0
  if (data.price > 0) {
    // Calculated by doing some simple napkin math
    // price = (price + stripeTax) * 0.985 - 20
    data.stripeTax = Math.ceil((3 * data.price + 4000) / 197)
  }

  return data
}

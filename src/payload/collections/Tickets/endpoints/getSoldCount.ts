import type { Payload } from 'payload'
import type { PayloadHandler } from 'payload/config'

import type { Order } from '../../../payload-types'

export function getTicketCount(orders: Order[], ticket: string): number {
  // @ts-expect-error
  return orders.reduce((sum, val) => sum + val.tickets.filter(i => i.ticket === ticket).length, 0)
}

export async function soldCount(
  ticketID: string,
  payload: Payload,
): Promise<{ sold: number; pending: number }> {
  const result = await payload.find({
    collection: 'orders',
    pagination: false,
    depth: 1,
    where: {
      and: [
        {
          status: {
            in: ['pending', 'completed'],
          },
        },
        {
          'tickets.ticket': {
            equals: ticketID,
          },
        },
      ],
    },
  })

  const sold = getTicketCount(
    result.docs.filter(o => o.status === 'completed'),
    ticketID,
  )
  const pending = getTicketCount(
    result.docs.filter(o => o.status === 'pending'),
    ticketID,
  )

  return { sold, pending }
}

export const getSoldCount: PayloadHandler = async (req, res): Promise<void> => {
  const ticketID = req.params.id

  res.json(await soldCount(ticketID, req.payload))
}

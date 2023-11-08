import { PayloadHandler } from 'payload/config';
import { Order } from '../../../payload-types';

export function getTicketCount(orders: Order[], ticket: string): number {
  // @ts-ignore
  return orders.reduce((sum, val) => sum + val.tickets.filter((i) => i.ticket === ticket).length, 0);
}

export const getSoldCount: PayloadHandler = async (req, res): Promise<void> => {
  const ticketID = req.params.id;
  const result = await req.payload.find({
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
  });

  const sold = getTicketCount(result.docs.filter((o) => o.status === 'completed'), ticketID);
  const pending = getTicketCount(result.docs.filter((o) => o.status === 'pending'), ticketID);

  res.json({ sold, pending });
};

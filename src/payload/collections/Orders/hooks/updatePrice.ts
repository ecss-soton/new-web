import { BeforeChangeHook } from 'payload/dist/collections/config/types';
import type { Order } from '../../../payload-types';
import { getArrayID } from '../../../utilities/getID';

export const updatePrice: BeforeChangeHook<Order> = async ({
  data, originalDoc, req,
}) => {
  const orderedTicketIDs = getArrayID(data.tickets);
  const orderedMerchIDs = getArrayID(data.merch);

  // eslint-disable-next-line max-len
  if (getArrayID(originalDoc?.tickets) === orderedTicketIDs && getArrayID(originalDoc?.merch) === orderedMerchIDs) {
    return originalDoc;
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
  });

  const orderedMerch = await req.payload.find({
    collection: 'orderedMerch',
    pagination: false,
    depth: 1,
    where: {
      id: {
        in: orderedMerchIDs,
      },
    },
  });

  const ticketPrice = orderedTickets.docs.reduce((sum, ot) => sum + ot.ticket.price, 0);

  const merchPrice = orderedMerch.docs.reduce((sum, om) => {
    const variation = om.merch.variations.find((v) => v.variation === om.variation);
    return sum + variation.price;
  }, 0);

  data.price = ticketPrice + merchPrice;
  data.stripeTax = Math.ceil(data.price * 0.015) + 20;

  return data;
};

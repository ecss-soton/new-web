import type { FieldHook } from 'payload/types';

import type { Order } from '../../../payload-types';
import { getArrayID } from '../../../utilities/getID';

export const updatePrice: FieldHook<Order> = async ({
                                                      data, originalDoc, previousValue, req,
                                                    }) => {
  const orderedTicketIDs = getArrayID(data.tickets);
  const orderedMerchIDs = getArrayID(data.merch);

  // eslint-disable-next-line max-len
  if (getArrayID(originalDoc?.tickets) === orderedTicketIDs && getArrayID(originalDoc?.merch) === orderedMerchIDs) {
    return previousValue;
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

  return ticketPrice + merchPrice;
};

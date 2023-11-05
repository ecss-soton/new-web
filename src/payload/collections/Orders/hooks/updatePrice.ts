import type { FieldHook } from 'payload/types';

import type { Order } from '../../../payload-types';
import { getArrayID } from '../../../utilities/getID';

export const updatePrice: FieldHook<Order> = async ({
  data, originalDoc, previousValue, req,
}) => {
  const IDs = getArrayID(data.items.map((i) => i.value));

  if (originalDoc?.items && IDs === getArrayID(originalDoc.items.map((i) => i.value))) {
    return previousValue;
  }

  // @ts-ignore
  const orderedTicketIDs = getArrayID(data.items.filter((i) => i.relationTo === 'orderedTickets').map((i) => i.value));
  // @ts-ignore
  const orderedMerchIDs = getArrayID(data.items.filter((i) => i.relationTo === 'orderedMerch').map((i) => i.value));

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

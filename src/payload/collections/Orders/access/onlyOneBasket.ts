import { Access } from 'payload/config';
import { Order } from '../../../payload-types';

export const onlyOneBasket: Access<Order> = async ({ req: { user, payload } }) => {
  const orders = await payload.find({
    collection: 'orders',
    limit: 0,
    where: {
      and: [
        {
          user: {
            equals: user.id,
          },
        },
        {
          status: {
            equals: 'basket',
          },
        },
      ],
    },
  });

  return orders.totalDocs === 0;
};

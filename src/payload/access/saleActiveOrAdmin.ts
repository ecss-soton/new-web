import { Access } from 'payload/config';
import { checkRole } from '../collections/Users/checkRole';
import { Merch } from '../payload-types';

export const saleActiveOrAdmin: Access<Merch> = ({ req: { user } }) => {
  if (user && checkRole(['admin'], user)) {
    return true;
  }

  return {
    and: [
      {
        'sale.saleStart': {
          less_than_equal: new Date().toISOString(),
        },
      },
      {
        'sale.saleEnd': {
          greater_than_equal: new Date().toISOString(),
        },
      },
    ],
  };
};

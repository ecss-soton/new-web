import { Access } from 'payload/config';
import { checkRole } from '../../Users/checkRole';
import { Sale } from '../../../payload-types';

export const saleActiveOrAdmin: Access<Sale> = ({ req: { user } }) => {
  if (user && checkRole(['admin'], user)) {
    return true;
  }

  return {
    and: [
      {
        saleStart: {
          less_than_equal: new Date().toISOString(),
        },
      },
      {
        saleEnd: {
          greater_than_equal: new Date().toISOString(),
        },
      },
    ],
  };
};

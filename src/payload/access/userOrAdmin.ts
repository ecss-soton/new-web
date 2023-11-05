import { Access } from 'payload/config';
import { checkRole } from '../collections/Users/checkRole';
import { Merch } from '../payload-types';

export const userOrAdmin: Access<Merch> = ({ req: { user } }) => {
  if (!user) {
    return false;
  }

  if (checkRole(['admin'], user)) {
    return true;
  }

  return {
    user: {
      equals: user.id,
    },
  };
};

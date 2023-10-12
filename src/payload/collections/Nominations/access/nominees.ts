import type { FieldAccess } from 'payload/types';

import { checkRole } from '../../Users/checkRole';

export const nominee: FieldAccess = ({ req: { user }, data }) => {
  if (user?.id && data?.nominees) {
    return data.nominees.includes(user.id);
  }

  return false;
};

export const adminOrNominee: FieldAccess = ({ req: { user }, data }) => {
  if (user && checkRole(['admin'], user)) {
    return true;
  }

  if (user?.id && data?.nominees) {
    return data.nominees.includes(user.id);
  }

  return false;
};

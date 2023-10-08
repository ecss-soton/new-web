import type { FieldAccess } from 'payload/types';

import { checkRole } from '../../Users/checkRole';

export const nominee: FieldAccess = ({ req: { user }, siblingData }) => {
  if (user?.id && siblingData?.nominee) {
    return siblingData.nominee.includes(user.id);
  }
  return false;
};

export const adminOrNominee: FieldAccess = ({ req: { user }, siblingData }) => {
  if (user && checkRole(['admin'], user)) {
    return true;
  }
  if (user?.id && siblingData?.nominee) {
    return siblingData.nominee.includes(user.id);
  }
  return false;
};

import { Access } from 'payload/config';
import { checkRole } from '../../Users/checkRole';
import { ElectionResult } from '../../../payload-types';

export const publishedOrAdmin: Access<ElectionResult> = ({ req: { user } }) => {
  if (user && checkRole(['admin'], user)) {
    return true;
  }

  return {
    _status: {
      equals: 'published',
    },
  };
};

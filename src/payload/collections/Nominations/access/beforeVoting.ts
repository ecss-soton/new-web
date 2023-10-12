import type { FieldAccess } from 'payload/types';

import type { Election, Nomination } from '../../../payload-types';
import { checkRole } from '../../Users/checkRole';

export const beforeVoting: FieldAccess<Nomination> = ({ req: { user }, data }) => {
  if (user && checkRole(['admin'], user)) {
    return true;
  }

  const election = data.election as Election;
  const votingStart = Date.parse(election.votingStart);
  const now = new Date().getTime();

  return now < votingStart;
};

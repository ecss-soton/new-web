import { Validate } from 'payload/types';
import { relationship } from 'payload/dist/fields/validations';
import { checkRole } from '../../Users/checkRole';

export const addOwnId: Validate = async (userList: string[], args) => {
  if (args.user && checkRole(['admin'], args.user)) {
    return true;
  }

  if (args.operation === 'create') {
    if (userList.length === 1 && userList[0] !== args.user.id) {
      return 'Should only use own id.';
    }
    if (userList.length > 1) {
      return 'Cannot add multiple supporters';
    }
  } else if (args.operation === 'update' && args.payload) {
    const nomination = await args.payload.findByID({
      collection: 'nominations',
      id: args.siblingData.id,
      depth: 0,
    });
    const oldUserList: string[] = nomination.supporters;

    // Nothing has changed
    if ((oldUserList.length === userList.length) && oldUserList.every((elem, idx) => elem === userList[idx])) {
      return true;
    }

    for (let i = 0; i < userList.length; i += 1) {
      if (userList[i] === args.user.id) {
        continue;
      }
      if (!oldUserList.includes(userList[i])) {
        return 'Added user not from old list.';
      }
    }

    for (let i = 0; i < oldUserList.length; i += 1) {
      if (oldUserList[i] === args.user.id) {
        continue;
      }
      if (!userList.includes(oldUserList[i])) {
        return 'Removed user from old list.';
      }
    }

    if (userList.length !== new Set(userList).size) {
      return 'Contains the same user multiple times';
    }
  }

  return relationship(userList, args);
};

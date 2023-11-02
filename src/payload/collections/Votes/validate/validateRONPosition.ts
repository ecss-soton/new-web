import { Validate } from 'payload/types';
import { number } from 'payload/dist/fields/validations';

export const validateRONPosition: Validate = async (num: number, args) => {
  if (!Number.isInteger(num)) {
    return 'Position must be an integer';
  }

  if (num > args.data.preference.length) {
    return 'Position is out of bounds';
  }

  return number(num, args);
};

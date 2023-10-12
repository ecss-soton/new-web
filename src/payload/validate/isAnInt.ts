import { Validate } from 'payload/types';
import { number } from 'payload/dist/fields/validations';

export const isAnInt: Validate = (num: number, args) => {
  if (!Number.isInteger(num)) {
    return 'Expected an integer';
  }
  return number(num, args);
};

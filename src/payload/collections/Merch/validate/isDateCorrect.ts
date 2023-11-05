import { Validate } from 'payload/types';
import { date as validateDate } from 'payload/dist/fields/validations';

export const isDateCorrect: Validate = (date: string, args) => {
  if (!args.data.saleStart) {
    return 'sale start must be selected.';
  }

  const saleStart = new Date(Date.parse(args.data.saleStart));
  const saleEnd = new Date(Date.parse(date));
  if (saleStart < saleEnd) {
    return validateDate(date, args);
  }

  return 'The date selected must be after the sale start.';
};

import { Validate } from 'payload/types';
import { text } from 'payload/dist/fields/validations';
import { Merch } from '../../../payload-types';
import { getID } from '../../../utilities/getID';

// eslint-disable-next-line no-unused-vars
type getData<In, Out> = (data: Partial<In>) => Out | undefined

export function matchesMerch<T>(
  getArray: getData<Merch, T[]>,
  getField: getData<T, string>,
): Validate {
  return (async (field, args) => {
    if (!args.payload) {
      return text(field, args);
    }

    const merchID = getID(args.data.merch);

    const merch = await args.payload.findByID({ collection: 'merch', id: merchID, depth: 0 });

    const dataArray = getArray(merch);

    const fieldNames = Array.isArray(dataArray) ? dataArray.map(getField) : [];

    if (fieldNames.length === 0 && field) {
      return 'Field should be empty';
    }

    if (fieldNames.length > 0 && !fieldNames.find((f) => f === field)) {
      return 'Could not find field in merch fields';
    }

    return text(field, args);
  });
}

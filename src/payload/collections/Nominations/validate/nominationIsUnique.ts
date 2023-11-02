import { Validate } from 'payload/types';
import { relationship } from 'payload/dist/fields/validations';
import { getArrayID, getID } from '../../../utilities/getID';

export const nominationIsUnique: Validate = async (nominees, args) => {
  if (args.payload && nominees.length > 0) {
    const { election, position } = args.data;

    const result = await args.payload.find({
      collection: 'nominations',
      depth: 0,
      limit: 1,
      where: {
        and: [
          {
            nominees: {
              in: getArrayID(nominees),
            },
          },
          {
            election: {
              equals: getID(election),
            },
          },
          {
            position: {
              equals: getID(position),
            },
          },
          {
            id: {
              not_equals: args.operation === 'create' ? '' : args.data.id,
            },
          },
          {
            droppedOut: {
              not_equals: true,
            },
          },
        ],
      },
    });

    if (result.totalDocs > 0) {
      return 'Nomination is not unique.';
    }
  }

  return relationship(nominees, args);
};

import { Validate } from 'payload/types';
import { relationship } from 'payload/dist/fields/validations';

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
              in: typeof nominees[0] === 'object' ? nominees.map((n) => n.id) : nominees,
            },
          },
          {
            election: {
              equals: typeof election === 'object' ? election.id : election,
            },
          },
          {
            position: {
              equals: typeof position === 'object' ? position.id : position,
            },
          },
          {
            id: {
              not_equals: args.data.id,
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

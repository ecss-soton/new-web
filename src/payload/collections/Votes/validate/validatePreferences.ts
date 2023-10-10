import { Validate } from 'payload/types';
import { relationship } from 'payload/dist/fields/validations';
import { PaginatedDocs } from 'payload/dist/database/types';
import { Nomination } from '../../../payload-types';

export const validatePreferences: Validate = async (preferences, args) => {
  if (!preferences || preferences?.length === 0) {
    return 'Vote must include at least one preference';
  }
  const prefs: string[] = typeof preferences[0] === 'object' ? preferences.map((p) => p.id) : preferences;

  if (prefs.length !== new Set(prefs).size) {
    return 'Vote cannot have the same nomination multiple times';
  }

  if (args.payload) {
    const { election, position } = args.data;

    const result: PaginatedDocs<Nomination> = await args.payload.find({
      collection: 'nominations',
      depth: 0,
      pagination: false,
      where: {
        and: [
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
        ],
      },
    });

    for (let i = 0; i < prefs.length; i += 1) {
      const nomination = result.docs.findIndex((v) => v.id === prefs[i]);
      if (nomination === -1) {
        return 'Could not find nomination.';
      }
      result.docs.splice(nomination, 1);
    }

    for (let i = 0; i < result.docs.length; i += 1) {
      if (!result.docs[i].droppedOut) {
        return 'Does not contain all non-dropped out nominations.';
      }
    }
  }

  return relationship(preferences, args);
};

import type { AfterReadHook } from 'payload/dist/collections/config/types';
import { Nomination } from '../../../payload-types';
import { getArrayID } from '../../../utilities/getID';

// The `user` collection has access control locked so that users are not publicly accessible
// This means that we need to populate the nominees manually here to protect user privacy
// GraphQL will not return mutated user data that differs from the underlying schema
// So we use `populateNominees` to populate the nominees data, hidden from the admin UI
export const populateNominees: AfterReadHook<Nomination> = async ({ doc, req: { payload } }) => {
  if (doc?.nominees && doc.nominees.length >= 1) {
    const userDocs = await payload.find({
      collection: 'users',
      where: {
        id: {
          contains: getArrayID(doc.nominees),
        },
      },
      depth: 0,
    });

    doc.populatedNominees = userDocs.docs.map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
    }));
  }

  return doc;
};

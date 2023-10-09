import type { AfterReadHook } from 'payload/dist/collections/config/types';
import { Nomination } from '../../../payload-types';

// The `user` collection has access control locked so that users are not publicly accessible
// This means that we need to populate the nominees manually here to protect user privacy
// GraphQL will not return mutated user data that differs from the underlying schema
// So we use an alternative `populateNominees` field to populate the nominees data, hidden from the admin UI
export const populateNominees: AfterReadHook<Nomination> = async ({ doc, req: { payload } }) => {
  if (doc?.nominees && doc.nominees.length >= 1) {
    const userDocs = await payload.find({
      collection: 'users',
      where: {
        id: {
          contains: typeof doc.nominees[0] === 'object' ? doc?.nominees?.map((n) => n.id) : doc?.nominees,
        },
      },
      overrideAccess: true,
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

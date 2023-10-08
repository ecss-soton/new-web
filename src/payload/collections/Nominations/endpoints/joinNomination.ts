import type { PayloadHandler } from 'payload/config';

import type { Nomination } from '../../../payload-types';
import { MaxNominees } from '../constants';

export const joinNomination: PayloadHandler = async (req, res): Promise<void> => {
  const { user, payload } = req;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const nomination: Nomination = await payload.findByID({
    collection: 'nominations',
    id: req.params.id,
    depth: 0,
  });

  if (!nomination || nomination.joinUUID !== req.params.key) {
    res.status(404).json({ error: 'Could not find nomination.' });
    return;
  }

  if (nomination.nominee.length >= MaxNominees) {
    res.status(403).json({ error: 'Nomination already has too many nominees' });
    return;
  }

  const newNominees = nomination.nominee as string[];
  newNominees.push(req.params.id);

  try {
    await payload.update({
      id: req.params.id,
      collection: 'nominations',
      data: {
        nominee: newNominees,
      },
    });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    payload.logger.error(message);
    res.status(503).json({ error: message });
  }
};

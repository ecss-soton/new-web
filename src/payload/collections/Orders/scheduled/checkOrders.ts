import { Payload } from 'payload';
import {
  deleteInvoices, expireSession, getPaidInvoices, getSessionStatus,
} from '../../../payments';
import { getArrayID } from '../../../utilities/getID';

async function deleteQuick(payload: Payload, ids: number[]) {
  if (ids.length === 0) return;

  await payload.update({
    collection: 'orders',
    where: {
      quickfileID: {
        in: ids,
      },
    },
    data:
      {
        status: 'failed',
      },
  });

  await deleteInvoices(ids);
}

async function deleteStripe(payload: Payload, ids: string[]) {
  const sessions = await Promise.all(
    ids.map(async (id) => ({ id, status: await getSessionStatus(id) })),
  );

  const completed = sessions.filter((({ status }) => status === 'complete'));
  const failed = sessions.filter((({ status }) => status !== 'complete'));

  if (completed.length > 0) {
    await payload.update({
      collection: 'orders',
      where: {
        stripeID: {
          in: getArrayID(completed),
        },
      },
      data:
        {
          status: 'completed',
        },
    });
  }

  if (failed.length > 0) {
    await payload.update({
      collection: 'orders',
      where: {
        stripeID: {
          in: getArrayID(failed),
        },
      },
      data:
        {
          status: 'failed',
        },
    });
  }

  await Promise.all(failed.filter((({ status }) => status === 'open')).map(({ id }) => expireSession(id)));
}

async function checkQuickfile(payload: Payload, ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];

  const paidInvoices = await getPaidInvoices();
  const completedInvoices = ids.filter((id) => paidInvoices.find((paid) => paid === id));

  if (completedInvoices.length > 0) {
    await payload.update({
      collection: 'orders',
      where: {
        quickfileID: {
          in: completedInvoices,
        },
      },
      data:
        {
          status: 'completed',
        },
    });
  }

  return completedInvoices;
}

export async function checkOrders(payload: Payload) {
  const orders = await payload.find({
    collection: 'orders',
    depth: 0,
    pagination: false,
    where: {
      status: {
        equals: 'pending',
      },
    },
  });

  if (orders.totalDocs === 0) return;

  const quickfileIDs = orders.docs.map((o) => o.quickfileID).filter((id) => id);
  const completedInvoices = await checkQuickfile(payload, quickfileIDs);

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const toDelete = orders.docs.filter((o) => new Date(o.updatedAt) < fifteenMinutesAgo);

  const toDeleteQuick = toDelete.map((o) => o.quickfileID).filter((id) => id)
    .filter((id) => !completedInvoices.find((c) => c === id));
  const toDeleteStripe = toDelete.map((o) => o.stripeID).filter((id) => id);

  await Promise.all([deleteQuick(payload, toDeleteQuick), deleteStripe(payload, toDeleteStripe)]);
}

import { PayloadHandler } from 'payload/config';
import { Mutex } from 'async-mutex';
import { Payload } from 'payload';
import { getID } from '../../../utilities/getID';
import { soldCount } from '../../Tickets/endpoints/getSoldCount';
import {
  createCheckoutSession, createClient, createInvoice, getInvoice, sendInvoices,
} from '../../../payments';
import { Order, User } from '../../../payload-types';
import { InvoiceItem } from '../../../payments/types';

const mutex = new Mutex();

function checkTicketValid(order: Order, payload: Payload): Promise<boolean> {
  const ticketIDs = new Set(order.tickets.map((ot) => getID(ot.ticket)));

  return Promise.all([...ticketIDs].map(async (id) => {
    const { sold, pending } = await soldCount(id, payload);
    const ticket = await payload.findByID({ collection: 'tickets', id, depth: 0 });

    if (ticket.count && ticket.count >= (sold + pending)) {
      return Promise.resolve();
    }
    return Promise.reject();
  })).then(() => true).catch(() => false);
}

function generateInvoiceItems(order: Order): InvoiceItem[] {
  const tickets = order?.tickets ? order.tickets.map((t) => ({
    name: t.ticket.name,
    description: t.form ? `Form submission of ${t.form}` : 'Ticket',
    cost: t.ticket.price,
  })) : [];

  const merch = order?.merch ? order.merch.map((m) => {
    const variation = m.merch.variations.find((v) => v.variation === m.variation);
    const description = [`${variation.variation} variant`];
    if (m.size) description.push(`${m.size} size`);
    if (m.colour) description.push(`${m.colour} colour`);

    return ({
      name: m.merch.name,
      description: description.join(', '),
      cost: variation.cost,
    });
  }) : [];

  return [...tickets, ...merch];
}

async function stripePay(order: Order, payload: Payload): Promise<string> {
  const session = await createCheckoutSession(generateInvoiceItems(order), order.stripeTax);

  await payload.update({
    collection: 'orders',
    id: order.id,
    data:
      {
        stripeID: session.id,
        quickfileID: undefined,
        status: 'pending',
      },
  });

  return session.url;
}

async function quickfilePay(order: Order, payload: Payload, user: User): Promise<string> {
  let clientID = user.quickfileClientID;
  if (!user.quickfileClientID) {
    clientID = await createClient(user.username);
    await payload.update({
      collection: 'users', id: user.id, data: { quickfileClientID: clientID }, depth: 0,
    });
  }

  const invoiceID = await createInvoice({
    name: order.id,
    clientID,
    items: generateInvoiceItems(order),
  });

  await sendInvoices([invoiceID]);

  const { previewURI } = await getInvoice(invoiceID);

  await payload.update({
    collection: 'orders',
    id: order.id,
    data:
      {
        stripeID: undefined,
        quickfileID: invoiceID,
        status: 'pending',
      },
  });

  return previewURI;
}

async function checkSalesActive(order: Order, payload: Payload): Promise<boolean> {
  const sales: Set<string> = new Set([
    ...order?.tickets ? order.tickets.map((ot) => getID(ot.ticket.sale)) : [],
    ...order?.merch ? order.merch.map((ot) => getID(ot.merch.sale)) : [],
  ]);

  const results = await payload.find({
    collection: 'sales',
    limit: 0,
    where: {
      and: [
        {
          id: {
            in: [...sales],
          },
        },
        {
          saleStart: {
            less_than_equal: new Date().toISOString(),
          },
        },
        {
          saleEnd: {
            greater_than_equal: new Date().toISOString(),
          },
        },
      ],
    },
  });

  return results.totalDocs === sales.size;
}

export const pay: PayloadHandler = async (req, res): Promise<void> => {
  const { id, method } = req.params;

  if (!(method === 'stripe' || method === 'quickfile')) {
    res.status(404).json({ error: 'Unknown method' });
  }
  const release = await mutex.acquire();

  try {
    const order = await req.payload.update({
      collection: 'orders', id, depth: 2, data: { forceUpdate: true },
    });
    if (!order) {
      res.status(404).json({ error: 'Unknown order' });
      return;
    }
    if (getID(order.user) !== req?.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (order.status !== 'basket') {
      res.status(403).json({ error: 'Cannot pay for non-basket order' });
      return;
    }

    if (!await checkTicketValid(order, req.payload)) {
      res.status(403).json({ error: 'Ticket no longer available' });
      return;
    }
    if (!await checkSalesActive(order, req.payload)) {
      res.status(403).json({ error: 'Sale is no longer active' });
      return;
    }

    if (order.price === 0) {
      await req.payload.update({
        collection: 'orders',
        id,
        data:
          {
            status: 'completed',
          },
      });

      res.status(200);
      return;
    }

    let redirectURI: string;
    if (method === 'stripe') {
      redirectURI = await stripePay(order, req.payload);
    } else {
      redirectURI = await quickfilePay(order, req.payload, req.user);
    }

    res.redirect(303, redirectURI);
  } finally {
    release();
  }
};

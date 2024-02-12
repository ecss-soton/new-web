import dotenv from 'dotenv'
import type { Request, Response } from 'express'
import express from 'express'
import path from 'path'
import payload from 'payload'
import Stripe from 'stripe'

import type { User } from '../payload-types'
import type { CheckoutSession, InvoiceItem } from './types'

dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
})

const successURL = `${process.env.PAYLOAD_PUBLIC_SERVER_URL}/orders`
const stripe = new Stripe(process.env.STRIPE_API_KEY)

export const handleRawExpress = express.raw({ type: 'application/json' })
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature']
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_ENDPOINT_SECRET)
  } catch (e: unknown) {
    let err = e as { message: string }
    res.status(400).send(`Webhook Error: ${err.message}`)
    payload.logger.warn(`Webhook Error: ${err.message}`)
    return
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session: Stripe.Checkout.Session = event.data.object
      await payload.update({
        collection: 'orders',
        where: {
          stripeID: {
            equals: session.id,
          },
        },
        data: {
          status: 'completed',
        },
      })
      break
    }
    default:
      payload.logger.warn(`Unhandled event type ${event.type}`)
  }

  res.send()
}

export async function createCustomer(user: User): Promise<string> {
  const customer = await stripe.customers.create({
    name: user.name ?? user.username,
    email: user.email,
  })

  return customer.id
}

export async function createCheckoutSession(
  items: InvoiceItem[],
  stripeTax: number,
  customerID: string,
): Promise<CheckoutSession> {
  const lineItems = items.map(i => ({
    // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
    price_data: {
      currency: 'gbp',
      unit_amount: i.cost,
      product_data: {
        name: i.name,
        description: i.description,
      },
    },
    quantity: 1,
  }))

  if (stripeTax > 0) {
    lineItems.push({
      price_data: {
        currency: 'gbp',
        unit_amount: stripeTax,
        product_data: {
          name: 'Stripe Tax',
          description: 'Extra fee due to card processing fees.',
        },
      },
      quantity: 1,
    })
  }

  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: 'payment',
    success_url: successURL,
    customer: customerID,
  })

  return { id: session.id, url: session.url }
}

export async function expireSession(sessionID: string): Promise<void> {
  await stripe.checkout.sessions.expire(sessionID)
}

export async function getSessionStatus(sessionID: string): Promise<Stripe.Checkout.Session.Status> {
  const session = await stripe.checkout.sessions.retrieve(sessionID)
  return session.status
}

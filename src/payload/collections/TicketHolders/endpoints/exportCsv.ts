import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import type { TicketHolder } from '../../../payload-types'
import { formatTicketHolderCsv } from '../../../utilities/ticketHoldersCsv'
import { asString, loadEvent } from './shared'

const fileNamePart = (value: string | undefined | null): string =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Downloads an event's guest list in the exact shape the importer accepts, so the
 * admin can edit it in a spreadsheet (plus-ones, dietary) and paste it back.
 */
export const exportTicketHolderCsv: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user || !isAdmin(user)) {
    return res.status(401).json({ error: 'Admin access required' })
  }

  const eventId = asString(req.query?.eventId)
  if (!eventId) {
    return res.status(400).json({ error: 'Missing "eventId" query parameter' })
  }

  const event = await loadEvent(payload, eventId)
  if (!event) {
    return res.status(400).json({ error: 'Event not found' })
  }

  const holders = await payload.find({
    collection: 'ticket-holders',
    where: { event: { equals: eventId } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    sort: 'name',
  })

  const csv = formatTicketHolderCsv(holders.docs as TicketHolder[])
  const slug = fileNamePart(event.slug || event.name) || `event-${event.id}`

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${slug}-ticket-holders.csv"`)
  res.setHeader('Cache-Control', 'no-store')

  return res.status(200).send(csv)
}

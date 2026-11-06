import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import type { User } from '../../../payload-types'
import { normalizeSotonId } from '../../../utilities/sotonId'
import { accountDisplayName, asString, loadEvent, loadHoldersBySotonId } from './shared'

const MONGO_ID = /^[a-f0-9]{24}$/i
/** A picker selection beyond this is a mistake, not a guest list. */
const MAX_USERS_PER_REQUEST = 500

/**
 * Adds chosen website accounts to an event's guest list -- the admin shortcut for
 * "these people are coming" without hand-writing a CSV. It only ever creates
 * missing rows (defaults: no plus-ones, no dietary requirements) and never
 * rewrites a guest who is already on the list.
 */
export const importTicketHolderUsers: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user || !isAdmin(user)) {
    return res.status(401).json({ error: 'Admin access required' })
  }

  const { eventId, userIds } = (req.body || {}) as {
    eventId?: unknown
    userIds?: unknown
  }

  const eventIdValue = asString(eventId)
  if (!eventIdValue) {
    return res.status(400).json({ error: 'Missing "eventId" field' })
  }

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'Missing "userIds" list' })
  }

  if (userIds.length > MAX_USERS_PER_REQUEST) {
    return res.status(400).json({ error: `Add at most ${MAX_USERS_PER_REQUEST} users at a time` })
  }

  const ids = [...new Set(userIds.map(asString))]
  if (ids.some(id => !MONGO_ID.test(id))) {
    return res.status(400).json({ error: 'One or more user ids are not valid' })
  }

  const event = await loadEvent(payload, eventIdValue)
  if (!event) {
    return res.status(400).json({ error: 'Event not found' })
  }

  const users = await payload.find({
    collection: 'users',
    where: { id: { in: ids } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  const existingSotonIds = new Set((await loadHoldersBySotonId(payload, eventIdValue)).keys())
  const warnings: string[] = []

  let created = 0
  let skipped = 0

  for (const doc of users.docs as User[]) {
    const sotonId = normalizeSotonId(doc.username)
    if (!sotonId) {
      warnings.push(
        `${
          accountDisplayName(doc) || doc.id
        } has no university username — skipped (add them with a CSV instead)`,
      )
      continue
    }

    if (existingSotonIds.has(sotonId)) {
      skipped++
      continue
    }

    try {
      await payload.create({
        collection: 'ticket-holders',
        data: {
          event: eventIdValue,
          sotonId,
          name: accountDisplayName(doc) || sotonId,
          plusOneCount: 0,
          dietaryRequirements: '',
        },
      })
      existingSotonIds.add(sotonId)
      created++
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      warnings.push(`${accountDisplayName(doc) || sotonId}: ${message}`)
    }
  }

  const missing = ids.length - users.docs.length
  if (missing > 0) {
    warnings.push(`${missing} selected account(s) no longer exist`)
  }

  return res.json({
    success: true,
    summary: `Added ${created}, ${skipped} already on the list${
      warnings.length > 0 ? `, ${warnings.length} could not be added` : ''
    }`,
    created,
    skipped,
    warnings: warnings.length > 0 ? warnings : undefined,
  })
}

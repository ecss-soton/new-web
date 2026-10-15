import dotenv from 'dotenv'
import path from 'path'

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
})

import payload from 'payload'

import { computeMemberCount } from '../payload/utilities/memberCount'
import { relationshipId } from '../payload/utilities/relationships'
import { normalizeSotonId } from '../payload/utilities/sotonId'

interface NativeIndex {
  name?: string
  key?: Record<string, unknown>
  unique?: boolean
}

interface NativeCollection {
  find: (filter?: Record<string, unknown>) => {
    toArray: () => Promise<Array<Record<string, unknown>>>
  }
  updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>
  deleteOne: (filter: Record<string, unknown>) => Promise<unknown>
  createIndex: (keys: Record<string, 1 | -1>, options?: Record<string, unknown>) => Promise<unknown>
  indexes: () => Promise<NativeIndex[]>
  dropIndex: (name: string) => Promise<unknown>
}

interface SeatPosition {
  seatIndex: number
  userId?: string | null
  name?: string | null
}

// One-off migration for the table-booking integrity changes.
//
// 1. Normalise `ticket-holders.sotonId` (trim + lower-case) and remove duplicate
//    guest-list rows per (sotonId, event), keeping the most recently updated.
// 2. Drop the legacy global unique index on `sotonId` — it made it impossible to
//    import the same guest for a second event — and add the compound
//    (sotonId, event) unique index that replaces it.
// 3. Repair `tables`: de-duplicate `members`, delete member-less tables, rebuild
//    the derived `memberCount` ledger and attach `userId` to legacy seat rows.
// 4. Add a unique (event, members) index so the database itself refuses to seat
//    one guest at two tables, which the in-process mutex cannot guarantee across
//    multiple app instances.
//
// Run against a backup. Without `--apply` this only reports what it would change:
//
//   npm run migrate:booking-indexes
//   npm run migrate:booking-indexes -- --apply
const migrate = async (): Promise<void> => {
  const apply = process.argv.includes('--apply')

  await payload.init({
    secret: process.env.PAYLOAD_SECRET || '',
    local: true,
  })

  const models = (
    payload.db as unknown as {
      collections: Record<string, { collection: NativeCollection }>
    }
  ).collections

  const ticketHolders = models['ticket-holders'].collection
  const tables = models.tables.collection

  const log = (message: string): void => {
    payload.logger.info(`${apply ? '[apply]' : '[dry-run]'} ${message}`)
  }

  // ---------------------------------------------------------------- guest list
  const holders = await ticketHolders.find({}).toArray()

  const normalised: Array<{ id: unknown; sotonId: string; event: string; updatedAt: string }> = []
  let renamedSotonIds = 0

  for (const holder of holders) {
    const rawSotonId = typeof holder.sotonId === 'string' ? holder.sotonId : ''
    const sotonId = normalizeSotonId(rawSotonId)
    const event = relationshipId(holder.event) ?? String(holder.event ?? '')

    if (sotonId && sotonId !== rawSotonId) {
      renamedSotonIds++
      if (apply) {
        await ticketHolders.updateOne({ _id: holder._id }, { $set: { sotonId } })
      }
    }

    normalised.push({
      id: holder._id,
      sotonId,
      event,
      updatedAt: typeof holder.updatedAt === 'string' ? holder.updatedAt : '',
    })
  }

  const grouped = new Map<string, typeof normalised>()
  for (const holder of normalised) {
    const key = `${holder.sotonId}::${holder.event}`
    const group = grouped.get(key) ?? []
    group.push(holder)
    grouped.set(key, group)
  }

  const duplicateHolders: Array<{ id: unknown; key: string }> = []
  for (const [key, group] of grouped) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    for (const duplicate of sorted.slice(1)) {
      duplicateHolders.push({ id: duplicate.id, key })
      if (apply) {
        await ticketHolders.deleteOne({ _id: duplicate.id })
      }
    }
  }

  log(`guest list: normalised ${renamedSotonIds} sotonId value(s)`)
  log(`guest list: removed ${duplicateHolders.length} duplicate (sotonId, event) row(s)`)

  // ------------------------------------------------------------------- indexes
  const existingIndexes = await ticketHolders.indexes()
  const legacySotonIndexes = existingIndexes.filter(index => {
    const keys = Object.keys(index.key ?? {})
    return keys.length === 1 && keys[0] === 'sotonId'
  })

  for (const index of legacySotonIndexes) {
    if (!index.name) continue
    log(`guest list: dropping legacy index "${index.name}" (unique: ${Boolean(index.unique)})`)
    if (apply) {
      await ticketHolders.dropIndex(index.name)
    }
  }

  if (apply) {
    await ticketHolders.createIndex({ sotonId: 1, event: 1 }, { unique: true })
  }
  log('guest list: ensured unique (sotonId, event) index')

  // -------------------------------------------------------------------- tables
  const allTables = await tables.find({}).toArray()

  const membershipByEvent = new Map<string, Map<string, string[]>>()
  const emptyTableIds: unknown[] = []
  const repairedTables: Array<{
    id: unknown
    members: string[]
    memberCount: number
    seats: SeatPosition[]
  }> = []

  for (const table of allTables) {
    const eventId = relationshipId(table.event) ?? String(table.event ?? '')
    const rawMembers = Array.isArray(table.members) ? table.members : []
    const members = [
      ...new Set(rawMembers.map(relationshipId).filter((id): id is string => Boolean(id))),
    ]

    if (members.length === 0) {
      emptyTableIds.push(table._id)
      continue
    }

    for (const memberId of members) {
      const perEvent = membershipByEvent.get(eventId) ?? new Map<string, string[]>()
      const seats = perEvent.get(memberId) ?? []
      seats.push(String(table._id))
      perEvent.set(memberId, seats)
      membershipByEvent.set(eventId, perEvent)
    }

    const memberCount = await computeMemberCount(payload, eventId, members)

    // Attach `userId` to legacy seat rows where the display name identifies
    // exactly one current member, and drop rows with an unusable seat index.
    const usersResult = await payload.find({
      collection: 'users',
      where: { id: { in: members } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
    const nameById = new Map(
      usersResult.docs.map(u => [
        u.id,
        ((u.name as string) || (u.username as string) || 'Unknown').trim(),
      ]),
    )
    const idsByName = new Map<string, string[]>()
    for (const [id, name] of nameById) {
      const ids = idsByName.get(name) ?? []
      ids.push(id)
      idsByName.set(name, ids)
    }

    const seenSeatIndexes = new Set<number>()
    const seats: SeatPosition[] = []
    const rawSeats = Array.isArray(table.seatPositions)
      ? (table.seatPositions as SeatPosition[])
      : []

    for (const seat of rawSeats) {
      const seatIndex = Number(seat?.seatIndex)
      if (!Number.isInteger(seatIndex) || seenSeatIndexes.has(seatIndex)) continue
      seenSeatIndexes.add(seatIndex)

      const seatUserId = relationshipId(seat?.userId)
      if (seatUserId && members.includes(seatUserId)) {
        seats.push({
          seatIndex,
          userId: seatUserId,
          name: nameById.get(seatUserId) ?? seat.name ?? 'Unknown',
        })
        continue
      }

      const name = typeof seat?.name === 'string' ? seat.name.trim() : ''
      const candidates = idsByName.get(name) ?? []
      if (candidates.length === 1) {
        seats.push({ seatIndex, userId: candidates[0], name })
      } else {
        seats.push({ seatIndex, name })
      }
    }

    const membersChanged = members.length !== rawMembers.length
    const countChanged = (table.memberCount as number | undefined) !== memberCount
    const seatsChanged = JSON.stringify(table.seatPositions ?? []) !== JSON.stringify(seats)

    if (membersChanged || countChanged || seatsChanged) {
      repairedTables.push({ id: table._id, members, memberCount, seats })
      if (apply) {
        await tables.updateOne(
          { _id: table._id },
          { $set: { members, memberCount, seatPositions: seats } },
        )
      }
    }
  }

  log(`tables: ${emptyTableIds.length} member-less table(s)`)
  log(`tables: ${repairedTables.length} table(s) needing member/ledger/seat repair`)

  for (const id of emptyTableIds) {
    if (apply) {
      await tables.deleteOne({ _id: id })
    }
  }

  // Cross-table seating is the one thing this script will not resolve by itself:
  // removing a guest from a table is a product decision, not a repair.
  const crossTableConflicts: string[] = []
  for (const [eventId, perEvent] of membershipByEvent) {
    for (const [memberId, tableIds] of perEvent) {
      if (tableIds.length > 1) {
        crossTableConflicts.push(
          `event ${eventId}: user ${memberId} in tables ${tableIds.join(', ')}`,
        )
      }
    }
  }

  if (crossTableConflicts.length > 0) {
    payload.logger.warn(
      `tables: ${crossTableConflicts.length} guest(s) seated at more than one table — the unique ` +
        '(event, members) index was NOT created. Resolve these first:',
    )
    for (const conflict of crossTableConflicts) {
      payload.logger.warn(`  ${conflict}`)
    }
  } else {
    if (apply) {
      await tables.createIndex({ event: 1, members: 1 }, { unique: true })
    }
    log('tables: ensured unique (event, members) index')
  }

  log('done')

  process.exit(0)
}

migrate().catch(error => {
  payload.logger.error(error instanceof Error ? error : String(error))
  process.exit(1)
})

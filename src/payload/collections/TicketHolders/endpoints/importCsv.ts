import type { PayloadHandler } from 'payload/config'

import { isAdmin } from '../../../access/isAdmin'
import {
  accountDisplayName,
  asString,
  loadBookingEvent,
  loadHoldersBySotonId,
  loadUsersBySotonId,
} from '../../../utilities/booking'
import { parseTicketHolderCsv, type TicketHolderCsvMode } from '../../../utilities/ticketHoldersCsv'

export const importTicketHolderCsv: PayloadHandler = async (req, res) => {
  const { user, payload } = req

  if (!user || !isAdmin(user)) {
    return res.status(401).json({ error: 'Admin access required' })
  }

  const { csv, eventId, mode } = (req.body || {}) as {
    csv?: unknown
    eventId?: unknown
    mode?: unknown
  }

  if (typeof csv !== 'string' || !csv.trim()) {
    return res.status(400).json({ error: 'Missing "csv" field with CSV text' })
  }

  const eventIdValue = asString(eventId)
  if (!eventIdValue) {
    return res.status(400).json({ error: 'Missing "eventId" field' })
  }

  // "add" is the safe default: it can never overwrite a guest already on the
  // list, so re-pasting a username list cannot wipe a plus-one allowance.
  const importMode: TicketHolderCsvMode = mode === 'overwrite' ? 'overwrite' : 'add'

  const event = await loadBookingEvent(payload, eventIdValue)
  if (!event) {
    return res.status(400).json({ error: 'Event not found' })
  }

  const parsed = parseTicketHolderCsv(csv)

  if (parsed.rows.length === 0) {
    return res.status(400).json({
      error: parsed.errors[0] || 'CSV is empty',
      errors: parsed.errors,
      warnings: parsed.warnings.length > 0 ? parsed.warnings : undefined,
    })
  }

  const seatsPerTable = event.seatsPerTable || 10
  const existingBySotonId = await loadHoldersBySotonId(payload, eventIdValue)
  const usersBySotonId = await loadUsersBySotonId(
    payload,
    parsed.rows.map(row => row.sotonId),
  )

  const errors = [...parsed.errors]
  const warnings = [...parsed.warnings]

  let created = 0
  let updated = 0
  let skipped = 0

  for (const row of parsed.rows) {
    const existing = existingBySotonId.get(row.sotonId)

    if (existing && importMode === 'add') {
      skipped++
      continue
    }

    const accountName = accountDisplayName(usersBySotonId.get(row.sotonId))
    const resolvedName = row.name || accountName || (existing?.name ?? '') || row.sotonId

    if (!row.name && !accountName && !existing?.name) {
      warnings.push(
        `Line ${row.lineNumber}: ${row.sotonId} has no website account name — using the sotonId as the display name`,
      )
    }

    // A guest who cannot fit at an empty table can never be seated.
    const plusOneCount = row.plusOneCount ?? 0
    if (1 + plusOneCount > seatsPerTable) {
      errors.push(
        `Line ${row.lineNumber} (${row.sotonId}): needs ${
          1 + plusOneCount
        } seats but a table only has ${seatsPerTable}`,
      )
      continue
    }

    try {
      if (existing) {
        // Under "overwrite" a column the file does not supply is reset, which is
        // what an admin correcting a full export expects. The SUSU sales export
        // carries no dietary column, so it must never clear stored allergies.
        const updateData: {
          name: string
          plusOneCount: number
          dietaryRequirements?: string
        } = { name: resolvedName, plusOneCount }

        if (parsed.format !== 'sales') {
          updateData.dietaryRequirements = row.dietaryRequirements ?? ''
        }

        await payload.update({
          collection: 'ticket-holders',
          id: existing.id,
          data: updateData,
        })
        updated++
      } else {
        await payload.create({
          collection: 'ticket-holders',
          data: {
            event: eventIdValue,
            sotonId: row.sotonId,
            name: resolvedName,
            plusOneCount,
            dietaryRequirements: row.dietaryRequirements ?? '',
          },
        })
        created++
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`Line ${row.lineNumber} (${row.sotonId}): ${message}`)
    }
  }

  return res.json({
    success: errors.length === 0,
    summary: `Created ${created}, updated ${updated}, skipped ${skipped}, errors ${errors.length}`,
    mode: importMode,
    format: parsed.format,
    created,
    updated,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  })
}

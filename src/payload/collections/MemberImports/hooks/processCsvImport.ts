import path from 'path'
import type { AfterChangeHook } from 'payload/dist/collections/config/types'

import {
  buildCsvAccountCheckResult,
  logCsvAccountCheckResult,
  parseCsvFile,
} from '../../../utilities/checkCsvAccounts'
import { withKeyedLock } from '../../../utilities/keyedMutex'
import { syncSusuMembers } from '../../../utilities/susuMembers'

const memberImportUploadDir = path.resolve(__dirname, '../../../../../media/member-imports')

const SUSU_MEMBER_LOCK = 'susu-members'

export const processCsvImport: AfterChangeHook = async ({ doc, req, operation }) => {
  if (operation !== 'create') {
    return doc
  }

  const filename = doc.filename
  if (!filename) {
    req.payload.logger.warn(`Member import '${doc.id}' did not include a filename.`)
    return doc
  }

  const csvFilePath = path.join(memberImportUploadDir, filename)

  await req.payload.update({
    collection: 'member-imports',
    id: doc.id,
    data: {
      runStatus: 'running',
    },
    overrideAccess: true,
  })

  try {
    const processed = await withKeyedLock(SUSU_MEMBER_LOCK, async () => {
      const parsed = parseCsvFile(csvFilePath)

      // Persist first: later logins match against `susu-members`, not this file.
      const synced = await syncSusuMembers({
        payload: req.payload,
        members: parsed.members,
        importId: String(doc.id),
      })

      const matchResult = await buildCsvAccountCheckResult({
        payload: req.payload,
        parsed,
        role: 'susu',
      })

      return { result: matchResult, memberSync: synced }
    })

    const summary = [
      processed.result.summary,
      '',
      `SUSU member records: ${processed.memberSync.total} (${processed.memberSync.created} created, ${processed.memberSync.updated} updated, ${processed.memberSync.unchanged} unchanged)`,
    ].join('\n')

    logCsvAccountCheckResult(req.payload, { ...processed.result, summary })

    // Returning the updated document lets the admin create response show the
    // finished status and summary without a manual refresh.
    return await req.payload.update({
      collection: 'member-imports',
      id: doc.id,
      data: {
        runStatus: 'completed',
        processedAt: new Date().toISOString(),
        summary,
      },
      overrideAccess: true,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    req.payload.logger.error(`Failed to process member import '${doc.id}': ${message}`)

    return await req.payload.update({
      collection: 'member-imports',
      id: doc.id,
      data: {
        runStatus: 'failed',
        processedAt: new Date().toISOString(),
        summary: `Import failed: ${message}`,
      },
      overrideAccess: true,
    })
  }
}

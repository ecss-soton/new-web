import path from 'path'
import type { AfterChangeHook } from 'payload/dist/collections/config/types'

import {
  logCsvAccountCheckResult,
  runCheckCsvAccountsFromFile,
} from '../../../utilities/checkCsvAccounts'

const memberImportUploadDir = path.resolve(__dirname, '../../../../../media/member-imports')

const formatSummary = (stats: {
  totalProcessed: number
  matchedRows: number
  rolesAdded: number
  alreadyHadRole: number
  noMatch: number
  invalidRows: number
}): string => {
  return [
    `Rows processed: ${stats.totalProcessed}`,
    `Rows with at least one match: ${stats.matchedRows}`,
    `New 'susu' roles added: ${stats.rolesAdded}`,
    `Users who already had role: ${stats.alreadyHadRole}`,
    `No match found: ${stats.noMatch}`,
    `Invalid rows skipped: ${stats.invalidRows}`,
  ].join('\n')
}

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
    const result = await runCheckCsvAccountsFromFile({
      payload: req.payload,
      csvFilePath,
      role: 'susu',
    })

    logCsvAccountCheckResult(req.payload, result)

    await req.payload.update({
      collection: 'member-imports',
      id: doc.id,
      data: {
        runStatus: 'completed',
        processedAt: new Date().toISOString(),
        summary: formatSummary(result.stats),
      },
      overrideAccess: true,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    req.payload.logger.error(`Failed to process member import '${doc.id}': ${message}`)

    await req.payload.update({
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

  return doc
}

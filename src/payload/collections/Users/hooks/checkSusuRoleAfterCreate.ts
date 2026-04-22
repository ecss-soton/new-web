import path from 'path'
import type { AfterChangeHook } from 'payload/dist/collections/config/types'

import { runCheckSingleUserFromCsvFile } from '../../../utilities/checkCsvAccounts'

const memberImportUploadDir = path.resolve(__dirname, '../../../../../media/member-imports')

export const checkSusuRoleAfterCreate: AfterChangeHook = async ({ doc, req, operation }) => {
  if (operation === 'create') {
    const latest = await req.payload.find({
      collection: 'member-imports',
      limit: 1,
      sort: '-createdAt',
      overrideAccess: true,
    })

    if (latest.docs.length === 0) {
      req.payload.logger.warn(`No member-import found in collection`)
      return doc
    }

    const csv = latest.docs[0]

    const filename = csv.filename
    const csvFilePath = path.join(memberImportUploadDir, filename)

    try {
      await runCheckSingleUserFromCsvFile({
        payload: req.payload,
        csvFilePath,
        userDoc: doc,
        role: 'susu',
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      req.payload.logger.error(`Failed to process member import '${doc.id}': ${message}`)
    }

    return doc
  }

  return doc
}

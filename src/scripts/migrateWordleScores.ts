import dotenv from 'dotenv'
import path from 'path'

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
})

import payload from 'payload'

interface NativeCollection {
  find: (filter?: Record<string, unknown>) => {
    toArray: () => Promise<Array<Record<string, unknown>>>
  }
  updateMany: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ) => Promise<{ modifiedCount?: number }>
  deleteMany: (filter: Record<string, unknown>) => Promise<unknown>
  createIndex: (keys: Record<string, 1 | -1>, options?: Record<string, unknown>) => Promise<unknown>
}

// One-off migration for the ECSSle integrity changes.
//
// 1. Existing scores were only ever written on completion, so mark every legacy
//    document `completed: true` (otherwise they would look like active games).
// 2. Remove duplicate (user, date) documents, keeping the first seen.
// 3. Add the unique (user, date) index that prevents parallel guesses creating
//    duplicate games.
//
// Run against a backup first: npm run migrate:wordle-scores
const migrate = async (): Promise<void> => {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || '',
    local: true,
  })

  const models = (
    payload.db as unknown as {
      collections: Record<string, { collection: NativeCollection }>
    }
  ).collections
  const collection = models['wordle-scores'].collection

  const updateResult = await collection.updateMany(
    { completed: { $ne: true } },
    { $set: { completed: true } },
  )

  const docs = await collection.find({}).toArray()
  const seen = new Set<string>()
  const duplicateIds: unknown[] = []

  for (const doc of docs) {
    const key = `${String(doc.user)}:${String(doc.date)}`
    if (seen.has(key)) {
      duplicateIds.push(doc._id)
    } else {
      seen.add(key)
    }
  }

  if (duplicateIds.length > 0) {
    await collection.deleteMany({ _id: { $in: duplicateIds } })
  }

  await collection.createIndex({ user: 1, date: 1 }, { unique: true })

  payload.logger.info(
    `Wordle migration complete: ${updateResult.modifiedCount ?? 0} scores marked completed, ` +
      `${duplicateIds.length} duplicate(s) removed, unique (user, date) index ensured.`,
  )

  process.exit(0)
}

migrate().catch(error => {
  payload.logger.error(error instanceof Error ? error : String(error))
  process.exit(1)
})

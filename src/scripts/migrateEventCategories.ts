import dotenv from 'dotenv'
import path from 'path'

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
})

import payload from 'payload'

interface MongoCollection {
  find: (filter: Record<string, unknown>) => {
    project: (fields: Record<string, 1>) => {
      toArray: () => Promise<Array<Record<string, unknown>>>
    }
  }
  updateOne: (
    filter: { _id: unknown },
    update: { $set: Record<string, unknown> },
  ) => Promise<unknown>
}

interface MongoConnection {
  db: { collection: (name: string) => MongoCollection }
  close: () => Promise<void>
}

// One-off migration for the `jumpstartCategory` -> `category` rename.
//
// The renamed field is no longer part of the Payload schema, so the legacy value
// cannot be read through the local API. This reaches into the underlying Mongo
// collection directly. Run against a backup first:
//
//   npm run migrate:event-categories
//
// It only sets `category` on documents that still have a legacy value and no
// category yet, so it is safe to re-run.
const migrate = async (): Promise<void> => {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || '',
    local: true,
  })

  const connection = (payload.db as unknown as { connection: MongoConnection }).connection
  const collection = connection.db.collection('events')

  const docs = await collection
    .find({ jumpstartCategory: { $exists: true, $nin: [null, ''] } })
    .project({ jumpstartCategory: 1, category: 1 })
    .toArray()

  let migrated = 0

  for (const doc of docs) {
    if (doc.category) continue

    await collection.updateOne({ _id: doc._id }, { $set: { category: doc.jumpstartCategory } })
    migrated += 1
  }

  payload.logger.info(
    `Event category migration complete: ${migrated} document(s) updated, ${docs.length} legacy document(s) scanned.`,
  )

  await connection.close()
  process.exit(0)
}

migrate().catch(error => {
  payload.logger.error(error instanceof Error ? error : String(error))
  process.exit(1)
})

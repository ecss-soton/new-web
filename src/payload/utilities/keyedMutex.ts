/**
 * Serialises async work that shares a key.
 *
 * The booking endpoints validate against a document and then write it back, so
 * two concurrent requests can both pass validation and one write is silently
 * lost. Deriving the lock from a string key (a table id, or an event id while
 * creating a table) keeps the critical section as small as possible.
 *
 * This is an in-process queue, which matches the single-instance assumption
 * already documented for the Discord scheduler. Running multiple instances
 * would need a database-level guard instead.
 */
const queues = new Map<string, Promise<void>>()

export const withKeyedLock = async <T>(key: string, work: () => Promise<T>): Promise<T> => {
  const previous = queues.get(key) ?? Promise.resolve()

  // Chain onto the previous holder, continuing whether it resolved or rejected so
  // one failed request cannot poison the key for everyone after it.
  const run = previous.then(work, work)
  const settled = run.then(
    () => undefined,
    () => undefined,
  )

  queues.set(key, settled)

  try {
    return await run
  } finally {
    // Only clear the entry if nothing else queued behind us in the meantime.
    if (queues.get(key) === settled) {
      queues.delete(key)
    }
  }
}

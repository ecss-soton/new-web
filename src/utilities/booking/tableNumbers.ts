/**
 * Table numbers are derived, not stored: the booking page, the seat plan and the
 * seat-plan export all number an event's tables the same way, so a guest reading
 * "Table 3" anywhere sees the same table in the exported plan.
 *
 * Callers pass the event's *active* tables (at least one member), which keeps the
 * visible numbers contiguous. Numbers therefore shift if a table is created or
 * deleted — an accepted trade-off for not storing an extra field.
 */

export interface RankableTable {
  id: string
  createdAt?: string | null
}

/** 1-based creation order; ties broken by id so the result is deterministic. */
export const rankTables = (tables: RankableTable[]): Map<string, number> => {
  const sorted = [...tables].sort((a, b) => {
    const byCreatedAt = (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
    return byCreatedAt !== 0 ? byCreatedAt : a.id.localeCompare(b.id)
  })

  return new Map(sorted.map((table, index) => [table.id, index + 1]))
}

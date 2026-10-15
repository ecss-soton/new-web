/**
 * Payload relationship values are either an id or a populated document,
 * depending on the `depth` the caller asked for. These helpers normalise both
 * shapes so validation code doesn't have to branch on depth.
 */

export const relationshipId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value
  if (value && typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' && id.length > 0) return id
  }
  return undefined
}

export const relationshipIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map(relationshipId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
}

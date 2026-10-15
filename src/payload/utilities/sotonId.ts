/**
 * University usernames arrive in inconsistent shapes: the Azure AD `mailNickname`
 * is stored on the user verbatim, while CSV guest lists are often pasted with
 * full emails and mixed casing. Both the import and the booking lookups must
 * normalise identically, otherwise guest-list checks fail silently.
 */
export const normalizeSotonId = (raw?: string | null): string => {
  if (typeof raw !== 'string') return ''
  return raw.split('@')[0].trim().toLowerCase()
}

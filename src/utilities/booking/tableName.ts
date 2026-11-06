/**
 * Table display naming is shared between the Payload endpoints and the booking
 * UI: the owner may switch a table between their first name and the join code,
 * and the seats a guest's plus-ones occupy are labelled from the same rules.
 * Keeping it pure means both sides agree without a round-trip per label.
 */

export type TableNameMode = 'ownerName' | 'joinCode'

export const TABLE_NAME_MODES: TableNameMode[] = ['ownerName', 'joinCode']

/** Normalises whatever the table document carries; legacy rows have no mode. */
export const normalizeTableNameMode = (value: unknown): TableNameMode =>
  value === 'joinCode' ? 'joinCode' : 'ownerName'

/**
 * First name for display, falling back to the username when an account has no
 * name. Azure AD display names look like `Henry Foster (hwjf1g26)`; the suffix
 * sits after the first name, so the first token is still the right one.
 */
export const firstNameOf = (name?: string | null, username?: string | null): string => {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (trimmed) return trimmed.split(/\s+/)[0]

  return typeof username === 'string' ? username.trim() : ''
}

export interface TableDisplayNameArgs {
  nameMode?: TableNameMode | string | null
  joinCode?: string | null
  ownerName?: string | null
  ownerUsername?: string | null
}

/**
 * `Indigo's Table` by default, `Table ABCD2345` when the owner opts back into
 * the join code. A table with no usable owner name always falls back to the
 * join code so it can still be identified.
 */
export const tableDisplayName = ({
  nameMode,
  joinCode,
  ownerName,
  ownerUsername,
}: TableDisplayNameArgs): string => {
  const code = typeof joinCode === 'string' ? joinCode.trim() : ''
  const codeLabel = code ? `Table ${code}` : 'Table'

  if (normalizeTableNameMode(nameMode) === 'joinCode') return codeLabel

  const firstName = firstNameOf(ownerName, ownerUsername)
  return firstName ? `${firstName}'s Table` : codeLabel
}

/** `Indigo's +1` — the label shown for a plus-one seat. */
export const plusOneSeatLabel = (firstName: string, index: number): string => {
  const position = Math.max(1, Math.floor(index))
  const who = typeof firstName === 'string' ? firstName.trim() : ''
  return who ? `${who}'s +${position}` : `Plus-one +${position}`
}

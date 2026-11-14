/**
 * Escapes one CSV field per RFC 4180: quote when the value contains a comma,
 * quote or line break, and double any embedded quotes.
 */
export const escapeCsvField = (value: string): string => {
  if (!/[",\r\n]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

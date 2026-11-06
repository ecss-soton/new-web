/**
 * Downloads an event's guest list through the admin's cookie session. A plain
 * anchor cannot send the Payload auth header the endpoint expects, so the CSV is
 * fetched and turned into a blob download instead.
 */
export const downloadTicketHoldersCsv = async (eventId: string): Promise<void> => {
  const res = await fetch(`/api/ticket-holders/export-csv?eventId=${encodeURIComponent(eventId)}`, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || `Export failed (${res.status})`)
  }

  const blob = await res.blob()

  // Cross-origin responses do not expose Content-Disposition, so keep a fallback.
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  const filename = match?.[1] || 'ticket-holders.csv'

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}

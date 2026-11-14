/**
 * Downloads a CSV through the admin's cookie session. A plain anchor cannot send
 * the auth cookie the endpoints expect, so the file is fetched and turned into a
 * blob download instead.
 */
export const downloadCsv = async (endpoint: string, fallbackFilename: string): Promise<void> => {
  const res = await fetch(endpoint, {
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
  const filename = match?.[1] || fallbackFilename

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}

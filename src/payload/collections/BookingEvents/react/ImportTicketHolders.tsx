import React, { useState } from 'react'
import { Button } from 'payload/components'
import { useDocumentInfo } from 'payload/dist/admin/components/utilities/DocumentInfo'

type ImportResult = {
  summary?: string
  created?: number
  updated?: number
  errors?: string[]
}

const PLACEHOLDER = [
  'sotonId,name,plusOneCount,dietaryRequirements',
  'ab1c23,Ada Lovelace,1,',
].join('\n')

export const ImportTicketHolders: React.FC = () => {
  const { id } = useDocumentInfo()
  const [csv, setCsv] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const eventId = id ? String(id) : null

  const handleImport = async () => {
    if (!eventId || !csv.trim() || loading) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/ticket-holders/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, eventId }),
      })

      const json = (await res.json().catch(() => ({}))) as ImportResult & { error?: string }

      if (!res.ok) {
        throw new Error(json.error || `Import failed (${res.status})`)
      }

      setResult(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginTop: 0 }}>Bulk import ticket holders</h3>
      <p style={{ marginTop: 0 }}>
        Paste CSV with the header{' '}
        <code>sotonId,name,plusOneCount,dietaryRequirements,plusOne1,…</code>. Emails are accepted
        in the sotonId column. Rows already present for this event are updated.
      </p>
      <textarea
        value={csv}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCsv(e.target.value)}
        rows={8}
        disabled={loading}
        placeholder={PLACEHOLDER}
        style={{ width: '100%', fontFamily: 'monospace', padding: '0.5rem' }}
      />
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <Button type="button" onClick={handleImport} disabled={loading || !eventId || !csv.trim()}>
          {loading ? 'Importing…' : 'Import ticket holders'}
        </Button>
        {!eventId && <span>Save the event first to enable importing.</span>}
      </div>

      {error && <p style={{ color: 'var(--theme-error-500)' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: '0.5rem' }}>
          <p style={{ margin: 0 }}>{result.summary || 'Import complete.'}</p>
          {result.errors && result.errors.length > 0 && (
            <ul>
              {result.errors.map((row, index) => (
                <li key={index}>{row}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

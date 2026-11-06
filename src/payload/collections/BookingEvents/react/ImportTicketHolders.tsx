import React, { useState } from 'react'
import { Button } from 'payload/components'
import { useDocumentInfo } from 'payload/dist/admin/components/utilities/DocumentInfo'

import {
  TICKET_HOLDER_HEADER_LINE,
  type TicketHolderCsvMode,
} from '../../../utilities/ticketHoldersCsv'
import { downloadTicketHoldersCsv } from './downloadTicketHoldersCsv'
import { UserTicketHolderPicker } from './UserTicketHolderPicker'

type ImportResult = {
  success?: boolean
  summary?: string
  mode?: TicketHolderCsvMode
  created?: number
  updated?: number
  skipped?: number
  errors?: string[]
  warnings?: string[]
}

const PLACEHOLDER = [
  TICKET_HOLDER_HEADER_LINE,
  'ab1c23,Ada Lovelace,1,',
  '',
  '# …or just the usernames:',
  'ab1c23',
  'xy9z88',
  '',
  '# …or usernames and names:',
  'ab1c23,Ada Lovelace',
].join('\n')

export const ImportTicketHolders: React.FC = () => {
  const { id } = useDocumentInfo()
  const [csv, setCsv] = useState('')
  const [mode, setMode] = useState<TicketHolderCsvMode>('add')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, eventId, mode }),
      })

      const json = (await res.json().catch(() => ({}))) as ImportResult & { error?: string }

      if (!res.ok) {
        // Parse failures come back as one headline error plus the row list, so
        // keep both visible instead of only the headline.
        setResult({
          success: false,
          summary: json.error || `Import failed (${res.status})`,
          errors: json.errors,
        })
        return
      }

      setResult(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!eventId || exporting) return

    setExporting(true)
    setError(null)

    try {
      await downloadTicketHoldersCsv(eventId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginTop: 0 }}>Bulk import ticket holders</h3>
      <p style={{ marginTop: 0 }}>
        Paste a guest list, then choose whether to add new guests only or overwrite the ones already
        on it. Accepted formats: the full <code>sotonId,name,plusOneCount,dietaryRequirements</code>{' '}
        CSV, a bare list of sotonIds, or sotonId and name pairs — with or without a header,
        comma/tab/semicolon separated. Emails are accepted in the sotonId column.
      </p>

      <fieldset
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          border: 'none',
          padding: 0,
          margin: '0 0 0.75rem',
        }}
      >
        <legend style={{ marginBottom: '0.4rem', fontWeight: 600 }}>Import mode</legend>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
          <input
            type="radio"
            name="import-mode"
            value="add"
            checked={mode === 'add'}
            onChange={() => setMode('add')}
            disabled={loading}
          />
          <span>
            <strong>Add</strong> — create guests who are not on the list yet and leave everyone
            already on it untouched.
          </span>
        </label>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
          <input
            type="radio"
            name="import-mode"
            value="overwrite"
            checked={mode === 'overwrite'}
            onChange={() => setMode('overwrite')}
            disabled={loading}
          />
          <span>
            <strong>Overwrite</strong> — replace stored details with what the file says. Columns the
            file leaves out reset to 0 / no dietary requirements.
          </span>
        </label>
      </fieldset>

      <textarea
        value={csv}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCsv(e.target.value)}
        rows={10}
        disabled={loading}
        placeholder={PLACEHOLDER}
        style={{ width: '100%', fontFamily: 'monospace', padding: '0.5rem' }}
      />

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <Button type="button" onClick={handleImport} disabled={loading || !eventId || !csv.trim()}>
          {loading ? 'Importing…' : `Import ticket holders (${mode})`}
        </Button>
        <Button
          type="button"
          buttonStyle="secondary"
          onClick={handleExport}
          disabled={exporting || !eventId}
        >
          {exporting ? 'Preparing…' : 'Download CSV'}
        </Button>
        {!eventId && <span>Save the event first to enable importing and exporting.</span>}
      </div>

      {error && <p style={{ color: 'var(--theme-error-500)' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: '0.5rem' }}>
          <p style={{ margin: 0, color: result.success ? undefined : 'var(--theme-warning-500)' }}>
            {result.summary || 'Import complete.'}
          </p>
          {result.warnings && result.warnings.length > 0 && (
            <ul>
              {result.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          )}
          {result.errors && result.errors.length > 0 && (
            <ul>
              {result.errors.map((row, index) => (
                <li key={index}>{row}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <UserTicketHolderPicker eventId={eventId} />
    </div>
  )
}

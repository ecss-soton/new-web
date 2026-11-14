import React, { useState } from 'react'
import { Button } from 'payload/components'
import { useDocumentInfo } from 'payload/dist/admin/components/utilities/DocumentInfo'

import { downloadCsv } from './downloadCsv'

/**
 * The venue seating plan download. Table numbers come from the same derived
 * ordering the booking page shows, so the printed plan matches what guests see.
 */
export const ExportSeatPlan: React.FC = () => {
  const { id } = useDocumentInfo()
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eventId = id ? String(id) : null

  const handleExport = async () => {
    if (!eventId || exporting) return

    setExporting(true)
    setError(null)

    try {
      await downloadCsv(
        `/api/tables/export-seat-plan?eventId=${encodeURIComponent(eventId)}`,
        'seat-plan.csv',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginTop: 0 }}>Seat plan export</h3>
      <p style={{ marginTop: 0 }}>
        One row per guest with their table number, seat number, allergies, guest type and ticket
        holder. Table numbers match the booking page. Includes table members who have not picked a
        seat and ticket holders who have not joined a table (blank table/seat); the Starter, Main,
        Dessert and “Checks before sending” columns are left blank for you to fill in.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <Button
          type="button"
          buttonStyle="secondary"
          onClick={handleExport}
          disabled={exporting || !eventId}
        >
          {exporting ? 'Preparing…' : 'Download seat plan CSV'}
        </Button>
        {!eventId && <span>Save the event first to enable exporting.</span>}
      </div>

      {error && <p style={{ color: 'var(--theme-error-500)' }}>{error}</p>}
    </div>
  )
}

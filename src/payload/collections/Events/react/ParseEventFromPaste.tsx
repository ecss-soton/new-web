import React, { useState } from 'react'
import { Button } from 'payload/components'
import { useForm } from 'payload/dist/admin/components/forms/Form/context'

type ParseResponse = {
  fields: Record<string, unknown>
  warnings?: string[]
}

export const ParseEventFromPaste: React.FC = () => {
  const { dispatchFields, setModified } = useForm()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleParse = async () => {
    if (!text.trim() || loading) return

    setLoading(true)
    setError(null)
    setWarnings([])

    try {
      const res = await fetch('/api/events/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      const json = (await res.json().catch(() => ({}))) as ParseResponse & { error?: string }

      if (!res.ok) throw new Error(json.error || `Parse failed (${res.status})`)

      Object.entries(json.fields || {}).forEach(([path, value]) => {
        dispatchFields({ type: 'UPDATE', path, value })
      })
      setModified(true)
      setWarnings(json.warnings || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginTop: 0 }}>Create from pasted announcement</h3>
      <p style={{ marginTop: 0 }}>
        Paste a Discord event announcement (with 📆 date, 📌 location, and any links). The form
        below is pre-filled for you to review before saving.
      </p>
      <textarea
        value={text}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
        rows={8}
        disabled={loading}
        placeholder={'# Event name\n📆 Saturday 24th October, 10am -> 8pm\n📌 B60 West\n\nDetails…'}
        style={{ width: '100%', fontFamily: 'monospace', padding: '0.5rem' }}
      />
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <Button type="button" onClick={handleParse} disabled={loading || !text.trim()}>
          {loading ? 'Parsing…' : 'Parse & fill'}
        </Button>
      </div>

      {error && <p style={{ color: 'var(--theme-error-500)' }}>{error}</p>}

      {warnings.length > 0 && (
        <ul style={{ color: 'var(--theme-warning-500)' }}>
          {warnings.map((warning, index) => (
            <li key={index}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

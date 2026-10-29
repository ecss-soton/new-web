'use client'

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

import {
  countGates,
  type DailyPuzzle,
  formatExpression,
  ROW_COUNT,
  truthTable,
  valuesForRow,
} from '../../../../utilities/games/logicGate/logic'
import { parseCircuitText } from '../../../../utilities/games/logicGate/parse'
import { bungee } from '../../../_utilities/font'
import { readStoredCircuit, writeStoredCircuit } from './storage'

import classes from './index.module.scss'

export const LogicGateLab: React.FC<{ puzzle: DailyPuzzle; todayScore: number | null }> = ({
  puzzle,
  todayScore,
}) => {
  const [text, setText] = useState('')
  const [restored, setRestored] = useState(false)
  const [shownError, setShownError] = useState('')
  const [recordedScore, setRecordedScore] = useState<number | null>(todayScore)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const lastSubmittedRef = useRef('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const inputId = useId()
  const helpId = useId()
  const errorId = useId()

  useEffect(() => {
    setText(readStoredCircuit(puzzle.date))
    setRestored(true)
  }, [puzzle.date])

  useEffect(() => {
    if (!restored) return
    writeStoredCircuit(puzzle.date, text)
  }, [restored, text, puzzle.date])

  const parsed = useMemo(() => parseCircuitText(text), [text])
  const expression = parsed.status === 'ok' ? parsed.expression : null
  const parseError = parsed.status === 'error' ? parsed.message : ''

  // Let people finish typing a word (N, NO, NOT) before flagging it, then keep
  // the message up until it changes.
  useEffect(() => {
    if (!parseError) {
      setShownError('')
      return
    }

    const timer = window.setTimeout(() => setShownError(parseError), 600)
    return () => window.clearTimeout(timer)
  }, [parseError])

  const revealError = () => {
    if (parseError) setShownError(parseError)
  }

  const userTable = expression ? truthTable(expression) : null
  const matches = userTable
    ? userTable.filter((value, row) => value === puzzle.target[row]).length
    : 0
  const solved = matches === ROW_COUNT && Boolean(userTable)
  const gateCount = countGates(expression)

  const submitScore = useCallback(async () => {
    if (!expression) return

    const gates = countGates(expression)
    const signature = `${puzzle.date}:${JSON.stringify(expression)}`
    if (lastSubmittedRef.current === signature) return
    if (recordedScore !== null && recordedScore <= gates) return

    lastSubmittedRef.current = signature
    setSubmitting(true)
    setSubmitError('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/game-scores/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: 'logic-gate-lab',
          data: { expression },
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not record your score')
      }

      const best = typeof payload?.best === 'number' ? payload.best : gates
      setRecordedScore(best)
    } catch (error) {
      lastSubmittedRef.current = ''
      setSubmitError(error instanceof Error ? error.message : 'Could not record your score')
    } finally {
      setSubmitting(false)
    }
  }, [expression, puzzle.date, recordedScore])

  useEffect(() => {
    if (!solved) return
    const gates = countGates(expression)
    if (recordedScore !== null && recordedScore <= gates) return
    void submitScore()
  }, [solved, expression, recordedScore, submitScore])

  const clearInput = () => {
    setText('')
    setSubmitError('')
    inputRef.current?.focus()
  }

  const statusText = !userTable
    ? 'Type a complete circuit to see your output.'
    : solved
    ? `Solved! Puzzle #${puzzle.number} — come back tomorrow for a new one.`
    : `Matches ${matches} of ${ROW_COUNT} rows.`

  return (
    <div className={classes.game}>
      <div className={classes.meta}>
        <span className={classes.puzzleNumber}>Puzzle #{puzzle.number}</span>
        <span className={classes.metaHint}>
          New puzzle at midnight UK time ·{' '}
          <Link href="/games/logic-gate-lab/leaderboard">Leaderboard</Link>
        </span>
      </div>

      <div className={classes.layout}>
        <section className={classes.panel} aria-labelledby="logic-target-heading">
          <h2
            id="logic-target-heading"
            className={[classes.panelTitle, bungee.className].join(' ')}
          >
            Target
          </h2>
          <table className={classes.table}>
            <caption className={classes.tableCaption}>
              Target output for each input combination
            </caption>
            <thead>
              <tr>
                <th scope="col">A</th>
                <th scope="col">B</th>
                <th scope="col">C</th>
                <th scope="col">Target</th>
                <th scope="col">You</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROW_COUNT }, (_, row) => {
                const values = valuesForRow(row)
                const targetValue = puzzle.target[row]
                const userValue = userTable ? userTable[row] : undefined
                const userClass =
                  userValue === undefined
                    ? classes.unknown
                    : userValue === targetValue
                    ? classes.match
                    : classes.mismatch

                return (
                  <tr key={row}>
                    <td>{values.A ? 1 : 0}</td>
                    <td>{values.B ? 1 : 0}</td>
                    <td>{values.C ? 1 : 0}</td>
                    <td className={targetValue ? classes.one : classes.zero}>
                      {targetValue ? 1 : 0}
                    </td>
                    <td className={userClass}>
                      {userValue === undefined ? '–' : userValue ? 1 : 0}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p
            className={[classes.status, solved ? classes.solved : ''].join(' ')}
            aria-live="polite"
          >
            {statusText}
          </p>

          {solved && (
            <div className={classes.submission} aria-live="polite">
              {submitting && <span>Recording your score…</span>}
              {!submitting && submitError && (
                <>
                  <span className={classes.submissionError}>{submitError}</span>
                  <button
                    type="button"
                    className={classes.retryButton}
                    onClick={() => {
                      void submitScore()
                    }}
                  >
                    Retry
                  </button>
                </>
              )}
              {!submitting && !submitError && recordedScore !== null && (
                <span>
                  Best recorded today: {recordedScore} gate
                  {recordedScore === 1 ? '' : 's'} ·{' '}
                  <Link href="/games/logic-gate-lab/leaderboard">Leaderboard</Link>
                </span>
              )}
              {!submitting && !submitError && recordedScore === null && (
                <span>Score not recorded yet.</span>
              )}
            </div>
          )}
        </section>

        <section className={classes.panel} aria-labelledby="logic-circuit-heading">
          <h2
            id="logic-circuit-heading"
            className={[classes.panelTitle, bungee.className].join(' ')}
          >
            Circuit
          </h2>

          <label className={classes.fieldLabel} htmlFor={inputId}>
            Your circuit
          </label>
          <textarea
            id={inputId}
            ref={inputRef}
            className={classes.input}
            value={text}
            onChange={event => setText(event.target.value)}
            onBlur={revealError}
            placeholder="(A AND B) OR NOT C"
            rows={3}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            aria-invalid={Boolean(shownError)}
            aria-describedby={shownError ? `${helpId} ${errorId}` : helpId}
          />

          {shownError && (
            <p id={errorId} className={classes.error} aria-live="polite">
              {shownError}
            </p>
          )}

          {expression && (
            <p className={classes.expression}>
              <code>{formatExpression(expression)}</code> ({gateCount} gate
              {gateCount === 1 ? '' : 's'})
            </p>
          )}

          <div className={classes.actions}>
            <button
              type="button"
              className={classes.secondaryButton}
              onClick={clearInput}
              disabled={!text}
            >
              Clear
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

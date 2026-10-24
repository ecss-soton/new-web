'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

import { readBestScore, writeBestScore } from '../../../../utilities/games/bestScore'
import { bungee } from '../../../_utilities/font'

import classes from './index.module.scss'

const GAME_KEY = 'base-blitz'
const ROUND_SECONDS = 60
const MAX_VALUE = 255

type Base = 'dec' | 'bin' | 'hex'
type Phase = 'idle' | 'playing' | 'over'
type Feedback = 'correct' | 'wrong' | null

interface Question {
  value: number
  from: Base
  to: Base
}

const BASES: Base[] = ['dec', 'bin', 'hex']

const BASE_LABELS: Record<Base, string> = {
  dec: 'decimal',
  bin: 'binary',
  hex: 'hex',
}

const PLACEHOLDERS: Record<Base, string> = {
  dec: '0-255',
  bin: 'eight bits',
  hex: '00-FF',
}

const toBaseString = (value: number, base: Base): string => {
  if (base === 'dec') return String(value)
  if (base === 'bin') return value.toString(2).padStart(8, '0')
  return value.toString(16).toUpperCase().padStart(2, '0')
}

const isValidInput = (input: string, base: Base): boolean => {
  if (base === 'dec') return /^\d+$/.test(input)
  if (base === 'bin') return /^[01]+$/.test(input)
  return /^[0-9a-fA-F]+$/.test(input)
}

const parseAnswer = (input: string, base: Base): number => {
  const radix = base === 'bin' ? 2 : base === 'hex' ? 16 : 10
  return parseInt(input, radix)
}

const createQuestion = (): Question => {
  const value = Math.floor(Math.random() * (MAX_VALUE + 1))
  const fromIndex = Math.floor(Math.random() * BASES.length)
  let toIndex = Math.floor(Math.random() * (BASES.length - 1))
  if (toIndex >= fromIndex) toIndex += 1

  return { value, from: BASES[fromIndex], to: BASES[toIndex] }
}

export const BaseBlitz: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('idle')
  const [question, setQuestion] = useState<Question>(() => createQuestion())
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [wrongAnswer, setWrongAnswer] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAdvance = useCallback(() => {
    if (advanceRef.current) {
      clearTimeout(advanceRef.current)
      advanceRef.current = null
    }
  }, [])

  useEffect(() => {
    setBest(readBestScore<number>(GAME_KEY))
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return

    const id = window.setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'playing' && secondsLeft === 0) {
      setPhase('over')
    }
  }, [phase, secondsLeft])

  useEffect(() => {
    if (phase !== 'over') return

    clearAdvance()

    if (score <= 0) return
    if (best !== null && best >= score) return

    writeBestScore(GAME_KEY, score)
    setBest(score)
  }, [phase, score, best, clearAdvance])

  useEffect(
    () => () => {
      clearAdvance()
    },
    [clearAdvance],
  )

  useEffect(() => {
    if (phase === 'playing') inputRef.current?.focus()
  }, [phase, question])

  const start = () => {
    clearAdvance()
    setScore(0)
    setStreak(0)
    setSecondsLeft(ROUND_SECONDS)
    setAnswer('')
    setFeedback(null)
    setWrongAnswer('')
    setQuestion(createQuestion())
    setPhase('playing')
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (phase !== 'playing' || feedback !== null) return

    const trimmed = answer.trim()
    if (!trimmed || !isValidInput(trimmed, question.to)) return

    if (parseAnswer(trimmed, question.to) === question.value) {
      setScore(current => current + 1)
      setStreak(current => current + 1)
      setFeedback('correct')
      setAnswer('')

      advanceRef.current = setTimeout(() => {
        setFeedback(null)
        setQuestion(createQuestion())
      }, 350)
      return
    }

    setStreak(0)
    setFeedback('wrong')
    setWrongAnswer(toBaseString(question.value, question.to))

    advanceRef.current = setTimeout(() => {
      setFeedback(null)
      setWrongAnswer('')
      setAnswer('')
      setQuestion(createQuestion())
    }, 1200)
  }

  return (
    <div className={classes.game}>
      {phase !== 'idle' && (
        <div className={classes.scoreboard}>
          <div className={classes.stat}>
            <span
              className={classes.statValue}
              role="timer"
              aria-label={`${secondsLeft} seconds left`}
            >
              {secondsLeft}
            </span>
            <span className={classes.statLabel}>Seconds</span>
          </div>
          <div className={classes.stat}>
            <span className={classes.statValue}>{score}</span>
            <span className={classes.statLabel}>Correct</span>
          </div>
          <div className={classes.stat}>
            <span className={classes.statValue}>{streak}</span>
            <span className={classes.statLabel}>Streak</span>
          </div>
        </div>
      )}

      {phase === 'idle' && (
        <div className={classes.panel}>
          <p className={classes.copy}>
            Convert as many numbers as you can between decimal, binary and hex in sixty seconds.
          </p>
          <button type="button" className={classes.primaryButton} onClick={start}>
            Start
          </button>
          {best !== null && best > 0 && <p className={classes.best}>Personal best: {best}</p>}
        </div>
      )}

      {phase === 'playing' && (
        <div className={classes.panel}>
          <div className={classes.prompt}>
            <span className={[classes.promptValue, bungee.className].join(' ')}>
              {toBaseString(question.value, question.from)}
            </span>
            <span className={classes.promptMeta}>
              {BASE_LABELS[question.from]} to {BASE_LABELS[question.to]}
            </span>
          </div>

          <form className={classes.form} onSubmit={submit}>
            <label className={classes.label} htmlFor="base-blitz-answer">
              Your answer
            </label>
            <div className={classes.inputRow}>
              <input
                ref={inputRef}
                id="base-blitz-answer"
                className={classes.input}
                type="text"
                value={answer}
                onChange={event => setAnswer(event.target.value)}
                inputMode={question.to === 'hex' ? 'text' : 'numeric'}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={8}
                placeholder={PLACEHOLDERS[question.to]}
              />
              <button type="submit" className={classes.primaryButton} disabled={!answer.trim()}>
                Check
              </button>
            </div>
          </form>

          <p
            className={[classes.feedback, feedback === 'wrong' ? classes.feedbackWrong : ''].join(
              ' ',
            )}
            aria-live="polite"
          >
            {feedback === 'correct' && 'Correct!'}
            {feedback === 'wrong' && `The answer was ${wrongAnswer}`}
          </p>
        </div>
      )}

      {phase === 'over' && (
        <div className={classes.panel}>
          <p className={[classes.resultScore, bungee.className].join(' ')}>{score}</p>
          <p className={classes.resultLabel}>correct in sixty seconds</p>
          {best !== null && <p className={classes.best}>Personal best: {best}</p>}
          <button type="button" className={classes.primaryButton} onClick={start}>
            Play again
          </button>
        </div>
      )}
    </div>
  )
}

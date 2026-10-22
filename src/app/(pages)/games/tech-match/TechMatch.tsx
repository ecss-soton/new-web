'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

import { readBestScore, writeBestScore } from '../../../../utilities/games/bestScore'
import { bungee } from '../../../_utilities/font'

import classes from './index.module.scss'

const GAME_KEY = 'tech-match'

interface SymbolDefinition {
  key: string
  glyph: string
  label: string
}

interface Card {
  uid: number
  symbol: SymbolDefinition
}

interface Best {
  moves: number
  seconds: number
}

const SYMBOLS: SymbolDefinition[] = [
  { key: 'bolt', glyph: '⚡', label: 'lightning bolt' },
  { key: 'plug', glyph: '🔌', label: 'plug' },
  { key: 'battery', glyph: '🔋', label: 'battery' },
  { key: 'floppy', glyph: '💾', label: 'floppy disk' },
  { key: 'disc', glyph: '📀', label: 'disc' },
  { key: 'magnet', glyph: '🧲', label: 'magnet' },
  { key: 'satellite', glyph: '📡', label: 'satellite dish' },
  { key: 'joystick', glyph: '🕹️', label: 'joystick' },
]

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items]

  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }

  return next
}

const createDeck = (): Card[] =>
  shuffle(
    SYMBOLS.flatMap((symbol, index) => [
      { uid: index * 2, symbol },
      { uid: index * 2 + 1, symbol },
    ]),
  )

const isBetter = (candidate: Best, previous: Best | null): boolean => {
  if (!previous) return true
  if (candidate.moves !== previous.moves) return candidate.moves < previous.moves
  return candidate.seconds < previous.seconds
}

export const TechMatch: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [started, setStarted] = useState(false)
  const [best, setBest] = useState<Best | null>(null)

  const lockRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const won = cards.length > 0 && matched.length === cards.length

  useEffect(() => {
    setCards(createDeck())
    setBest(readBestScore<Best>(GAME_KEY))
  }, [])

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    [],
  )

  useEffect(() => {
    if (!started || won) return

    const id = window.setInterval(() => {
      setSeconds(prev => prev + 1)
    }, 1000)

    return () => window.clearInterval(id)
  }, [started, won])

  useEffect(() => {
    if (!won) return

    const candidate: Best = { moves, seconds }
    if (!isBetter(candidate, best)) return

    writeBestScore(GAME_KEY, candidate)
    setBest(candidate)
  }, [won, moves, seconds, best])

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    lockRef.current = false
    setCards(createDeck())
    setFlipped([])
    setMatched([])
    setMoves(0)
    setSeconds(0)
    setStarted(false)
  }, [])

  const flip = (index: number) => {
    if (lockRef.current || won) return
    if (matched.includes(index) || flipped.includes(index)) return

    if (!started) setStarted(true)

    const next = [...flipped, index]
    setFlipped(next)

    if (next.length < 2) return

    setMoves(current => current + 1)

    const [first, second] = next
    const isPair = cards[first].symbol.key === cards[second].symbol.key

    // Lock while the pair is revealed so a third click cannot join the comparison.
    lockRef.current = true

    if (isPair) {
      timeoutRef.current = setTimeout(() => {
        setMatched(current => [...current, first, second])
        setFlipped([])
        lockRef.current = false
      }, 400)
      return
    }

    timeoutRef.current = setTimeout(() => {
      setFlipped([])
      lockRef.current = false
    }, 900)
  }

  return (
    <div className={classes.game}>
      <div className={classes.scoreboard}>
        <div className={classes.stat}>
          <span className={classes.statValue}>{moves}</span>
          <span className={classes.statLabel}>Moves</span>
        </div>
        <div className={classes.stat}>
          <span
            className={classes.statValue}
            role="timer"
            aria-label={`${seconds} seconds elapsed`}
          >
            {seconds}
          </span>
          <span className={classes.statLabel}>Seconds</span>
        </div>
        <div className={classes.stat}>
          <span className={classes.statValue}>
            {best ? `${best.moves} / ${best.seconds}` : '—'}
          </span>
          <span className={classes.statLabel}>Best moves / time</span>
        </div>
      </div>

      <p className={classes.copy}>
        Find all eight pairs. Fewest moves wins — then the fastest time.
      </p>

      <div className={classes.board}>
        {cards.map((card, index) => {
          const isRevealed = flipped.includes(index) || matched.includes(index)
          const isMatched = matched.includes(index)

          return (
            <button
              key={card.uid}
              type="button"
              className={[
                classes.card,
                isRevealed ? classes.revealed : '',
                isMatched ? classes.matched : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => flip(index)}
              disabled={isMatched}
              aria-label={
                isRevealed
                  ? `Card ${index + 1}, ${card.symbol.label}`
                  : `Card ${index + 1}, face down`
              }
            >
              <span className={classes.glyph} aria-hidden="true">
                {isRevealed ? card.symbol.glyph : '?'}
              </span>
            </button>
          )
        })}
      </div>

      <div className={classes.actions} aria-live="polite">
        {won ? (
          <>
            <p className={[classes.resultScore, bungee.className].join(' ')}>
              {moves} moves · {seconds}s
            </p>
            <button type="button" className={classes.primaryButton} onClick={reset}>
              Play again
            </button>
          </>
        ) : (
          <button type="button" className={classes.secondaryButton} onClick={reset}>
            Shuffle
          </button>
        )}
      </div>
    </div>
  )
}

'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../_components/Button'

import VALID_WORDS from './validWords.json'

import classes from './index.module.scss'

const SOLUTION = 'MERCH'
const MAX_GUESSES = 6
const WORD_LENGTH = 5

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
]

const getRowStatuses = (guess: string, solution: string) => {
  const statuses = Array(WORD_LENGTH).fill(classes.absent)
  const solutionChars = solution.split('')
  const remainingSolutionChars: Record<string, number> = {}

  // Pass 1: Count how many of each letter exist in the solution
  solutionChars.forEach(char => {
    remainingSolutionChars[char] = (remainingSolutionChars[char] || 0) + 1
  })

  // Pass 2: Find all EXACT matches (Green) first
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === solution[i]) {
      statuses[i] = classes.correct
      remainingSolutionChars[guess[i]]--
    }
  }

  // Pass 3: Find PARTIAL matches (Yellow) with remaining letters
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (statuses[i] !== classes.correct) {
      const char = guess[i]
      if (remainingSolutionChars[char] > 0) {
        statuses[i] = classes.present
        remainingSolutionChars[char]--
      }
    }
  }

  return statuses
}

export const WordleGame: React.FC = () => {
  const [guesses, setGuesses] = useState<string[]>([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [shakeRow, setShakeRow] = useState(false)
  const [message, setMessage] = useState('')
  const announcementRef = useRef<HTMLDivElement>(null)

  const resetGame = () => {
    setGuesses([])
    setCurrentGuess('')
    setGameStatus('playing')
    setMessage('')
  }

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 2500)
  }

  const onKeyPress = useCallback(
    (key: string) => {
      if (gameStatus !== 'playing') return

      if (key === 'BACKSPACE') {
        setCurrentGuess(prev => prev.slice(0, -1))
        return
      }

      if (key === 'ENTER') {
        if (currentGuess.length !== WORD_LENGTH) {
          showMessage('Not enough letters')
          setShakeRow(true)
          setTimeout(() => setShakeRow(false), 500)
          return
        }

        if (!VALID_WORDS.includes(currentGuess.toLowerCase()) && currentGuess !== SOLUTION) {
          showMessage('Not in word list')
          setShakeRow(true)
          setTimeout(() => setShakeRow(false), 500)
          return
        }

        const newGuesses = [...guesses, currentGuess]
        setGuesses(newGuesses)
        setCurrentGuess('')

        if (currentGuess === SOLUTION) {
          setGameStatus('won')
        } else if (newGuesses.length >= MAX_GUESSES) {
          setGameStatus('lost')
        }
        return
      }

      if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
        setCurrentGuess(prev => prev + key)
      }
    },
    [currentGuess, gameStatus, guesses],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const key = e.key.toUpperCase()
      if (key === 'ENTER' || key === 'BACKSPACE') {
        onKeyPress(key)
      } else if (/^[A-Z]$/.test(key)) {
        onKeyPress(key)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onKeyPress])

  useEffect(() => {
    if ((gameStatus === 'won' || gameStatus === 'lost') && announcementRef.current) {
      setTimeout(() => {
        announcementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }, [gameStatus])

  const getKeyStatus = (key: string) => {
    let bestStatus = ''

    guesses.forEach(guess => {
      // Evaluate the row accurately to avoid false yellow keyboard keys
      const rowStatuses = getRowStatuses(guess, SOLUTION)

      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === key) {
          const status = rowStatuses[i]

          // Upgrade status based on priority: Correct > Present > Absent
          if (status === classes.correct) {
            bestStatus = classes.correct
          } else if (status === classes.present && bestStatus !== classes.correct) {
            bestStatus = classes.present
          } else if (status === classes.absent && bestStatus === '') {
            bestStatus = classes.absent
          }
        }
      }
    })

    return bestStatus
  }

  return (
    <div className={classes.wordleContainer}>
      {message && <div className={classes.toast}>{message}</div>}

      <div className={classes.board}>
        {[...Array(MAX_GUESSES)].map((_, rowIndex) => {
          const isCurrentRow = rowIndex === guesses.length
          const guess = guesses[rowIndex] || (isCurrentRow ? currentGuess : '')
          const rowClasses = [classes.row, isCurrentRow && shakeRow ? classes.shake : ''].join(' ')

          // --- UPDATED ROW EVALUATION ---
          const isSubmitted = rowIndex < guesses.length
          const rowStatuses = isSubmitted ? getRowStatuses(guess, SOLUTION) : []

          return (
            <div key={rowIndex} className={rowClasses}>
              {[...Array(WORD_LENGTH)].map((_, colIndex) => {
                const letter = guess[colIndex] || ''
                const letterStatus = isSubmitted ? rowStatuses[colIndex] : ''

                return (
                  <div
                    key={colIndex}
                    className={`${classes.tile} ${letterStatus} ${
                      letter && !isSubmitted ? classes.populated : ''
                    }`}
                  >
                    {letter}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className={classes.keyboard}>
        {KEYBOARD_ROWS.map((row, i) => (
          <div key={i} className={classes.keyboardRow}>
            {row.map(key => {
              const keyStatus = getKeyStatus(key)
              return (
                <button
                  key={key}
                  onClick={() => onKeyPress(key)}
                  className={`${classes.key} ${keyStatus} ${key.length > 1 ? classes.keyWide : ''}`}
                >
                  {key === 'BACKSPACE' ? '←' : key}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {(gameStatus === 'won' || gameStatus === 'lost') && (
        <div ref={announcementRef} className={classes.announcement}>
          {gameStatus === 'won' && (
            <Button href="/merch" label="GET OUR MERCH" appearance="primary" />
          )}
          {gameStatus === 'lost' && (
            <>
              <p className={classes.tryAgainText}>Not quite — give it another go!</p>
              <button className={classes.tryAgainButton} onClick={resetGame}>
                Try Again
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

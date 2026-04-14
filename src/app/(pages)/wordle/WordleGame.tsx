'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import classes from './index.module.scss'
import VALID_WORDS from './validWords.json'

const SOLUTION = 'MERCH'
const MAX_GUESSES = 6
const WORD_LENGTH = 5

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
]

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

  // Auto-scroll to announcement when game ends
  useEffect(() => {
    if ((gameStatus === 'won' || gameStatus === 'lost') && announcementRef.current) {
      // Small delay to allow the DOM to render the announcement first
      setTimeout(() => {
        announcementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }, [gameStatus])

  const getLetterStatus = (letter: string, i: number) => {
    if (SOLUTION[i] === letter) return classes.correct
    if (SOLUTION.includes(letter)) return classes.present
    return classes.absent
  }

  const getKeyStatus = (key: string) => {
    let status = ''
    guesses.forEach(guess => {
      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === key) {
          if (SOLUTION[i] === key) {
            status = classes.correct
          } else if (SOLUTION.includes(key) && status !== classes.correct) {
            status = classes.present
          } else if (status === '') {
            status = classes.absent
          }
        }
      }
    })
    return status
  }

  return (
    <div className={classes.wordleContainer}>
      {message && <div className={classes.toast}>{message}</div>}

      <div className={classes.board}>
        {[...Array(MAX_GUESSES)].map((_, rowIndex) => {
          const isCurrentRow = rowIndex === guesses.length
          const guess = guesses[rowIndex] || (isCurrentRow ? currentGuess : '')
          const rowClasses = [classes.row, isCurrentRow && shakeRow ? classes.shake : ''].join(' ')

          return (
            <div key={rowIndex} className={rowClasses}>
              {[...Array(WORD_LENGTH)].map((_, colIndex) => {
                const letter = guess[colIndex] || ''
                const isSubmitted = rowIndex < guesses.length
                const letterStatus = isSubmitted ? getLetterStatus(letter, colIndex) : ''

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
          {gameStatus === 'won' && <div className={classes.dateDisplay}>20/04/2026.</div>}
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

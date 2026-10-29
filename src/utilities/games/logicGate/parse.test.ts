import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { ExprNode } from './logic'
import { MAX_DEPTH, MAX_GATES, parseCircuitText } from './parse'

const input = (name: 'A' | 'B' | 'C'): ExprNode => ({ kind: 'input', name })

const gate = (op: 'AND' | 'OR' | 'XOR' | 'NOT', children: Array<ExprNode | null>): ExprNode => ({
  kind: 'gate',
  op,
  children,
})

/** Parse and assert success, returning the expression. */
const parse = (source: string): ExprNode => {
  const result = parseCircuitText(source)
  assert.equal(result.status, 'ok', `expected "${source}" to parse, got ${JSON.stringify(result)}`)
  return result.status === 'ok' ? result.expression : input('A')
}

const errorEven = (source: string): string => {
  const result = parseCircuitText(source)
  assert.equal(
    result.status,
    'error',
    `expected "${source}" to fail, got ${JSON.stringify(result)}`,
  )
  return result.status === 'error' ? result.message : ''
}

test('blank text is empty, not an error', () => {
  assert.deepEqual(parseCircuitText(''), { status: 'empty' })
  assert.deepEqual(parseCircuitText('   \n\t '), { status: 'empty' })
})

test('single inputs parse, case-insensitively', () => {
  assert.deepEqual(parse('A'), input('A'))
  assert.deepEqual(parse('b'), input('B'))
  assert.deepEqual(parse(' C '), input('C'))
})

test('gates and NOT parse', () => {
  assert.deepEqual(parse('A AND B'), gate('AND', [input('A'), input('B')]))
  assert.deepEqual(parse('A OR B'), gate('OR', [input('A'), input('B')]))
  assert.deepEqual(parse('A XOR B'), gate('XOR', [input('A'), input('B')]))
  assert.deepEqual(parse('NOT A'), gate('NOT', [input('A')]))
  assert.deepEqual(parse('not not a'), gate('NOT', [gate('NOT', [input('A')])]))
})

test('symbols work as shorthand', () => {
  assert.deepEqual(parse('A && !B'), gate('AND', [input('A'), gate('NOT', [input('B')])]))
  assert.deepEqual(parse('A || B'), gate('OR', [input('A'), input('B')]))
  assert.deepEqual(parse('A & B'), gate('AND', [input('A'), input('B')]))
  assert.deepEqual(parse('A | B'), gate('OR', [input('A'), input('B')]))
  assert.deepEqual(parse('A ^ B'), gate('XOR', [input('A'), input('B')]))
  assert.deepEqual(parse('!A'), gate('NOT', [input('A')]))
})

test('brackets group the expression', () => {
  assert.deepEqual(
    parse('(A AND B) OR NOT C'),
    gate('OR', [gate('AND', [input('A'), input('B')]), gate('NOT', [input('C')])]),
  )
  assert.deepEqual(
    parse('(A OR B) AND C'),
    gate('AND', [gate('OR', [input('A'), input('B')]), input('C')]),
  )
  assert.deepEqual(parse('NOT (A AND B)'), gate('NOT', [gate('AND', [input('A'), input('B')])]))
})

test('precedence is NOT > AND > XOR > OR, left associative', () => {
  assert.deepEqual(
    parse('A AND B OR C'),
    gate('OR', [gate('AND', [input('A'), input('B')]), input('C')]),
  )
  assert.deepEqual(
    parse('A OR B AND C'),
    gate('OR', [input('A'), gate('AND', [input('B'), input('C')])]),
  )
  assert.deepEqual(
    parse('A AND B AND C'),
    gate('AND', [gate('AND', [input('A'), input('B')]), input('C')]),
  )
  assert.deepEqual(
    parse('A OR B OR C'),
    gate('OR', [gate('OR', [input('A'), input('B')]), input('C')]),
  )
  assert.deepEqual(
    parse('A OR B XOR C'),
    gate('OR', [input('A'), gate('XOR', [input('B'), input('C')])]),
  )
  assert.deepEqual(
    parse('A XOR B AND C'),
    gate('XOR', [input('A'), gate('AND', [input('B'), input('C')])]),
  )
  assert.deepEqual(parse('NOT A AND B'), gate('AND', [gate('NOT', [input('A')]), input('B')]))
})

test('whitespace and newlines are ignored', () => {
  assert.deepEqual(parse('(\n  A   AND\n  B\n)'), gate('AND', [input('A'), input('B')]))
})

test('dangling operators and stray brackets are reported', () => {
  assert.match(errorEven('A AND'), /expression ended/i)
  assert.match(errorEven('(A AND B'), /missing "\)"/i)
  assert.match(errorEven('A)'), /unexpected "\)"/i)
  assert.match(errorEven('()'), /empty brackets/i)
  assert.match(errorEven('AND A'), /expected an input or "\("/i)
  assert.match(errorEven('A B'), /add an operator/i)
  assert.match(errorEven('(A) (B)'), /add an operator/i)
})

test('unknown words and characters are reported with a column', () => {
  assert.match(errorEven('A NAND B'), /unknown word "NAND" at column 3/i)
  assert.match(errorEven('A + B'), /unexpected character "\+"/i)
  assert.match(errorEven('AB'), /unknown word "AB"/i)
})

test('nesting and gate limits match the server validator', () => {
  const atDepthLimit = `${'NOT '.repeat(MAX_DEPTH)}A`
  assert.deepEqual(
    parse(atDepthLimit),
    Array.from({ length: MAX_DEPTH }).reduce<ExprNode>(
      (node, index) => (index === 0 ? gate('NOT', [input('A')]) : gate('NOT', [node])),
      input('A'),
    ),
  )

  assert.match(errorEven(`${'NOT '.repeat(MAX_DEPTH + 1)}A`), /nested .* levels deep/i)

  // A long flat chain is deep as well as wide, so build a balanced tree to test
  // the gate limit independently of the depth limit.
  const balancedAnd = (leaves: number): string => {
    if (leaves <= 1) return 'A'
    const left = Math.floor(leaves / 2)
    return `(${balancedAnd(left)} AND ${balancedAnd(leaves - left)})`
  }

  assert.equal(parseCircuitText(balancedAnd(MAX_GATES + 1)).status, 'ok')
  assert.match(errorEven(balancedAnd(MAX_GATES + 2)), /gates; the limit is 32/i)
})

/**
 * Text parser for the Logic Gate Lab textbox.
 *
 * Grammar (left associative, loosest binding first):
 *
 *   expression := xor ( OR xor )*
 *   xor        := and ( XOR and )*
 *   and        := unary ( AND unary )*
 *   unary      := NOT unary | primary
 *   primary    := A | B | C | "(" expression ")"
 *
 * `&&`/`&`, `||`/`|`, `^` and `!` are accepted as shorthands. Inputs and gates
 * are case-insensitive. Parsing never throws and never trusts client text beyond
 * building the same circuit tree the rest of the game uses; the server validator
 * still re-derives the result from the submitted circuit.
 */

import {
  countGates,
  type ExprNode,
  GATE_OPS,
  type GateOp,
  INPUT_NAMES,
  type InputName,
} from './logic'

/** Mirrors the server validator's gate limit so text is not rejected on submit. */
export const MAX_GATES = 32

/** Mirrors the depth limit in the server's expression sanitizer. */
export const MAX_DEPTH = 12

export type ParseResult =
  | { status: 'empty' }
  | { status: 'ok'; expression: ExprNode }
  | { status: 'error'; message: string }

type Token =
  | { kind: 'input'; name: InputName; column: number }
  | { kind: 'gate'; op: GateOp; column: number }
  | { kind: 'open'; column: number }
  | { kind: 'close'; column: number }

const SYMBOL_OPERATORS: Array<{ symbol: string; op: GateOp }> = [
  { symbol: '&&', op: 'AND' },
  { symbol: '&', op: 'AND' },
  { symbol: '||', op: 'OR' },
  { symbol: '|', op: 'OR' },
  { symbol: '^', op: 'XOR' },
  { symbol: '!', op: 'NOT' },
]

const isGateOp = (word: string): word is GateOp => (GATE_OPS as readonly string[]).includes(word)
const isInputName = (word: string): word is InputName =>
  (INPUT_NAMES as readonly string[]).includes(word)

type TokenizeResult = { tokens: Token[] } | { error: string }

const tokenize = (source: string): TokenizeResult => {
  const tokens: Token[] = []
  let index = 0

  while (index < source.length) {
    const char = source[index]

    if (/\s/.test(char)) {
      index += 1
      continue
    }

    const column = index + 1

    if (char === '(') {
      tokens.push({ kind: 'open', column })
      index += 1
      continue
    }

    if (char === ')') {
      tokens.push({ kind: 'close', column })
      index += 1
      continue
    }

    const symbol = SYMBOL_OPERATORS.find(entry => source.startsWith(entry.symbol, index))
    if (symbol) {
      tokens.push({ kind: 'gate', op: symbol.op, column })
      index += symbol.symbol.length
      continue
    }

    if (/[A-Za-z]/.test(char)) {
      let end = index
      while (end < source.length && /[A-Za-z]/.test(source[end])) end += 1

      const word = source.slice(index, end).toUpperCase()

      if (isInputName(word)) {
        tokens.push({ kind: 'input', name: word, column })
      } else if (isGateOp(word)) {
        tokens.push({ kind: 'gate', op: word, column })
      } else {
        return {
          error: `Unknown word "${source.slice(
            index,
            end,
          )}" at column ${column} — use A, B, C, AND, OR, XOR, NOT.`,
        }
      }

      index = end
      continue
    }

    return { error: `Unexpected character "${char}" at column ${column}.` }
  }

  return { tokens }
}

const describeToken = (token: Token): string => {
  switch (token.kind) {
    case 'input':
      return `"${token.name}"`
    case 'gate':
      return `"${token.op}"`
    case 'open':
      return '"("'
    case 'close':
      return '")"'
  }
}

const BINARY_PRECEDENCE: Record<GateOp, number | undefined> = {
  OR: 1,
  XOR: 2,
  AND: 3,
  NOT: undefined,
}

const expressionDepth = (node: ExprNode): number => {
  if (node.kind === 'input') return 0

  let deepest = 0
  node.children.forEach(child => {
    if (child) deepest = Math.max(deepest, expressionDepth(child))
  })

  return deepest + 1
}

const parseTokens = (tokens: Token[]): ParseResult => {
  let index = 0
  let error = ''

  const current = (): Token | undefined => tokens[index]
  const consume = (): void => {
    index += 1
  }
  const fail = (message: string): null => {
    error = message
    return null
  }

  const parseBinary = (minPrecedence: number): ExprNode | null => {
    let left = parseUnary()
    if (!left) return null

    for (;;) {
      const token = current()
      if (!token || token.kind !== 'gate') return left

      const precedence = BINARY_PRECEDENCE[token.op]
      if (precedence === undefined || precedence < minPrecedence) return left

      consume()

      const right = parseBinary(precedence + 1)
      if (!right) return null

      left = { kind: 'gate', op: token.op, children: [left, right] }
    }
  }

  const parsePrimary = (): ExprNode | null => {
    const token = current()
    if (!token) return fail('Expected an input or "(" but the expression ended.')

    if (token.kind === 'input') {
      consume()
      return { kind: 'input', name: token.name }
    }

    if (token.kind === 'open') {
      consume()

      const next = current()
      if (next && next.kind === 'close') {
        return fail(
          `Empty brackets at column ${token.column} — put an expression inside, e.g. "(A AND B)".`,
        )
      }

      const inner = parseBinary(1)
      if (!inner) return null

      const closing = current()
      if (!closing || closing.kind !== 'close') {
        return fail(`Missing ")" to close the bracket opened at column ${token.column}.`)
      }

      consume()
      return inner
    }

    if (token.kind === 'close') {
      return fail(`Unexpected ")" at column ${token.column} — there is no bracket for it to close.`)
    }

    return fail(
      `Expected an input or "(" but found ${describeToken(token)} at column ${token.column}.`,
    )
  }

  const parseUnary = (): ExprNode | null => {
    const token = current()

    if (token && token.kind === 'gate' && token.op === 'NOT') {
      consume()

      const child = parseUnary()
      if (!child) return null

      return { kind: 'gate', op: 'NOT', children: [child] }
    }

    return parsePrimary()
  }

  const expression = parseBinary(1)
  if (!expression) return { status: 'error', message: error || 'Could not read the expression.' }

  const trailing = current()
  if (trailing) {
    return {
      status: 'error',
      message: `Unexpected ${describeToken(trailing)} at column ${
        trailing.column
      } — add an operator (AND, OR, XOR) between parts.`,
    }
  }

  const gates = countGates(expression)
  if (gates > MAX_GATES) {
    return {
      status: 'error',
      message: `That circuit uses ${gates} gates; the limit is ${MAX_GATES}.`,
    }
  }

  const depth = expressionDepth(expression)
  if (depth > MAX_DEPTH) {
    return {
      status: 'error',
      message: `That circuit is nested ${depth} levels deep; the limit is ${MAX_DEPTH}.`,
    }
  }

  return { status: 'ok', expression }
}

/**
 * Parse the textbox contents into a circuit.
 *
 * Blank text is `empty` (not an error), valid text is `ok`, and anything the
 * grammar cannot read is `error` with a message aimed at the player.
 */
export const parseCircuitText = (source: string): ParseResult => {
  const tokenized = tokenize(source)
  if ('error' in tokenized) return { status: 'error', message: tokenized.error }
  if (tokenized.tokens.length === 0) return { status: 'empty' }

  return parseTokens(tokenized.tokens)
}

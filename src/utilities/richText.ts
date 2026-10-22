interface RichTextNode {
  text?: string
  children?: unknown[]
  url?: string
  [key: string]: unknown
}

const isNode = (value: unknown): value is RichTextNode =>
  typeof value === 'object' && value !== null

const collectInlineText = (node: RichTextNode, out: string[]): void => {
  if (typeof node.text === 'string') out.push(node.text)

  if (Array.isArray(node.children)) {
    node.children.forEach(child => {
      if (isNode(child)) collectInlineText(child, out)
    })
  }

  // Slate link nodes keep the target in `url`; calendar apps can't render the
  // rich text link, so keep the destination in the plain-text copy.
  if (typeof node.url === 'string' && node.url.trim()) {
    out.push(` (${node.url.trim()})`)
  }
}

/**
 * Flattens Payload's Slate rich text (or a legacy plain string) into readable
 * plain text. Blocks become newline-separated lines.
 */
export const richTextToPlainText = (content: unknown): string => {
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''

  const lines: string[] = []

  content.forEach(block => {
    if (!isNode(block)) return

    const parts: string[] = []
    collectInlineText(block, parts)

    const line = parts.join('').replace(/\s+/g, ' ').trim()

    if (line) lines.push(line)
  })

  return lines.join('\n')
}

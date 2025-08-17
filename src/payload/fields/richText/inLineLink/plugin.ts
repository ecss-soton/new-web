import type { RichTextCustomLeaf } from '@payloadcms/richtext-slate/dist/types'
import type { BaseEditor } from 'slate'

type RichTextPlugin = Exclude<RichTextCustomLeaf['plugins'], undefined>[0]

const withInLineLink: RichTextPlugin = incomingEditor => {
  const editor: BaseEditor & {
    shouldBreakOutOnEnter?: (element: any) => boolean // eslint-disable-line @typescript-eslint/no-explicit-any
  } = incomingEditor

  const { shouldBreakOutOnEnter } = editor

  if (shouldBreakOutOnEnter) {
    editor.shouldBreakOutOnEnter = element =>
      element.type === 'inline-link' ? true : shouldBreakOutOnEnter(element)
  }

  return editor
}

export default withInLineLink

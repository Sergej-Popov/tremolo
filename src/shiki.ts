import { getHighlighter, type Highlighter } from 'shiki/bundle/web'

let highlighterPromise: Promise<Highlighter> | null = null

export function initShiki(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = getHighlighter({
      themes: ['github-light'],
      langs: ['javascript', 'typescript', 'python', 'java', 'cpp', 'plaintext']
    })
  }
  return highlighterPromise
}

export async function highlightCode(code: string, lang: string): Promise<string> {
  const hl = await initShiki()
  return hl.codeToHtml(code, { lang, theme: 'github-light' })
}

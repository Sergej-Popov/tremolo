import { getHighlighter, type Highlighter } from 'shiki'

let highlighterPromise: Promise<Highlighter> | null = null

export function initShiki(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = getHighlighter({
      themes: ['github-light'],
      langs: ['javascript', 'typescript', 'python', 'java', 'cpp']
    })
  }
  return highlighterPromise
}

export async function highlightCode(code: string, lang: string): Promise<string> {
  const hl = await initShiki()
  return hl.codeToHtml(code, { lang: lang as any, theme: 'github-light' })
}

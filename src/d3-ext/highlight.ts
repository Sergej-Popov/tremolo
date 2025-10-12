import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

export const highlightLangs = [
    'javascript',
    'typescript',
    'python',
    'java',
    'c',
    'cpp',
    'csharp',
    'go',
    'ruby',
    'php',
    'rust',
    'markdown',
] as const;

export const highlightThemes = [
    'github-dark',
    'github-light',
] as const;

export interface HighlightResult { html: string; background: string }

export async function highlightCode(code: string, lang: string, theme: string): Promise<HighlightResult> {
    try {
        if (!highlighterPromise) {
            highlighterPromise = createHighlighter({ themes: highlightThemes as unknown as string[], langs: highlightLangs });
        }
        const highlighter = await highlighterPromise;
        const raw = highlighter.codeToHtml(code, { lang, theme });
        const bgMatch = raw.match(/background-color:([^;]+);/);
        const html = raw.replace(/^<pre[^>]*>/, '').replace(/<\/pre>$/, '');
        return { html, background: bgMatch ? bgMatch[1] : '#f5f5f5' };
    } catch {
        return { html: code.replace(/</g, '&lt;'), background: '#f5f5f5' };
    }
}

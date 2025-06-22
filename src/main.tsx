import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import hljs from 'highlight.js/lib/common'
import hljsLineNumbers from 'highlightjs-line-numbers.js'
import 'highlight.js/styles/default.css'
import 'highlightjs-line-numbers.js/dist/highlightjs-line-numbers.css'

hljsLineNumbers(hljs)
(window as any).hljs = hljs

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

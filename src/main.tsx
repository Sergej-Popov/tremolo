import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initShiki } from './shiki'

initShiki().then(hl => {
  ;(window as any).shikiHighlighter = hl
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

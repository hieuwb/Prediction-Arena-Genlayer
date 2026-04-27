import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// OAuth popup callback handler. When the auth popup window navigates
// here (path = /oauth/discord or /oauth/x), parse the response off the
// URL and postMessage it back to the opener. Skip rendering the full
// app — we just close the popup once the message is delivered.
function handleOAuthCallback(): boolean {
  const path = window.location.pathname
  let provider: string | null = null
  let payload: Record<string, string> = {}

  if (path === '/oauth/discord') {
    provider = 'discord'
    // Implicit grant returns token in the URL fragment, e.g.
    //   /oauth/discord#access_token=...&token_type=Bearer&expires_in=...
    const frag = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    payload = Object.fromEntries(new URLSearchParams(frag).entries())
  } else if (path === '/oauth/x') {
    provider = 'x'
    // PKCE returns code + state in the URL query, e.g.
    //   /oauth/x?code=...&state=...
    payload = Object.fromEntries(
      new URLSearchParams(window.location.search).entries(),
    )
  }

  if (!provider) return false

  if (window.opener) {
    window.opener.postMessage({ provider, payload }, window.location.origin)
  }
  // Fallback UI in case window.opener is gone (user reloaded the popup).
  document.body.style.cssText =
    'background:#0a0420;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0'
  document.body.innerHTML =
    '<div style="text-align:center"><div style="font-size:24px;font-weight:700">Sign-in complete</div><div style="opacity:.6;margin-top:8px">You can close this window.</div></div>'
  window.setTimeout(() => window.close(), 400)
  return true
}

if (!handleOAuthCallback()) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

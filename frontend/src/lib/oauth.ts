// OAuth glue for Discord + X (Twitter).
//
// Both providers use the standard "popup window" pattern with no backend:
//
//   1. Main window opens a popup at the provider's authorize URL
//   2. User approves in the popup
//   3. Provider redirects the popup to /oauth/<provider> on our origin
//   4. The callback page (in main.tsx) reads the auth response from the
//      URL fragment / query string, postMessage()s it to window.opener,
//      and closes itself
//   5. This module's promise resolves with the fetched profile
//
// Discord uses **implicit grant** (response_type=token) — token comes
// back in URL fragment, no exchange needed. Works for SPAs out of the
// box once the app is registered.
//
// X uses **OAuth 2.0 PKCE** — code in URL query, exchanged via POST to
// the token endpoint with the code_verifier we generated. Public client,
// no secret needed.
//
// Environment:
//   VITE_DISCORD_CLIENT_ID — Discord Application ID
//   VITE_X_CLIENT_ID       — X (Twitter) OAuth 2.0 Client ID
//
// Redirect URIs to register at the provider dashboards:
//   Discord: <origin>/oauth/discord
//   X:       <origin>/oauth/x
//
// When the env var is not set, isDiscordEnabled() / isXEnabled() return
// false and the UI falls back to the local "demo" toggle.

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID as
  | string
  | undefined

const X_CLIENT_ID = import.meta.env.VITE_X_CLIENT_ID as string | undefined

export type SocialProfile = {
  id: string
  username: string
  avatarUrl?: string
}

export function isDiscordEnabled(): boolean {
  return !!DISCORD_CLIENT_ID
}

export function isXEnabled(): boolean {
  return !!X_CLIENT_ID
}

const DISCORD_REDIRECT_PATH = '/oauth/discord'
const X_REDIRECT_PATH = '/oauth/x'

function origin(): string {
  return window.location.origin
}

function openPopup(url: string, name: string): Window {
  const w = 520
  const h = 720
  const left = window.screenX + (window.outerWidth - w) / 2
  const top = window.screenY + (window.outerHeight - h) / 2
  const popup = window.open(
    url,
    name,
    `popup=yes,width=${w},height=${h},left=${left},top=${top}`,
  )
  if (!popup) throw new Error('Popup blocked — allow popups for this site')
  return popup
}

// Single shared message bus. Both providers post `{provider, payload}`
// from the callback page; this hook resolves the matching pending
// promise.
type PendingResolver = (payload: Record<string, string>) => void
const pending: Record<string, PendingResolver | undefined> = {}

if (typeof window !== 'undefined') {
  window.addEventListener('message', (e) => {
    if (e.origin !== window.location.origin) return
    const { provider, payload } = (e.data ?? {}) as {
      provider?: string
      payload?: Record<string, string>
    }
    if (!provider || !payload) return
    pending[provider]?.(payload)
    pending[provider] = undefined
  })
}

function awaitCallback(
  provider: string,
  popup: Window,
): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    pending[provider] = resolve
    // Reject if user closes the popup without completing flow.
    const watch = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(watch)
        if (pending[provider]) {
          pending[provider] = undefined
          reject(new Error('Cancelled'))
        }
      }
    }, 500)
  })
}

// ─── Discord (implicit grant) ─────────────────────────────────────────

export async function connectDiscord(): Promise<SocialProfile> {
  if (!DISCORD_CLIENT_ID) {
    throw new Error('VITE_DISCORD_CLIENT_ID not set')
  }
  const redirect = origin() + DISCORD_REDIRECT_PATH
  const url =
    'https://discord.com/api/oauth2/authorize?' +
    new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: redirect,
      response_type: 'token',
      scope: 'identify',
    }).toString()

  const popup = openPopup(url, 'discord-oauth')
  const payload = await awaitCallback('discord', popup)
  const accessToken = payload.access_token
  if (!accessToken) throw new Error('No access_token from Discord')

  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Discord profile fetch ${res.status}`)
  const u = (await res.json()) as {
    id: string
    username: string
    avatar?: string | null
  }
  return {
    id: u.id,
    username: u.username,
    avatarUrl: u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`
      : undefined,
  }
}

// ─── X (OAuth 2.0 PKCE) ───────────────────────────────────────────────

function randomString(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function pkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(digest)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function connectX(): Promise<SocialProfile> {
  if (!X_CLIENT_ID) {
    throw new Error('VITE_X_CLIENT_ID not set')
  }
  const redirect = origin() + X_REDIRECT_PATH
  const verifier = randomString(48)
  const challenge = await pkceChallenge(verifier)
  const state = randomString(8)
  sessionStorage.setItem('x-pkce-verifier', verifier)
  sessionStorage.setItem('x-pkce-state', state)

  const url =
    'https://twitter.com/i/oauth2/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: X_CLIENT_ID,
      redirect_uri: redirect,
      scope: 'users.read tweet.read',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString()

  const popup = openPopup(url, 'x-oauth')
  const payload = await awaitCallback('x', popup)
  if (payload.state !== state) throw new Error('X OAuth state mismatch')
  const code = payload.code
  if (!code) throw new Error('No code from X')

  // Public client token exchange — POST form-encoded, no secret.
  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: X_CLIENT_ID,
      redirect_uri: redirect,
      code,
      code_verifier: verifier,
    }),
  })
  if (!tokenRes.ok) throw new Error(`X token exchange ${tokenRes.status}`)
  const { access_token } = (await tokenRes.json()) as { access_token: string }

  const meRes = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=profile_image_url',
    {
      headers: { Authorization: `Bearer ${access_token}` },
    },
  )
  if (!meRes.ok) throw new Error(`X profile fetch ${meRes.status}`)
  const { data } = (await meRes.json()) as {
    data: { id: string; username: string; profile_image_url?: string }
  }
  return {
    id: data.id,
    username: data.username,
    avatarUrl: data.profile_image_url,
  }
}

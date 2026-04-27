// Lightweight programmatic SFX via Web Audio API. Avoids bundling audio
// files — every sound is synthesized from oscillators on the fly. Each
// "voice" is one osc + envelope (attack/decay) routed to a shared master
// gain so a single mute flag silences everything.

let ctx: AudioContext | null = null
let master: GainNode | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.6
    master.connect(ctx.destination)
  }
  return ctx
}

type Voice = {
  freq: number
  /** Optional sweep target frequency over the duration */
  freqEnd?: number
  type: OscillatorType
  /** Seconds of attack (0..) */
  attack: number
  /** Seconds of decay tail (0..) */
  decay: number
  gain: number
  /** Delay before the voice starts, in seconds */
  delay?: number
}

function play(voices: Voice[], muted: boolean) {
  if (muted) return
  const c = getCtx()
  if (!c || !master) return
  if (c.state === 'suspended') void c.resume()
  const start = c.currentTime
  for (const v of voices) {
    const t0 = start + (v.delay ?? 0)
    const t1 = t0 + v.attack
    const t2 = t1 + v.decay
    const osc = c.createOscillator()
    osc.type = v.type
    osc.frequency.setValueAtTime(v.freq, t0)
    if (v.freqEnd != null) {
      osc.frequency.linearRampToValueAtTime(v.freqEnd, t2)
    }
    const g = c.createGain()
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(v.gain, t1)
    g.gain.exponentialRampToValueAtTime(0.0001, t2)
    osc.connect(g)
    g.connect(master)
    osc.start(t0)
    osc.stop(t2 + 0.02)
  }
}

// ─── Public SFX ──────────────────────────────────────────────────────────

/** Coin / chip clink — for placing a bet */
export function sfxClink(muted = false) {
  play(
    [
      { freq: 900, type: 'sine', attack: 0.003, decay: 0.16, gain: 0.18 },
      { freq: 1340, type: 'sine', attack: 0.003, decay: 0.22, gain: 0.09 },
    ],
    muted,
  )
}

/** Sci-fi teleport whoosh — sweep + low rumble */
export function sfxWhoosh(muted = false) {
  play(
    [
      { freq: 220, freqEnd: 1100, type: 'sawtooth', attack: 0.02, decay: 0.4, gain: 0.12 },
      { freq: 80, freqEnd: 40, type: 'sine', attack: 0.04, decay: 0.55, gain: 0.18 },
      { freq: 600, freqEnd: 1400, type: 'triangle', attack: 0.04, decay: 0.3, gain: 0.06, delay: 0.05 },
    ],
    muted,
  )
}

/** 3-note chord chime — for resolve completion */
export function sfxChime(muted = false) {
  play(
    [
      { freq: 523, type: 'triangle', attack: 0.02, decay: 0.6, gain: 0.13 },
      { freq: 659, type: 'triangle', attack: 0.05, decay: 0.7, gain: 0.11, delay: 0.06 },
      { freq: 784, type: 'triangle', attack: 0.08, decay: 0.8, gain: 0.09, delay: 0.12 },
    ],
    muted,
  )
}

/** Bright 4-note fanfare — for winning claim */
export function sfxFanfare(muted = false) {
  const notes = [523, 659, 784, 1047] // C5 E5 G5 C6
  notes.forEach((f, i) => {
    play(
      [
        { freq: f, type: 'triangle', attack: 0.02, decay: 0.3, gain: 0.18, delay: i * 0.11 },
        { freq: f * 2, type: 'sine', attack: 0.02, decay: 0.25, gain: 0.06, delay: i * 0.11 },
      ],
      muted,
    )
  })
}

/** Tiny click — for opening modal / hovering pad */
export function sfxClick(muted = false) {
  play(
    [{ freq: 1200, type: 'sine', attack: 0.001, decay: 0.05, gain: 0.06 }],
    muted,
  )
}

/** Soft thunk — generic confirm / connect */
export function sfxThunk(muted = false) {
  play(
    [
      { freq: 180, type: 'square', attack: 0.005, decay: 0.12, gain: 0.1 },
      { freq: 360, type: 'sine', attack: 0.005, decay: 0.16, gain: 0.06 },
    ],
    muted,
  )
}

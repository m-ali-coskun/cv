import confetti from 'canvas-confetti'

/**
 * Celebration effects (canvas-confetti) painted in the *current* theme:
 * colours are read live from the CSS tokens (--accent, --glow-1, --glow-2)
 * so a match on the "Video" tab bursts in violet, on "All" in lime, etc.
 *
 *  - Does nothing when the user switched motion off (data-motion="off").
 *  - "subtle" motion fires roughly half the particles.
 *  - The OS "reduce motion" preference is honoured by canvas-confetti too.
 */

type Opts = confetti.Options

const FALLBACK = '#c9f158'
let ctx: CanvasRenderingContext2D | null = null

/** Normalise any CSS colour (rgb(), color-mix result, hex…) to #rrggbb for canvas-confetti. */
function toHex(input: string): string {
  const c = input.trim()
  if (!c) return FALLBACK
  if (/^#[0-9a-f]{6}$/i.test(c)) return c
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map((x) => x + x).join('')
  const rgb = c.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
  if (rgb) return '#' + rgb.slice(1, 4).map((v) => Math.round(Number(v)).toString(16).padStart(2, '0')).join('')
  // Let the browser resolve anything else (named colours, color(), oklab()…)
  try {
    ctx ??= document.createElement('canvas').getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#000'
      ctx.fillStyle = c
      const resolved = String(ctx.fillStyle)
      if (resolved !== c) return toHex(resolved)
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
    }
  } catch {
    /* ignore */
  }
  return FALLBACK
}

/** Current theme colours: accent, glows, white (+ ink for contrast if asked). */
export function themeColors(withInk = false): string[] {
  if (typeof document === 'undefined') return [FALLBACK, '#ffffff']
  const cs = getComputedStyle(document.documentElement)
  const read = (name: string) => toHex(cs.getPropertyValue(name))
  const out = [read('--accent'), read('--glow-1'), read('--glow-2'), '#ffffff']
  if (withInk) out.push(read('--ink'))
  return out
}

function motionLevel(): 'expressive' | 'subtle' | 'off' {
  if (typeof document === 'undefined') return 'off'
  const m = document.documentElement.dataset.motion
  return m === 'off' ? 'off' : m === 'subtle' ? 'subtle' : 'expressive'
}

/** The OS "reduce motion" flag is honoured unless the user explicitly chose expressive motion. */
const honourOsReduce = () => motionLevel() !== 'expressive'

const scaleCount = (n: number) => Math.max(4, Math.round(motionLevel() === 'subtle' ? n * 0.45 : n))

/** Origin (0..1 viewport fractions) at the centre of an element. */
export function originFrom(el: Element | null | undefined): { x: number; y: number } | undefined {
  if (!el || typeof window === 'undefined') return undefined
  const r = el.getBoundingClientRect()
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
}

export interface FireOptions extends Opts {
  /** Burst from the centre of this element instead of `origin`. */
  from?: Element | null
}

/**
 * A layered burst: a fast narrow core plus a slower, wider bloom — feels
 * like a real popper rather than a fountain.
 */
export function fireConfetti(opts: FireOptions = {}) {
  if (motionLevel() === 'off') return
  const { from, ...rest } = opts
  const origin = originFrom(from) ?? rest.origin ?? { x: 0.5, y: 0.6 }
  const colors = rest.colors ?? themeColors(true)
  const base: Opts = { disableForReducedMotion: honourOsReduce(), zIndex: 120, ...rest, origin, colors }
  const total = rest.particleCount ?? 180
  const shot = (ratio: number, o: Opts) => confetti({ ...base, ...o, particleCount: scaleCount(total * ratio) })
  shot(0.25, { spread: 26, startVelocity: 55 })
  shot(0.2, { spread: 60 })
  shot(0.35, { spread: 100, decay: 0.91, scalar: 0.85 })
  shot(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.25 })
  shot(0.1, { spread: 120, startVelocity: 45 })
}

/** Two cannons from the bottom corners for ~1.2s — the "big win" moment. */
export function fireSideCannons(durationMs = 1200) {
  if (motionLevel() === 'off') return
  const colors = themeColors(true)
  const end = Date.now() + durationMs
  const frame = () => {
    if (Date.now() > end || motionLevel() === 'off') return
    const common: Opts = { particleCount: scaleCount(3), spread: 55, startVelocity: 62, colors, zIndex: 120, disableForReducedMotion: honourOsReduce() }
    confetti({ ...common, angle: 60, origin: { x: 0, y: 0.75 } })
    confetti({ ...common, angle: 120, origin: { x: 1, y: 0.75 } })
    requestAnimationFrame(frame)
  }
  frame()
}

const HEART_PATH =
  'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z'
let heartShape: confetti.Shape | null = null
const STAR_PATH = 'M50 0 L61 35 L98 35 L68 57 L79 91 L50 70 L21 91 L32 57 L2 35 L39 35 Z'
let starShape: confetti.Shape | null = null

/** Floating hearts in theme colours — used for matches & super likes. */
export function fireHearts(opts: FireOptions = {}) {
  if (motionLevel() === 'off') return
  heartShape ??= confetti.shapeFromPath({ path: HEART_PATH })
  const { from, ...rest } = opts
  const origin = originFrom(from) ?? rest.origin ?? { x: 0.5, y: 0.55 }
  const colors = rest.colors ?? [...themeColors().slice(0, 3), '#ff3b6b', '#ff8fab']
  const defaults: Opts = {
    shapes: [heartShape],
    colors,
    origin,
    spread: 360,
    ticks: 90,
    gravity: 0.35,
    decay: 0.94,
    startVelocity: 22,
    zIndex: 120,
    disableForReducedMotion: honourOsReduce(),
    ...rest,
  }
  confetti({ ...defaults, particleCount: scaleCount(28), scalar: 2.4 })
  setTimeout(() => confetti({ ...defaults, particleCount: scaleCount(18), scalar: 1.6, startVelocity: 30 }), 140)
  setTimeout(() => confetti({ ...defaults, particleCount: scaleCount(12), scalar: 3, startVelocity: 14, ticks: 120 }), 300)
}

/** Twinkling star burst — for approvals and 5-star reviews. */
export function fireStars(opts: FireOptions = {}) {
  if (motionLevel() === 'off') return
  starShape ??= confetti.shapeFromPath({ path: STAR_PATH })
  const { from, ...rest } = opts
  const origin = originFrom(from) ?? rest.origin ?? { x: 0.5, y: 0.5 }
  const defaults: Opts = {
    shapes: [starShape],
    colors: rest.colors ?? [...themeColors().slice(0, 2), '#ffd23f', '#ffffff'],
    origin,
    spread: 360,
    ticks: 70,
    gravity: 0,
    decay: 0.94,
    startVelocity: 26,
    zIndex: 120,
    disableForReducedMotion: honourOsReduce(),
    ...rest,
  }
  confetti({ ...defaults, particleCount: scaleCount(30), scalar: 1.4 })
  setTimeout(() => confetti({ ...defaults, particleCount: scaleCount(14), scalar: 0.8, startVelocity: 18 }), 120)
}

/** Burst of an emoji (🎉, 💸, 🔥 …) — e.g. for payments or "shipped!" moments. */
export function fireEmoji(emoji: string, opts: FireOptions = {}) {
  if (motionLevel() === 'off') return
  const shape = confetti.shapeFromText({ text: emoji, scalar: 2.2 })
  const { from, ...rest } = opts
  const origin = originFrom(from) ?? rest.origin ?? { x: 0.5, y: 0.6 }
  confetti({
    shapes: [shape],
    scalar: 2.2,
    particleCount: scaleCount(26),
    spread: 80,
    startVelocity: 38,
    gravity: 0.9,
    ticks: 110,
    flat: true,
    origin,
    zIndex: 120,
    disableForReducedMotion: honourOsReduce(),
    ...rest,
  })
}

/** Fireworks over the whole screen for `durationMs` (random bursts). */
export function fireFireworks(durationMs = 2500) {
  if (motionLevel() === 'off') return
  const colors = themeColors(true)
  const end = Date.now() + durationMs
  const rnd = (a: number, b: number) => Math.random() * (b - a) + a
  const id = window.setInterval(() => {
    const left = end - Date.now()
    if (left <= 0 || motionLevel() === 'off') return window.clearInterval(id)
    const count = scaleCount(50 * (left / durationMs))
    const common: Opts = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 120, colors, disableForReducedMotion: honourOsReduce(), particleCount: count }
    confetti({ ...common, origin: { x: rnd(0.1, 0.3), y: Math.random() - 0.2 } })
    confetti({ ...common, origin: { x: rnd(0.7, 0.9), y: Math.random() - 0.2 } })
  }, 250)
}

/** Stop and clear every running effect. */
export function resetConfetti() {
  confetti.reset()
}

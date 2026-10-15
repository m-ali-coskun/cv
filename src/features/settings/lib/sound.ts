/**
 * Tiny Web Audio "glass" chimes — no audio files needed. Browsers only allow
 * sound after a user gesture; failures are silent.
 */
let ctx: AudioContext | null = null

type Chime = 'notify' | 'message' | 'success'

const NOTES: Record<Chime, number[]> = {
  notify: [1318.5, 1760], // E6 → A6
  message: [987.8, 1318.5], // B5 → E6
  success: [1046.5, 1318.5, 1568], // C6 → E6 → G6
}

export function playChime(kind: Chime = 'notify', volume = 0.14) {
  try {
    if (typeof window === 'undefined') return
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime + 0.01
    NOTES[kind].forEach((freq, i) => {
      const c = ctx!
      const start = t0 + i * 0.085
      const osc = c.createOscillator()
      const overtone = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'sine'
      overtone.type = 'triangle'
      osc.frequency.setValueAtTime(freq, start)
      overtone.frequency.setValueAtTime(freq * 2, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55)
      const og = c.createGain()
      og.gain.value = 0.18
      osc.connect(gain)
      overtone.connect(og).connect(gain)
      gain.connect(c.destination)
      osc.start(start)
      overtone.start(start)
      osc.stop(start + 0.6)
      overtone.stop(start + 0.6)
    })
  } catch {
    /* audio unavailable */
  }
}

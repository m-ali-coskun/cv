import type { CSSProperties } from 'react'
import { disciplineTheme } from '@/theme/disciplines'
import type { DisciplineId } from '@/store/types'

/**
 * The brief takes on the colours of its discipline: the accent tokens (and the
 * tones derived from them, which are resolved on :root) are re-declared on the
 * wizard root so every descendant — kit components included — re-themes.
 * The tokens are registered with @property, so the switch cross-fades.
 */
export function scopedThemeStyle(id: DisciplineId | null, dark: boolean): CSSProperties | undefined {
  if (!id) return undefined
  const t = disciplineTheme(id)
  const vars: Record<string, string> = {
    '--accent': t.accent,
    '--accent-ink': t.ink,
    '--accent-deep': t.deep,
    '--glow-1': t.glow,
    '--glow-2': t.glow2,
    '--accent-soft': `color-mix(in oklab, ${t.accent} 18%, transparent)`,
    '--accent-softer': `color-mix(in oklab, ${t.accent} 9%, transparent)`,
    '--accent-line': `color-mix(in oklab, ${t.accent} 45%, transparent)`,
    '--accent-strong': `color-mix(in oklab, ${t.accent} 82%, var(--ink))`,
    '--accent-text': dark ? `color-mix(in oklab, ${t.accent} 88%, #fff)` : `color-mix(in oklab, ${t.accent} 62%, #000)`,
  }
  if (dark) {
    vars['--night'] = `color-mix(in oklab, ${t.deep} 55%, #000)`
    vars['--night-2'] = `color-mix(in oklab, ${t.deep} 40%, #111)`
  }
  return {
    ...(vars as CSSProperties),
    transition: '--accent 700ms var(--ease-out), --accent-ink 700ms var(--ease-out), --accent-deep 700ms var(--ease-out)',
  }
}

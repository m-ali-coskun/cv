import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { useApp } from '@/store'
import { disciplineTheme } from './disciplines'

function subscribeDark(cb: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

/** Resolved light/dark (follows the OS when theme = 'system'). */
export function useIsDark() {
  const theme = useApp((s) => s.settings.theme)
  const sys = useSyncExternalStore(subscribeDark, systemDark, () => false)
  return theme === 'dark' || (theme === 'system' && sys)
}

/** The discipline palette currently painting the UI. */
export function useActiveTheme() {
  const discipline = useApp((s) => s.settings.discipline)
  const accentMode = useApp((s) => s.settings.accentMode)
  const fixed = useApp((s) => s.settings.fixedAccent)
  return disciplineTheme(accentMode === 'fixed' ? fixed : discipline)
}

/**
 * Writes theme tokens onto <html>. Because the accent tokens are registered
 * with @property (see index.css), changing them cross-fades the entire UI.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const dark = useIsDark()
  const theme = useActiveTheme()
  const glass = useApp((s) => s.settings.glass)
  const motion = useApp((s) => s.settings.motion)
  const lang = useApp((s) => s.settings.lang)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = dark ? 'dark' : 'light'
    root.dataset.glass = glass
    root.dataset.motion = motion
    root.dataset.discipline = theme.id
    root.lang = lang
    root.style.setProperty('--accent', theme.accent)
    root.style.setProperty('--accent-ink', theme.ink)
    root.style.setProperty('--accent-deep', theme.deep)
    root.style.setProperty('--glow-1', theme.glow)
    root.style.setProperty('--glow-2', theme.glow2)
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', dark ? '#08080a' : '#e7e7e9')
  }, [dark, theme, glass, motion, lang])

  const reducedMotion = useMemo(() => (motion === 'off' ? 'always' : motion === 'subtle' ? 'user' : 'never'), [motion])

  return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
}

import { useEffect } from 'react'
import { useApp } from '@/store'
import { useToasts } from '@/store/toasts'
import { KIND_GROUP } from './notifMeta'
import { usePrefs } from './prefs'
import { playChime } from './sound'

const STYLE_ID = 'designtab-pref-styles'

/**
 * Density + specular overrides. Tailwind v4 spacing utilities are all
 * `calc(var(--spacing) * n)`, so shrinking --spacing tightens every padding,
 * gap and control size in one go.
 */
const CSS = `
:root[data-density='compact'] {
  --spacing: 0.22rem;
  --radius-xl: 24px;
  --radius-lg: 19px;
  --radius-md: 14px;
}
:root[data-refraction='off'] .glass::before { opacity: 0 !important; }
`

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = CSS
  document.head.appendChild(el)
}

const keyOf = (title: string, body?: string) => `${title}\u0000${body ?? ''}`

/**
 * Applies the preferences that have no home in the shell:
 *  - compact density & specular highlights (data attributes on <html>)
 *  - notification sound, per-category mute and Do-not-disturb: toasts that
 *    belong to a muted category are dismissed before they ever paint.
 * Rendered once (by the notifications panel, which is always mounted).
 */
export function PreferenceEffects() {
  const compact = useApp((s) => s.settings.compact)
  const refraction = useApp((s) => s.settings.refraction)

  useEffect(() => {
    ensureStyles()
    document.documentElement.dataset.density = compact ? 'compact' : 'comfortable'
  }, [compact])

  useEffect(() => {
    ensureStyles()
    document.documentElement.dataset.refraction = refraction ? 'on' : 'off'
  }, [refraction])

  useEffect(() => {
    /** Toast keys that came from a notification → whether they should be silenced. */
    const pending = new Map<string, boolean>()

    const unsubApp = useApp.subscribe((s, prev) => {
      if (s.notifications === prev.notifications) return
      const before = new Set(prev.notifications.map((n) => n.id))
      const fresh = s.notifications.filter((n) => !before.has(n.id))
      // bulk replacements (reset / import / undo) are not "incoming"
      if (!fresh.length || fresh.length > 3) return
      const prefs = usePrefs.getState()
      for (const n of fresh) {
        if (n.role !== s.settings.role) continue
        const silenced = prefs.dnd || !!prefs.muted[KIND_GROUP[n.kind]]
        pending.set(keyOf(n.title, n.body), silenced)
      }
    })

    const unsubToasts = useToasts.subscribe((s, prev) => {
      const added = s.toasts.filter((t) => !prev.toasts.includes(t))
      if (!added.length) return
      const prefs = usePrefs.getState()
      const settings = useApp.getState().settings
      for (const t of added) {
        const key = keyOf(t.title, t.description)
        let fromFeed = false
        let silenced = false
        if (pending.has(key)) {
          fromFeed = true
          silenced = pending.get(key)!
          pending.delete(key)
        } else if (t.tone === 'message') {
          // chat toasts are pushed by the simulation directly
          fromFeed = true
          silenced = prefs.dnd || !!prefs.muted.messages || !settings.notificationsPush
        }
        if (!fromFeed) continue
        if (silenced) {
          useToasts.getState().dismiss(t.id)
        } else if (settings.sound) {
          playChime(t.tone === 'message' ? 'message' : 'notify')
        }
      }
    })

    return () => {
      unsubApp()
      unsubToasts()
    }
  }, [])

  return null
}

import { useCallback } from 'react'
import { useApp } from '@/store'
import type { Lang } from '@/store/types'
import type { Dict, Namespace } from './types'
import core from './locales/core'
import overview from './locales/overview'
import discover from './locales/discover'
import network from './locales/network'
import jobs from './locales/jobs'
import job from './locales/job'
import brief from './locales/brief'
import messages from './locales/messages'
import profile from './locales/profile'
import calendar from './locales/calendar'
import files from './locales/files'
import payments from './locales/payments'
import analytics from './locales/analytics'
import settings from './locales/settings'
import onboarding from './locales/onboarding'

/**
 * Tiny typed-enough i18n. The UI chrome (navigation, headings, buttons, labels,
 * statuses) is translated; user-generated content (messages, briefs, bios)
 * always stays in its original language (English).
 */
const NAMESPACES: Record<string, Namespace> = {
  core,
  overview,
  discover,
  network,
  jobs,
  job,
  brief,
  messages,
  profile,
  calendar,
  files,
  payments,
  analytics,
  settings,
  onboarding,
}

export const LANGUAGES: { id: Lang; label: string; native: string; flag: string }[] = [
  { id: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { id: 'de', label: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { id: 'tr', label: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
]

export type TVars = Record<string, string | number>
export type TFn = (key: string, vars?: TVars) => string

const warned = new Set<string>()

function lookup(lang: Lang, nsName: string, key: string): string | undefined {
  const ns = NAMESPACES[nsName]
  if (!ns) return undefined
  const dict: Dict = ns[lang] ?? {}
  return dict[key] ?? ns.en[key]
}

export function translate(lang: Lang, fullKey: string, vars?: TVars): string {
  const dot = fullKey.indexOf('.')
  const nsName = dot === -1 ? 'core' : fullKey.slice(0, dot)
  const key = dot === -1 ? fullKey : fullKey.slice(dot + 1)

  let str: string | undefined
  if (vars && typeof vars.count === 'number') {
    const form = vars.count === 1 ? 'one' : 'other'
    // Prefer the active language (plural form, then its base key — e.g. Turkish
    // has no singular/plural split) before falling back to English plurals.
    const own = NAMESPACES[nsName]?.[lang]
    str = own?.[`${key}_${form}`] ?? own?.[key] ?? lookup(lang, nsName, `${key}_${form}`)
  }
  str ??= lookup(lang, nsName, key)

  if (str === undefined) {
    if (import.meta.env.DEV && !warned.has(fullKey)) {
      warned.add(fullKey)
      console.warn(`[i18n] missing key: ${fullKey}`)
    }
    // Last resort: humanise the key's last segment so the UI never shows dots.
    str = key.split('.').pop()!.replace(/[_-]/g, ' ')
    str = str.charAt(0).toUpperCase() + str.slice(1)
  }
  if (vars) {
    str = str.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`))
  }
  return str
}

/** const t = useT(); t('core.nav.overview') */
export function useT(): TFn {
  const lang = useApp((s) => s.settings.lang)
  return useCallback((key: string, vars?: TVars) => translate(lang, key, vars), [lang])
}

export function useLang(): Lang {
  return useApp((s) => s.settings.lang)
}

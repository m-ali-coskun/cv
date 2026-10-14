import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { ME_CLIENT_ID, type Client, type Designer } from '@/store/types'
import { TABS, type PersonLite, type TabId } from './context'
import { durationLabel } from './model'

/** Re-renders every `ms` while enabled (live clocks). */
export function useNow(ms = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms, enabled])
  return now
}

/** Active tab, remembered in `?tab=` so reloads and shared links keep it. */
export function useTabParam(): [TabId, (t: TabId) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab = (TABS as readonly string[]).includes(raw ?? '') ? (raw as TabId) : 'overview'
  const setTab = useCallback(
    (t: TabId) =>
      setParams(
        (p) => {
          const next = new URLSearchParams(p)
          if (t === 'overview') next.delete('tab')
          else next.set('tab', t)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )
  return [tab, setTab]
}

/** Copy text + confirmation toast. */
export function useCopy() {
  const t = useT()
  return useCallback(
    async (text: string, title?: string) => {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        // clipboard may be blocked (insecure context) — fall back to a hidden textarea
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        try {
          document.execCommand('copy')
        } catch {
          /* ignore */
        }
        ta.remove()
      }
      toast({ title: title ?? t('core.action.copied'), description: text.length > 80 ? text.slice(0, 78) + '…' : text, tone: 'success', duration: 2200 })
    },
    [t],
  )
}

export function toPersonLite(p: Designer | Client): PersonLite {
  if ('primary' in p) return { id: p.id, kind: 'designer', name: p.name, sub: p.headline, avatarSeed: p.avatarSeed, media: p.avatar }
  return { id: p.id, kind: 'client', name: p.name, sub: `${p.contactName} · ${p.industry}`, avatarSeed: p.avatarSeed, color: p.logoColor }
}

/** Lookup for every person on the platform (timeline actors, annotation authors…). */
export function usePeopleIndex() {
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  return useMemo(() => {
    const map = new Map<string, PersonLite>()
    for (const d of designers) map.set(d.id, toPersonLite(d))
    for (const c of clients) map.set(c.id, toPersonLite(c))
    // Ali as a client is "Northlight Studio" — make sure the lite view exists even if seeds change
    if (!map.has(ME_CLIENT_ID)) map.set(ME_CLIENT_ID, { id: ME_CLIENT_ID, kind: 'client', name: 'Northlight Studio', sub: 'Ali', avatarSeed: 'ali', color: '#0B0B0C' })
    return map
  }, [designers, clients])
}

/** Debounced commit for sliders: local value updates instantly, store after a pause. */
export function useDebouncedCommit<T>(value: T, commit: (v: T) => void, ms = 260): [T, (v: T) => void] {
  const [local, setLocal] = useState(value)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => setLocal(value), [value])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const set = useCallback(
    (v: T) => {
      setLocal(v)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => commit(v), ms)
    },
    [commit, ms],
  )
  return [local, set]
}

/** Remember the previous value of something (to animate changes). */
export function usePrevious<T>(value: T) {
  const ref = useRef<T>(value)
  const prev = ref.current
  useEffect(() => {
    ref.current = value
  }, [value])
  return prev
}

/** Localised compact duration formatter ("2d 4h", "2T 4Std", "2g 4sa"). */
export function useDuration() {
  const t = useT()
  return useCallback((minutes: number) => durationLabel(minutes, { d: t('job.unit.d'), h: t('job.unit.h'), m: t('job.unit.m') }), [t])
}

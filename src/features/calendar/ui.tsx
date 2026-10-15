import { useCallback, useEffect, useState } from 'react'
import { useApp } from '@/store'
import { fmt } from '@/lib/dates'
import { cn } from '@/lib/cn'
import type { Lang, MediaRef } from '@/store/types'
import { Avatar } from '@/components/ui/Avatar'
import { KIND_COLOR, KIND_ICON, type CalItem, type EventKind } from './model'

export interface PersonInfo {
  id: string
  name: string
  sub: string
  avatarSeed: string
  avatar?: MediaRef
  brand?: { color: string }
}

/** id → display info for designers and clients. */
export function usePersonLookup() {
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  return useCallback(
    (id: string | undefined): PersonInfo | undefined => {
      if (!id) return undefined
      const d = designers.find((x) => x.id === id)
      if (d) return { id, name: d.name, sub: d.headline, avatarSeed: d.avatarSeed, avatar: d.avatar }
      const c = clients.find((x) => x.id === id)
      if (c) return { id, name: c.name, sub: c.contactName, avatarSeed: c.avatarSeed, brand: { color: c.logoColor } }
      return undefined
    },
    [designers, clients],
  )
}

export function PersonAvatar({ person, size = 24, className }: { person: PersonInfo; size?: number; className?: string }) {
  return person.brand ? (
    <Avatar kind="brand" name={person.name} color={person.brand.color} seed={person.avatarSeed} size={size} className={className} />
  ) : (
    <Avatar seed={person.avatarSeed} media={person.avatar} size={size} className={className} />
  )
}

export function KindDot({ kind, className, size = 8 }: { kind: EventKind; className?: string; size?: number }) {
  return <span className={cn('inline-block shrink-0 rounded-full', className)} style={{ width: size, height: size, background: KIND_COLOR[kind] }} />
}

export function KindIcon({ kind, className }: { kind: EventKind; className?: string }) {
  const Icon = KIND_ICON[kind]
  return <Icon className={className} />
}

export const hhmm = (d: Date, lang: Lang) => fmt(d, 'HH:mm', lang)
export const timeRange = (it: CalItem, lang: Lang) =>
  it.kind === 'deadline' || it.kind === 'milestone' ? hhmm(it.start, lang) : `${hhmm(it.start, lang)} – ${hhmm(it.end, lang)}`

/** Re-renders every `ms` with the current time (for the "now" line & countdowns). */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

/** True below the `sm` breakpoint (640px). */
export function useIsMobile(query = '(max-width: 639px)') {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setM(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return m
}

/** Background/border styles for an event surface by kind. */
export function kindSurface(kind: EventKind, auto = false) {
  const c = KIND_COLOR[kind]
  return {
    background: kind === 'deadline' ? 'color-mix(in oklab, var(--danger) 13%, var(--surface))' : `color-mix(in oklab, ${c} 16%, var(--surface))`,
    color: kind === 'deadline' ? 'color-mix(in oklab, var(--danger) 70%, var(--ink))' : 'var(--ink)',
    boxShadow: `inset 3px 0 0 ${c}${auto ? ', inset 0 0 0 1px color-mix(in oklab, ' + c + ' 35%, transparent)' : ''}`,
  } as const
}

/** "in 2h 15m" / "in 12m" / "now" countdown text pieces. */
export function countdown(target: Date, now: Date): { h: number; m: number; d: number; past: boolean } {
  const diff = Math.round((target.getTime() - now.getTime()) / 60_000)
  const past = diff < 0
  const abs = Math.abs(diff)
  return { d: Math.floor(abs / 1440), h: Math.floor((abs % 1440) / 60), m: abs % 60, past }
}

import { useEffect, useMemo, useState } from 'react'
import { useApp, meIdFor } from '@/store'
import { useRole } from '@/store/selectors'
import type { CalendarEvent, Client, Designer, Job, MediaRef, TimelineEvent } from '@/store/types'
import { ME_CLIENT_ID, ME_DESIGNER_ID } from '@/store/types'
import { ts } from './data'

/** Re-render every `ms` (clock for timers / "x minutes ago" stamps). */
export function useNow(ms = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms, enabled])
  return now
}

export interface PersonLite {
  id: string
  name: string
  sub: string
  avatarSeed: string
  media?: MediaRef
  kind: 'designer' | 'client'
  color?: string
  location?: string
  designer?: Designer
  client?: Client
}

/** id → lightweight person card for designers, clients and both of Ali's identities. */
export function usePeople() {
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  return useMemo(() => {
    const map = new Map<string, PersonLite>()
    for (const d of designers)
      map.set(d.id, { id: d.id, name: d.name, sub: d.headline, avatarSeed: d.avatarSeed, media: d.avatar, kind: 'designer', location: d.location, designer: d })
    for (const c of clients)
      map.set(c.id, { id: c.id, name: c.name, sub: c.contactName, avatarSeed: c.avatarSeed, kind: 'client', color: c.logoColor, location: c.location, client: c })
    if (!map.has(ME_CLIENT_ID)) map.set(ME_CLIENT_ID, { id: ME_CLIENT_ID, name: 'Ali', sub: 'Northlight Studio', avatarSeed: 'ali', kind: 'client' })
    if (!map.has(ME_DESIGNER_ID)) map.set(ME_DESIGNER_ID, { id: ME_DESIGNER_ID, name: 'Ali', sub: 'Designer', avatarSeed: 'ali', kind: 'designer' })
    return map
  }, [designers, clients])
}

export interface ActivityItem {
  event: TimelineEvent
  job: Job
}

/** Latest timeline events across a set of jobs, newest first. */
export function useActivity(jobs: Job[], limit = 40) {
  return useMemo(() => {
    const all: ActivityItem[] = []
    for (const job of jobs) for (const event of job.timeline) all.push({ event, job })
    return all.sort((a, b) => ts(b.event.at) - ts(a.event.at)).slice(0, limit)
  }, [jobs, limit])
}

/** Calendar events of the active role (stable reference). */
export function useMyEvents(): CalendarEvent[] {
  const role = useRole()
  const events = useApp((s) => s.events)
  return useMemo(() => events.filter((e) => e.role === role), [events, role])
}

export function useMeId() {
  const role = useRole()
  return meIdFor(role)
}

/** Scroll the page to `#attention` when the URL asks for it. */
export function useHashScroll(hash: string) {
  useEffect(() => {
    if (!hash) return
    const id = hash.replace('#', '')
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 450)
    return () => window.clearTimeout(t)
  }, [hash])
}

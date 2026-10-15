import { useMemo } from 'react'
import { addDays, addMinutes, differenceInCalendarDays, format, isSameDay, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { CalendarClock, Eye, Flag, Milestone as MilestoneIcon, Phone, Target, type LucideIcon } from 'lucide-react'
import { meIdFor, useApp } from '@/store'
import { counterpartId, useDiscipline, useRole } from '@/store/selectors'
import type { CalendarEvent, DisciplineId, Job, Role } from '@/store/types'

/**
 * Calendar domain helpers.
 *
 * The calendar merges three sources into one list of `CalItem`s:
 *   1. store events for the active role (editable, draggable)
 *   2. automatic deadline items from my jobs' `dueAt`
 *   3. automatic milestone items from my jobs' unreleased milestones
 * Store events that link to a job are hidden when the active discipline tab
 * does not match that job.
 */

export type EventKind = CalendarEvent['kind']
export const KINDS: EventKind[] = ['call', 'review', 'deadline', 'focus', 'milestone']

export const KIND_COLOR: Record<EventKind, string> = {
  call: 'var(--info)',
  review: 'var(--warning)',
  deadline: 'var(--danger)',
  focus: 'var(--accent)',
  milestone: 'var(--success)',
}

export const KIND_ICON: Record<EventKind, LucideIcon> = {
  call: Phone,
  review: Eye,
  deadline: Flag,
  focus: Target,
  milestone: MilestoneIcon,
}
export const AutoIcon = CalendarClock

export type CalView = 'month' | 'week' | 'agenda'

export interface CalItem {
  /** Store id, or `auto:due:<job>` / `auto:ms:<job>:<milestone>` for derived items. */
  id: string
  source: 'event' | 'due' | 'milestone'
  kind: EventKind
  title: string
  start: Date
  end: Date
  durationMin: number
  jobId?: string
  job?: Job
  withId?: string
  /** The underlying store record for editable items. */
  event?: CalendarEvent
  editable: boolean
  discipline?: DisciplineId
  milestone?: Job['milestones'][number]
}

const CLOSED = ['approved', 'declined', 'cancelled']
const dayKeyOf = (d: Date) => format(d, 'yyyy-MM-dd')
export const dayKey = dayKeyOf

/** Every calendar item for the active role & discipline tab, sorted by start. */
export function useCalendarItems(): CalItem[] {
  const role = useRole()
  const discipline = useDiscipline()
  const events = useApp((s) => s.events)
  const jobs = useApp((s) => s.jobs)
  return useMemo(() => buildItems(events, jobs, role, discipline), [events, jobs, role, discipline])
}

export function buildItems(events: CalendarEvent[], jobs: Job[], role: Role, discipline: DisciplineId | 'all'): CalItem[] {
  const me = meIdFor(role)
  const mine = jobs.filter((j) => (role === 'client' ? j.clientId === me : j.designerId === me))
  const byId = new Map(jobs.map((j) => [j.id, j]))
  const inTab = (j: Job | undefined) => !j || discipline === 'all' || j.discipline === discipline
  const out: CalItem[] = []

  for (const e of events) {
    if (e.role !== role) continue
    const job = e.jobId ? byId.get(e.jobId) : undefined
    if (!inTab(job)) continue
    const start = new Date(e.at)
    if (Number.isNaN(start.getTime())) continue
    out.push({
      id: e.id,
      source: 'event',
      kind: e.kind,
      title: e.title,
      start,
      end: addMinutes(start, e.durationMin),
      durationMin: e.durationMin,
      jobId: e.jobId,
      job,
      withId: e.withId ?? (job ? counterpartId(job, role) : undefined),
      event: e,
      editable: true,
      discipline: job?.discipline,
    })
  }

  const has = (kind: EventKind, jobId: string, d: Date) =>
    out.some((x) => x.source === 'event' && x.kind === kind && x.jobId === jobId && isSameDay(x.start, d))

  for (const job of mine) {
    if (discipline !== 'all' && job.discipline !== discipline) continue
    if (job.status === 'declined' || job.status === 'cancelled') continue
    const who = counterpartId(job, role)
    if (!CLOSED.includes(job.status)) {
      const due = new Date(job.dueAt)
      if (!Number.isNaN(due.getTime()) && !has('deadline', job.id, due)) {
        out.push({
          id: `auto:due:${job.id}`,
          source: 'due',
          kind: 'deadline',
          title: job.title,
          start: due,
          end: addMinutes(due, 30),
          durationMin: 30,
          jobId: job.id,
          job,
          withId: who,
          editable: false,
          discipline: job.discipline,
        })
      }
    }
    for (const m of job.milestones) {
      if (m.status === 'released') continue
      const at = new Date(m.dueAt)
      if (Number.isNaN(at.getTime()) || has('milestone', job.id, at)) continue
      out.push({
        id: `auto:ms:${job.id}:${m.id}`,
        source: 'milestone',
        kind: 'milestone',
        title: m.label,
        start: at,
        end: addMinutes(at, 30),
        durationMin: 30,
        jobId: job.id,
        job,
        withId: who,
        editable: false,
        discipline: job.discipline,
        milestone: m,
      })
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime())
}

/** Group items by local day key. Multi-day items appear on their start day only. */
export function groupByDay(items: CalItem[]): Map<string, CalItem[]> {
  const m = new Map<string, CalItem[]>()
  for (const it of items) {
    const k = dayKeyOf(it.start)
    const arr = m.get(k)
    if (arr) arr.push(it)
    else m.set(k, [it])
  }
  return m
}

/** 6×7 grid of days for the month containing `cursor`. */
export function monthGrid(cursor: Date, weekStartsOn: 0 | 1): Date[] {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn })
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function weekDays(cursor: Date, weekStartsOn: 0 | 1): Date[] {
  const start = startOfWeek(cursor, { weekStartsOn })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/**
 * Side-by-side layout for overlapping blocks within one day column.
 * Returns column index + column count per item id.
 */
export function layoutColumns(items: CalItem[]): Map<string, { col: number; cols: number }> {
  const res = new Map<string, { col: number; cols: number }>()
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime() || b.durationMin - a.durationMin)
  let cluster: { item: CalItem; col: number }[] = []
  let clusterEnd = 0
  let colEnds: number[] = []
  const flush = () => {
    const cols = Math.max(1, colEnds.length)
    for (const c of cluster) res.set(c.item.id, { col: c.col, cols })
    cluster = []
    colEnds = []
  }
  for (const it of sorted) {
    const s = it.start.getTime()
    const e = Math.max(it.end.getTime(), s + 20 * 60_000) // tiny items still need room
    if (cluster.length && s >= clusterEnd) flush()
    let col = colEnds.findIndex((end) => end <= s)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(e)
    } else colEnds[col] = e
    cluster.push({ item: it, col })
    clusterEnd = Math.max(clusterEnd, e)
  }
  flush()
  return res
}

export function overlaps(items: CalItem[], start: Date, durationMin: number, ignoreId?: string): CalItem[] {
  const s = start.getTime()
  const e = s + durationMin * 60_000
  return items.filter((x) => x.id !== ignoreId && x.kind !== 'deadline' && x.kind !== 'milestone' && x.start.getTime() < e && x.end.getTime() > s)
}

/**
 * First free slot of `durationMin` on `day` between `fromH` and `toH`
 * (30-minute grid). Skips the past when `day` is today.
 */
export function findFreeSlot(items: CalItem[], day: Date, durationMin: number, fromH = 9, toH = 18, ignoreId?: string): Date | null {
  const base = startOfDay(day)
  const now = Date.now()
  for (let m = fromH * 60; m + durationMin <= toH * 60; m += 30) {
    const s = addMinutes(base, m)
    if (s.getTime() < now) continue
    if (!overlaps(items, s, durationMin, ignoreId).length) return s
  }
  return null
}

/** Minutes booked per day (calls, reviews, focus) — drives the workload heatmap. */
export function workloadByDay(items: CalItem[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const it of items) {
    if (it.kind === 'deadline' || it.kind === 'milestone') continue
    const k = dayKeyOf(it.start)
    out[k] = (out[k] ?? 0) + it.durationMin
  }
  return out
}

/** Dots for the mini month: up to 3 kind colours per day. */
export function markersFor(items: CalItem[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const it of items) {
    const k = dayKeyOf(it.start)
    const arr = (out[k] ??= [])
    const c = KIND_COLOR[it.kind]
    if (!arr.includes(c) && arr.length < 3) arr.push(c)
  }
  return out
}

export const relDays = (d: Date) => differenceInCalendarDays(d, new Date())

// ─────────────────────────── ICS export ───────────────────────────

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

export function buildIcs(items: CalItem[], describe: (it: CalItem) => string): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//designTab//Calendar//EN', 'CALSCALE:GREGORIAN']
  const stamp = icsDate(new Date())
  for (const it of items) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${it.id.replace(/[^a-z0-9-]/gi, '-')}@designtab.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(it.start)}`,
      `DTEND:${icsDate(it.end)}`,
      `SUMMARY:${icsText(it.title)}`,
      `DESCRIPTION:${icsText(describe(it))}`,
      `CATEGORIES:${it.kind.toUpperCase()}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadText(text: string, name: string, type = 'text/calendar') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// ─────────────────────────── per-viewer prefs ───────────────────────────

const PREF_KEY = 'designtab-calendar'

export interface CalPrefs {
  view: CalView
  hidden: EventKind[]
  showAuto: boolean
}

export function loadPrefs(): CalPrefs {
  const def: CalPrefs = { view: 'month', hidden: [], showAuto: true }
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (!raw) return def
    const p = JSON.parse(raw) as Partial<CalPrefs>
    return {
      view: p.view === 'week' || p.view === 'agenda' || p.view === 'month' ? p.view : 'month',
      hidden: Array.isArray(p.hidden) ? p.hidden.filter((k): k is EventKind => KINDS.includes(k as EventKind)) : [],
      showAuto: p.showAuto !== false,
    }
  } catch {
    return def
  }
}

export function savePrefs(p: CalPrefs) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p))
  } catch {
    /* storage unavailable */
  }
}

/** Week-grid constants. */
export const DAY_START_H = 7
export const DAY_END_H = 21
export const SNAP_MIN = 15

export const isAuto = (it: CalItem) => it.source !== 'event'

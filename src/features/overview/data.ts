/**
 * Pure, deterministic helpers for the overview dashboards.
 * Everything here is derived from store data (no side effects) so numbers
 * re-compute instantly when the range, role or discipline tab changes.
 */
import { addDays, startOfDay, startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns'
import { prng } from '@/lib/random'
import type { Designer, Invoice, Job, JobStatus, Priority } from '@/store/types'

export type PulseRange = 'today' | '7d' | '30d'

export const RANGE_DAYS: Record<PulseRange, number> = { today: 1, '7d': 7, '30d': 30 }

export const DAY = 864e5

/** Start of the look-back window for a range. */
export function rangeStart(range: PulseRange, now = Date.now()) {
  if (range === 'today') return startOfDay(now).getTime()
  return now - RANGE_DAYS[range] * DAY
}

export const CLOSED: JobStatus[] = ['approved', 'declined', 'cancelled']
export const OPEN_WORK: JobStatus[] = ['queued', 'in_progress', 'final_touches', 'in_review', 'revisions']
export const IN_PROGRESS: JobStatus[] = ['in_progress', 'final_touches', 'revisions']

export const isClosed = (j: Job) => CLOSED.includes(j.status)
export const ts = (d: string | undefined) => (d ? new Date(d).getTime() : 0)

const PRIORITY_WEIGHT: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 }
const STATUS_WEIGHT: Partial<Record<JobStatus, number>> = {
  in_review: 6,
  final_touches: 5,
  in_progress: 4,
  revisions: 4,
  queued: 2,
  requested: 1,
}

/** Jobs worth featuring in the hero carousel (client): most "alive" first. */
export function featuredJobs(jobs: Job[], n = 3) {
  return jobs
    .filter((j) => OPEN_WORK.includes(j.status))
    .sort((a, b) => (STATUS_WEIGHT[b.status] ?? 0) - (STATUS_WEIGHT[a.status] ?? 0) || ts(b.updatedAt) - ts(a.updatedAt))
    .slice(0, n)
}

/** Designer focus queue: what Ali should be working on right now. */
export function focusJobs(jobs: Job[], n = 3) {
  const order: JobStatus[] = ['revisions', 'in_progress', 'final_touches', 'queued']
  return jobs
    .filter((j) => order.includes(j.status))
    .sort(
      (a, b) =>
        Number(!!b.timerStartedAt) - Number(!!a.timerStartedAt) ||
        PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
        Number(a.status === 'queued') - Number(b.status === 'queued') ||
        ts(a.dueAt) - ts(b.dueAt),
    )
    .slice(0, n)
}

export function priorityWeight(p: Priority) {
  return PRIORITY_WEIGHT[p]
}

// ───────────────────────── brief completeness ─────────────────────────

export type BriefCheckId = 'description' | 'deliverables' | 'deadline' | 'palette' | 'fonts' | 'mood' | 'references' | 'assets'

export interface Check<T extends string> {
  id: T
  ok: boolean
  weight: number
}

export function briefChecks(job: Job): Check<BriefCheckId>[] {
  const sg = job.styleGuide
  return [
    { id: 'description', ok: (job.description?.trim().length ?? 0) >= 120, weight: 20 },
    { id: 'deliverables', ok: job.deliverables.length > 0, weight: 15 },
    { id: 'deadline', ok: !!job.dueAt && !Number.isNaN(ts(job.dueAt)), weight: 10 },
    { id: 'palette', ok: (sg?.palette?.length ?? 0) >= 2, weight: 15 },
    { id: 'fonts', ok: (sg?.fonts?.length ?? 0) >= 1, weight: 10 },
    { id: 'mood', ok: (sg?.mood?.length ?? 0) >= 1, weight: 5 },
    { id: 'references', ok: (sg?.references?.length ?? 0) >= 1, weight: 15 },
    { id: 'assets', ok: job.assets.length > 0, weight: 10 },
  ]
}

export function score<T extends string>(checks: Check<T>[]) {
  const total = checks.reduce((a, c) => a + c.weight, 0) || 1
  return Math.round((checks.reduce((a, c) => a + (c.ok ? c.weight : 0), 0) / total) * 100)
}

// ───────────────────────── profile strength ─────────────────────────

export type ProfileCheckId = 'avatar' | 'headline' | 'bio' | 'portfolio' | 'skills' | 'tools' | 'rate'

export function profileChecks(d: Designer | undefined): Check<ProfileCheckId>[] {
  return [
    { id: 'avatar', ok: !!d?.avatar, weight: 1 },
    { id: 'headline', ok: (d?.headline?.trim().length ?? 0) >= 10, weight: 1 },
    { id: 'bio', ok: (d?.bio?.trim().length ?? 0) >= 120, weight: 1 },
    { id: 'portfolio', ok: (d?.portfolio?.length ?? 0) >= 3, weight: 1 },
    { id: 'skills', ok: (d?.skills?.length ?? 0) >= 4, weight: 1 },
    { id: 'tools', ok: (d?.tools?.length ?? 0) >= 3, weight: 1 },
    { id: 'rate', ok: (d?.hourlyRate ?? 0) > 0, weight: 1 },
  ]
}

// ───────────────────────── time buckets ─────────────────────────

/** Bucket timestamps into a small series for sparklines (oldest → newest). */
export function bucketCounts(range: PulseRange, stamps: number[], now = Date.now()) {
  const n = range === 'today' ? 12 : range === '7d' ? 7 : 15
  const start = range === 'today' ? now - DAY : now - RANGE_DAYS[range] * DAY
  const size = (now - start) / n
  const out = new Array<number>(n).fill(0)
  for (const s of stamps) {
    if (s < start || s > now) continue
    out[Math.min(n - 1, Math.floor((s - start) / size))]++
  }
  // a whisper of baseline keeps the sparkline from looking dead
  return out.map((v, i) => v + 0.15 + (i % 3) * 0.05)
}

export interface Bucket {
  start: number
  end: number
  date: Date
}

export function weekBuckets(n: number, weekStartsOn: 0 | 1 = 1, now = new Date()): Bucket[] {
  const cur = startOfWeek(now, { weekStartsOn })
  return Array.from({ length: n }, (_, i) => {
    const s = subWeeks(cur, n - 1 - i)
    return { start: s.getTime(), end: addDays(s, 7).getTime(), date: s }
  })
}

export function monthBuckets(n: number, now = new Date()): Bucket[] {
  const cur = startOfMonth(now)
  return Array.from({ length: n }, (_, i) => {
    const s = subMonths(cur, n - 1 - i)
    const e = subMonths(cur, n - 2 - i)
    return { start: s.getTime(), end: e.getTime(), date: s }
  })
}

/**
 * Deterministic "history" for weeks/months before the seed data begins, so
 * money charts look like a real studio's books. Stable for a given seed key.
 */
export function history(seedKey: string, count: number, base: number, spread = 0.55) {
  const r = prng(seedKey)
  let v = base
  return Array.from({ length: count }, () => {
    v = Math.max(base * 0.25, v * (1 + r.range(-spread, spread) * 0.5) + r.range(-base * 0.15, base * 0.2))
    return Math.round(v / 10) * 10
  })
}

/** Paid invoices + released milestones that count as money moved in a window. */
export function moneyIn(invoices: Invoice[], from: number, to: number) {
  return invoices.filter((i) => i.status === 'paid' && ts(i.paidAt) >= from && ts(i.paidAt) < to).reduce((a, i) => a + i.amount, 0)
}

// ───────────────────────── formatting ─────────────────────────

export function hms(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':')
}

/** Seconds logged on a job including a running timer. */
export function trackedSeconds(job: Pick<Job, 'timeTrackedMin' | 'timerStartedAt'>, now = Date.now()) {
  const running = job.timerStartedAt ? Math.max(0, now - ts(job.timerStartedAt)) / 1000 : 0
  return job.timeTrackedMin * 60 + running
}

export function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}

export function sameDay(a: number, b: number) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

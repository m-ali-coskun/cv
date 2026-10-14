/**
 * Pure, deterministic helpers for the overview dashboards.
 * Everything here is derived from store data (no side effects) so numbers
 * re-compute instantly when the range, role or discipline tab changes.
 */
import { addDays, differenceInCalendarDays, startOfDay, startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns'
import { prng } from '@/lib/random'
import { jobRisk, type RiskLevel } from '@/store/selectors'
import type { Designer, Job, JobStatus, Priority, Role } from '@/store/types'

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


// ───────────────────────── risk reasons (localised) ─────────────────────────

export interface RiskView {
  level: RiskLevel
  score: number
  /** i18n key under `overview.reason.*` (or null when the reason is a blocker, which is user content). */
  key: string | null
  vars?: Record<string, string | number>
  /** User-authored blocker text (English content, never translated). */
  blocker?: string
  waitingOnMe: boolean
}

/**
 * Mirrors `jobRisk` (same score / level) but returns a translatable reason so
 * the dashboard reads naturally in every UI language.
 */
export function riskView(job: Job, role: Role, now = Date.now()): RiskView {
  const r = jobRisk(job)
  const waitingOnMe =
    role === 'client'
      ? job.status === 'in_review' || job.counterOffer?.status === 'pending'
      : job.status === 'requested' || job.status === 'revisions'
  let key: string | null = 'onTrack'
  let vars: RiskView['vars']
  let blocker: string | undefined
  if (CLOSED.includes(job.status)) return { level: 'low', score: 0, key: 'closed', waitingOnMe: false }
  const days = differenceInCalendarDays(new Date(job.dueAt), new Date(now))
  if (days < 0) {
    key = 'overdue'
    vars = { n: Math.abs(days) }
  } else if (days <= 1 && job.progress < 80) {
    key = days === 0 ? 'dueTodayAt' : 'dueTomorrowAt'
    vars = { p: job.progress }
  } else if (days <= 3 && job.progress < 50) {
    key = 'daysLeftAt'
    vars = { n: days, p: job.progress }
  }
  if (job.blocker) {
    key = null
    blocker = job.blocker
  }
  if (job.status === 'requested' && now - ts(job.createdAt) > 2 * DAY) {
    key = 'awaitingDesigner'
    blocker = undefined
  }
  if (job.status === 'in_review' && job.deliveredAt && now - ts(job.deliveredAt) > 2 * DAY) {
    key = 'reviewPending'
    blocker = undefined
  }
  if (job.revisions.length >= job.revisionLimit && job.status === 'revisions') {
    key = 'revisionLimit'
    blocker = undefined
  }
  if (role === 'designer' && key === 'awaitingDesigner') key = 'awaitingYou'
  if (role === 'designer' && key === 'reviewPending') key = 'clientReviewing'
  if (key === 'onTrack' && waitingOnMe) {
    if (role === 'client') key = job.counterOffer?.status === 'pending' ? 'counterOffer' : 'yourReview'
    else key = job.status === 'requested' ? 'newRequest' : 'revisionsAsked'
  }
  return { level: r.level, score: r.score, key, vars, blocker, waitingOnMe }
}

export const RISK_RANK: Record<RiskLevel, number> = { high: 3, medium: 2, low: 1 }

// ───────────────────────── pulse KPIs ─────────────────────────

const HORIZON: Record<PulseRange, number> = { today: 1, '7d': 7, '30d': 30 }

export interface ClientPulse {
  active: number
  newIn: number
  designers: number
  review: number
  awaiting: number
  queueDays: number
  progress: number
  avgProgress: number
  atRisk: number
  high: number
  spark: { active: number[]; review: number[]; progress: number[]; risk: number[] }
}

export function clientPulse(jobs: Job[], range: PulseRange, now = Date.now()): ClientPulse {
  const from = rangeStart(range, now)
  const live = jobs.filter((j) => !CLOSED.includes(j.status))
  const approvedIn = jobs.filter((j) => j.status === 'approved' && ts(j.approvedAt) >= from)
  const deliveredIn = jobs.filter((j) => !['declined', 'cancelled'].includes(j.status) && j.timeline.some((e) => e.kind === 'delivery' && ts(e.at) >= from))
  const inReview = live.filter((j) => j.status === 'in_review')
  const progressNow = live.filter((j) => IN_PROGRESS.includes(j.status))
  const risky = live
    .map((j) => ({ j, r: jobRisk(j) }))
    .filter(({ j, r }) => r.level !== 'low' && (r.level === 'high' || differenceInCalendarDays(new Date(j.dueAt), new Date(now)) <= HORIZON[range]))
  const events = (kinds: string[]) => jobs.flatMap((j) => j.timeline.filter((e) => kinds.includes(e.kind)).map((e) => ts(e.at)))
  return {
    active: live.length + approvedIn.length,
    newIn: jobs.filter((j) => ts(j.createdAt) >= from && !['declined', 'cancelled'].includes(j.status)).length,
    designers: new Set(live.map((j) => j.designerId)).size,
    review: new Set([...inReview, ...deliveredIn].map((j) => j.id)).size,
    awaiting: inReview.length,
    queueDays: avg(inReview.map((j) => (now - ts(j.deliveredAt ?? j.updatedAt)) / DAY)),
    progress: new Set([...progressNow, ...deliveredIn.filter((j) => j.status !== 'approved')].map((j) => j.id)).size,
    avgProgress: Math.round(avg(progressNow.map((j) => j.progress))),
    atRisk: risky.length,
    high: risky.filter((x) => x.r.level === 'high').length,
    spark: {
      active: bucketCounts(range, jobs.map((j) => ts(j.createdAt)).concat(events(['status', 'accepted'])), now),
      review: bucketCounts(range, events(['delivery', 'approved']), now),
      progress: bucketCounts(range, events(['status', 'asset', 'comment']), now),
      risk: bucketCounts(range, events(['revision', 'deadline', 'counter']), now),
    },
  }
}

export interface DesignerPulse {
  earnedMonth: number
  earnedLastMonth: number
  earnedRange: number
  escrow: number
  active: number
  dueSoon: number
  requests: number
  newRequests: number
  spark: { earn: number[]; active: number[]; requests: number[] }
}

/** Released milestones = money that actually moved to the designer. */
export function releasedBetween(jobs: Job[], from: number, to: number) {
  let sum = 0
  for (const j of jobs) for (const m of j.milestones) if (m.status === 'released' && ts(m.dueAt) >= from && ts(m.dueAt) < to) sum += m.amount
  return sum
}

export function designerPulse(jobs: Job[], range: PulseRange, now = Date.now()): DesignerPulse {
  const from = rangeStart(range, now)
  const month = startOfMonth(now).getTime()
  const lastMonth = subMonths(month, 1).getTime()
  const live = jobs.filter((j) => !CLOSED.includes(j.status))
  const working = live.filter((j) => j.status !== 'requested')
  const requested = live.filter((j) => j.status === 'requested')
  const releaseStamps = jobs.flatMap((j) => j.milestones.filter((m) => m.status === 'released').map((m) => ts(m.dueAt)))
  return {
    earnedMonth: releasedBetween(jobs, month, now + 1),
    earnedLastMonth: releasedBetween(jobs, lastMonth, month),
    earnedRange: releasedBetween(jobs, from, now + 1),
    escrow: jobs.reduce((a, j) => a + j.milestones.filter((m) => m.status === 'escrow').reduce((b, m) => b + m.amount, 0), 0),
    active: working.length,
    dueSoon: working.filter((j) => differenceInCalendarDays(new Date(j.dueAt), new Date(now)) <= HORIZON[range]).length,
    requests: requested.length,
    newRequests: requested.filter((j) => ts(j.createdAt) >= from).length,
    spark: {
      earn: bucketCounts(range, releaseStamps, now),
      active: bucketCounts(range, jobs.flatMap((j) => j.timeline.filter((e) => e.kind === 'status').map((e) => ts(e.at))), now),
      requests: bucketCounts(range, requested.map((j) => ts(j.createdAt)), now),
    },
  }
}

/** Average days from brief to approval (falls back to first delivery). */
export function avgTurnaround(jobs: Job[]) {
  const approved = jobs.filter((j) => j.status === 'approved' && j.approvedAt).map((j) => (ts(j.approvedAt) - ts(j.createdAt)) / DAY)
  if (approved.length) return avg(approved)
  const delivered = jobs
    .map((j) => {
      const first = j.timeline.filter((e) => e.kind === 'delivery').sort((a, b) => ts(a.at) - ts(b.at))[0]
      return first ? (ts(first.at) - ts(j.createdAt)) / DAY : null
    })
    .filter((x): x is number => x !== null)
  return avg(delivered)
}

// ───────────────────────── money series ─────────────────────────

export interface MoneySeries {
  buckets: Bucket[]
  paid: number[]
  committed: number[]
  totalPaid: number
  totalCommitted: number
  /** Change of the second half vs the first half of the window, in %. */
  delta: number
}

export function moneySeries(jobs: Job[], range: MoneyRangeKey, seedKey: string, weekStartsOn: 0 | 1 = 1, now = new Date()): MoneySeries {
  const buckets = range === '12w' ? weekBuckets(12, weekStartsOn, now) : monthBuckets(6, now)
  const real = jobs.filter((j) => !['declined', 'cancelled'].includes(j.status))
  const earliest = real.length ? Math.min(...real.map((j) => ts(j.createdAt))) : now.getTime()
  const avgBudget = avg(real.map((j) => j.budget)) || 1800
  const base = range === '12w' ? avgBudget * 0.9 : avgBudget * 3.2
  const histPaid = history(`${seedKey}-${range}-paid`, buckets.length, base * 0.8)
  const histCommitted = history(`${seedKey}-${range}-com`, buckets.length, base)
  const paid: number[] = []
  const committed: number[] = []
  buckets.forEach((b, i) => {
    if (b.end <= earliest) {
      paid.push(histPaid[i])
      committed.push(histCommitted[i])
      return
    }
    paid.push(releasedBetween(real, b.start, Math.min(b.end, now.getTime() + 1)))
    committed.push(real.filter((j) => ts(j.createdAt) >= b.start && ts(j.createdAt) < b.end).reduce((a, j) => a + j.budget, 0))
  })
  const half = Math.floor(buckets.length / 2)
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
  const first = sum(paid.slice(0, half))
  const second = sum(paid.slice(half))
  return {
    buckets,
    paid,
    committed,
    totalPaid: sum(paid),
    totalCommitted: sum(committed),
    delta: first ? Math.round(((second - first) / first) * 100) : 0,
  }
}

export type MoneyRangeKey = '12w' | '6m'

// ───────────────────────── planning ─────────────────────────

export interface Slot {
  at: Date
  durationMin: number
}

/**
 * Find `count` free focus slots (default 90 min) from now on, inside working
 * hours (9–19), skipping existing calendar events.
 */
export function findFocusSlots(busy: { at: string; durationMin: number }[], count: number, durationMin = 90, now = new Date()): Slot[] {
  const slots: Slot[] = []
  const taken = busy.map((e) => ({ s: ts(e.at), e: ts(e.at) + e.durationMin * 60_000 }))
  const cursor = new Date(now)
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() < 30 ? 30 : 60)
  let guard = 0
  while (slots.length < count && guard++ < 200) {
    const h = cursor.getHours()
    if (h < 9) cursor.setHours(9, 0, 0, 0)
    const end = cursor.getTime() + durationMin * 60_000
    const endDate = new Date(end)
    if (cursor.getHours() >= 19 || endDate.getHours() > 19 || (endDate.getHours() === 19 && endDate.getMinutes() > 0) || endDate.getDate() !== cursor.getDate()) {
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(9, 0, 0, 0)
      continue
    }
    const clash = taken.find((t) => cursor.getTime() < t.e && end > t.s)
    if (clash) {
      const next = new Date(clash.e)
      next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15, 0, 0)
      cursor.setTime(Math.max(next.getTime(), cursor.getTime() + 15 * 60_000))
      continue
    }
    slots.push({ at: new Date(cursor), durationMin })
    taken.push({ s: cursor.getTime(), e: end })
    cursor.setTime(end + 15 * 60_000)
  }
  return slots
}

/** Start of the day N days from now. */
export function dayStart(offset: number, now = Date.now()) {
  return addDays(startOfDay(now), offset).getTime()
}

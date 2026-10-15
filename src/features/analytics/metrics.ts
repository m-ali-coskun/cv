import { format } from 'date-fns'
import { DISCIPLINE_IDS, type DisciplineFilter, type DisciplineId, type Job, type JobStatus, type Role } from '@/store/types'
import { DAY, HOUR, startOfDayMs, ts, type WorkRecord } from './history'

export type RangeId = '30d' | '90d' | '12m'

export interface Bucket {
  start: number
  end: number
  date: Date
}

/** Sub-buckets for a range: 6×5 days, 13 weeks or 12 months (oldest first). */
export function rangeBuckets(range: RangeId, offset = 0, now = new Date()): Bucket[] {
  if (range === '12m') {
    const out: Bucket[] = []
    for (let i = 11 + offset * 12; i >= offset * 12; i--) {
      const s = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      out.push({ start: s.getTime(), end: e.getTime(), date: s })
    }
    return out
  }
  const [n, span] = range === '30d' ? [6, 5] : [13, 7]
  const end = startOfDayMs(now.getTime()) + DAY - offset * n * span * DAY
  const out: Bucket[] = []
  for (let i = n - 1; i >= 0; i--) {
    const e = end - i * span * DAY
    out.push({ start: e - span * DAY, end: e, date: new Date(e - DAY) })
  }
  return out
}

const inB = (t: number | undefined, b: { start: number; end: number }) => t !== undefined && Number.isFinite(t) && t >= b.start && t < b.end
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN)
const spanOf = (bs: Bucket[]) => ({ start: bs[0].start, end: bs[bs.length - 1].end })

export const filterDisc = (records: WorkRecord[], d: DisciplineFilter) => (d === 'all' ? records : records.filter((r) => r.discipline === d))

const turnaround = (r: WorkRecord) => (r.doneAt! - r.startedAt) / DAY
const onTime = (r: WorkRecord) => r.doneAt! <= r.dueAt + 12 * HOUR

export interface Kpis {
  turnaround: number
  onTime: number
  revisions: number
  rating: number
  money: number
  collaborators: number
  done: number
  created: number
  response: number
}

export function kpisFor(records: WorkRecord[], w: { start: number; end: number }): Kpis {
  const done = records.filter((r) => r.doneAt && inB(r.doneAt, w))
  const created = records.filter((r) => inB(r.createdAt, w))
  const active = records.filter((r) => r.createdAt < w.end && (!r.doneAt || r.doneAt >= w.start))
  const rated = done.filter((r) => r.rating)
  return {
    turnaround: mean(done.map(turnaround)),
    onTime: done.length ? done.filter(onTime).length / done.length : NaN,
    revisions: mean(done.map((r) => r.revisions)),
    rating: mean(rated.map((r) => r.rating!)),
    money: created.reduce((a, r) => a + r.amount, 0),
    collaborators: new Set(active.map((r) => r.counterpartId)).size,
    done: done.length,
    created: created.length,
    response: mean(created.filter((r) => r.responseHrs !== undefined).map((r) => r.responseHrs!)),
  }
}

/** Fill NaN gaps with the previous value (or the first finite one). */
export function fillGaps(a: number[], fallback = 0) {
  const first = a.find((v) => Number.isFinite(v)) ?? fallback
  let last = first
  return a.map((v) => (Number.isFinite(v) ? (last = v) : last))
}

export interface Series {
  turnaround: number[]
  onTime: number[]
  revisions: number[]
  rating: number[]
  money: number[]
  collaborators: number[]
  response: number[]
  done: number[]
}

export function seriesFor(records: WorkRecord[], buckets: Bucket[]): Series {
  const per = buckets.map((b) => kpisFor(records, b))
  const pick = (k: keyof Kpis) => per.map((p) => p[k])
  return {
    turnaround: fillGaps(pick('turnaround')),
    onTime: fillGaps(pick('onTime')).map((v) => v * 100),
    revisions: fillGaps(pick('revisions')),
    rating: fillGaps(pick('rating'), 5),
    money: pick('money'),
    collaborators: pick('collaborators'),
    response: fillGaps(pick('response')),
    done: pick('done'),
  }
}

export interface Report {
  /** Share (0–1) of the previous window that is covered by data — deltas are hidden when it is thin. */
  prevCoverage: number
  buckets: Bucket[]
  cur: Kpis
  prev: Kpis
  series: Series
  inWindow: WorkRecord[]
}

export function buildReport(records: WorkRecord[], range: RangeId): Report {
  const buckets = rangeBuckets(range)
  const prevBuckets = rangeBuckets(range, 1)
  const w = spanOf(buckets)
  const pw = spanOf(prevBuckets)
  const earliest = records.reduce((m, r) => Math.min(m, r.createdAt), Date.now())
  return {
    prevCoverage: Math.max(0, Math.min(1, (pw.end - Math.max(pw.start, earliest)) / (pw.end - pw.start))),
    buckets,
    cur: kpisFor(records, w),
    prev: kpisFor(records, spanOf(prevBuckets)),
    series: seriesFor(records, buckets),
    inWindow: records.filter((r) => r.createdAt < w.end && (inB(r.createdAt, w) || (r.doneAt ? r.doneAt >= w.start : true))),
  }
}

export const STATUS_ORDER: JobStatus[] = ['requested', 'queued', 'in_progress', 'final_touches', 'in_review', 'revisions', 'approved']

export function byStatus(records: WorkRecord[]) {
  const out = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<JobStatus, number>
  for (const r of records) if (r.status in out) out[r.status]++
  return out
}

export function byDiscipline(records: WorkRecord[]) {
  const out = Object.fromEntries(DISCIPLINE_IDS.map((d) => [d, { count: 0, amount: 0, turnaround: [] as number[] }])) as Record<
    DisciplineId,
    { count: number; amount: number; turnaround: number[] }
  >
  for (const r of records) {
    out[r.discipline].count++
    out[r.discipline].amount += r.amount
    if (r.doneAt) out[r.discipline].turnaround.push(turnaround(r))
  }
  return out
}

/** Histogram of revision rounds for completed jobs: 0, 1, 2, 3+. */
export function revisionHistogram(records: WorkRecord[]) {
  const out = [0, 0, 0, 0]
  for (const r of records) if (r.doneAt) out[Math.min(3, r.revisions)]++
  return out
}

export interface LeaderRow {
  id: string
  jobs: number
  done: number
  rating: number
  onTime: number
  amount: number
  turnaround: number
  share: number
}

export function leaderboard(records: WorkRecord[]): LeaderRow[] {
  const map = new Map<string, WorkRecord[]>()
  for (const r of records) map.set(r.counterpartId, [...(map.get(r.counterpartId) ?? []), r])
  const total = records.reduce((a, r) => a + r.amount, 0) || 1
  return [...map.entries()].map(([id, list]) => {
    const done = list.filter((r) => r.doneAt)
    const rated = done.filter((r) => r.rating)
    const amount = list.reduce((a, r) => a + r.amount, 0)
    return {
      id,
      jobs: list.length,
      done: done.length,
      rating: rated.length ? mean(rated.map((r) => r.rating!)) : NaN,
      onTime: done.length ? done.filter(onTime).length / done.length : NaN,
      amount,
      turnaround: mean(done.map(turnaround)),
      share: (amount / total) * 100,
    }
  })
}

/** Activity per day ('yyyy-MM-dd') from job timelines + imported history. */
export function activityMap(jobs: Job[], records: WorkRecord[], weeks = 16, now = Date.now()) {
  const from = startOfDayMs(now) - weeks * 7 * DAY
  const out: Record<string, number> = {}
  const add = (t: number) => {
    if (!Number.isFinite(t) || t < from || t > now) return
    const k = format(new Date(t), 'yyyy-MM-dd')
    out[k] = (out[k] ?? 0) + 1
  }
  for (const j of jobs) for (const e of j.timeline) add(ts(e.at))
  for (const r of records) {
    if (r.real) continue
    add(r.createdAt)
    add(r.startedAt)
    if (r.firstDeliveryAt) add(r.firstDeliveryAt)
    if (r.doneAt) add(r.doneAt)
  }
  return out
}

export function heatStats(values: Record<string, number>, weeks = 16, now = new Date()) {
  const days: { date: Date; v: number }[] = []
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    days.push({ date: d, v: values[format(d, 'yyyy-MM-dd')] ?? 0 })
  }
  const total = days.reduce((a, d) => a + d.v, 0)
  const activeDays = days.filter((d) => d.v > 0).length
  // current streak (ending today or yesterday)
  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].v > 0) streak++
    else if (i === days.length - 1) continue
    else break
  }
  let best = 0
  let run = 0
  for (const d of days) {
    run = d.v > 0 ? run + 1 : 0
    best = Math.max(best, run)
  }
  const dow = new Array(7).fill(0)
  for (const d of days) dow[d.date.getDay()] += d.v
  const busiest = dow.indexOf(Math.max(...dow))
  const busiestDate = days.find((d) => d.date.getDay() === busiest)?.date ?? now
  /** Events per weekday, Monday first, with a sample date for labels. */
  const weekdays = [1, 2, 3, 4, 5, 6, 0].map((wd) => ({ v: dow[wd], date: days.find((d) => d.date.getDay() === wd)?.date ?? now }))
  return { total, activeDays, streak, best, busiestDate, weekdays }
}

/** 0–100 composite of on-time delivery, rating and revision load. */
export function deliveryScore(k: Kpis) {
  const on = Number.isFinite(k.onTime) ? k.onTime : 0.9
  const rating = Number.isFinite(k.rating) ? k.rating : 4.6
  const rev = Number.isFinite(k.revisions) ? k.revisions : 1
  return Math.round(Math.max(0, Math.min(100, on * 45 + (rating / 5) * 35 + Math.max(0, 1 - rev / 3) * 20)))
}

export function jobsCsv(jobs: Job[], role: Role, name: (id: string) => string) {
  const head = ['job_id', 'title', 'discipline', 'status', 'priority', role === 'client' ? 'designer' : 'client', 'created_at', 'due_at', 'approved_at', 'budget', 'currency', 'progress_pct', 'revisions', 'rating', 'hours_tracked']
  const esc = (v: string | number | undefined) => {
    const s = v === undefined ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = jobs.map((j) => [
    j.id,
    j.title,
    j.discipline,
    j.status,
    j.priority,
    name(role === 'client' ? j.designerId : j.clientId),
    j.createdAt.slice(0, 10),
    j.dueAt.slice(0, 10),
    j.approvedAt?.slice(0, 10),
    j.budget,
    j.currency,
    j.progress,
    j.revisions.length,
    j.rating,
    Math.round((j.timeTrackedMin / 60) * 10) / 10,
  ])
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\n')
}

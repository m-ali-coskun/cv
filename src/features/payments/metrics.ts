import { useMemo } from 'react'
import { useApp } from '@/store'
import { useDiscipline, useMyJobs, useRole } from '@/store/selectors'
import type { DisciplineFilter, DisciplineId, Job, Milestone } from '@/store/types'
import { DISCIPLINE_IDS } from '@/store/types'
import type { WorkRecord } from '@/features/analytics/history'
import { usePayPrefs, type Payout } from './local'
import { DAY, matchesDisc, monthBuckets, startOfDayMs, ts, useInvoiceRows, useWorkRecords, type Bucket, type InvoiceRow } from './model'

/** Everything a payments page needs, memoised once per store change. */
export function useMoneyData() {
  const role = useRole()
  const discipline = useDiscipline()
  const rows = useInvoiceRows()
  const allRows = useInvoiceRows({ ignoreDiscipline: true })
  const jobs = useMyJobs({ includeClosed: false })
  const allJobs = useMyJobs({ includeClosed: false, ignoreDiscipline: true })
  const { records, cutoff } = useWorkRecords()
  const currency = useApp((s) => s.settings.currency)
  return { role, discipline, rows, allRows, jobs, allJobs, records, cutoff, currency }
}

const inRange = (t: number, a: number, b: number) => Number.isFinite(t) && t >= a && t < b
const startOfMonth = (d = new Date(), offset = 0) => new Date(d.getFullYear(), d.getMonth() + offset, 1).getTime()

export function escrowHeld(jobs: Job[]) {
  let total = 0
  let count = 0
  for (const j of jobs) {
    const held = j.milestones.filter((m) => m.status === 'escrow').reduce((a, m) => a + m.amount, 0)
    if (held > 0) {
      total += held
      count++
    }
  }
  return { total, count }
}

export interface ClientKpis {
  escrow: number
  escrowJobs: number
  paidMonth: number
  paidPrevMonth: number
  paidMonthCount: number
  upcoming: number
  upcomingCount: number
  overdue: number
  overdueCount: number
  oldestOverdueDays: number
  /** Weekly committed spend, last 8 weeks. */
  sparkCommitted: number[]
  /** Weekly paid, last 8 weeks. */
  sparkPaid: number[]
  /** Due per week, next 5 weeks. */
  sparkUpcoming: number[]
}

/** Weekly sums over the last `n` weeks (oldest first). */
function weekly(n: number, items: { t: number; v: number }[], now = Date.now()) {
  const end = startOfDayMs(now) + DAY
  const out = new Array(n).fill(0)
  for (const it of items) {
    const idx = n - 1 - Math.floor((end - it.t) / (7 * DAY))
    if (idx >= 0 && idx < n && it.t < end) out[idx] += it.v
  }
  return out
}

export function clientKpis(rows: InvoiceRow[], jobs: Job[], records: WorkRecord[], discipline: DisciplineFilter, now = Date.now()): ClientKpis {
  const { total: escrow, count: escrowJobs } = escrowHeld(jobs)
  const m0 = startOfMonth(new Date(now))
  const m1 = startOfMonth(new Date(now), 1)
  const mPrev = startOfMonth(new Date(now), -1)
  const paidIn = (a: number, b: number) => rows.filter((r) => r.status === 'paid' && inRange(ts(r.inv.paidAt), a, b))
  const hist = records.filter((r) => !r.real && matchesDisc(discipline, r.discipline))
  const histIn = (a: number, b: number) => hist.filter((h) => inRange(h.doneAt ?? NaN, a, b)).reduce((x, h) => x + h.amount, 0)
  const paidMonthRows = paidIn(m0, m1)
  const paidMonth = paidMonthRows.reduce((a, r) => a + r.inv.amount, 0) + histIn(m0, m1)
  const paidPrevMonth = paidIn(mPrev, m0).reduce((a, r) => a + r.inv.amount, 0) + histIn(mPrev, m0)
  const today = startOfDayMs(now)
  const upcomingRows = rows.filter((r) => (r.status === 'pending' || r.status === 'escrow') && inRange(ts(r.inv.dueAt), today, today + 31 * DAY))
  const overdueRows = rows.filter((r) => r.status === 'overdue')
  const oldest = overdueRows.reduce((m, r) => Math.max(m, Math.floor((today - startOfDayMs(ts(r.inv.dueAt))) / DAY)), 0)

  const committed = [
    ...rows.filter((r) => r.status !== 'draft').map((r) => ({ t: ts(r.inv.issuedAt), v: r.inv.amount })),
    ...hist.map((h) => ({ t: h.createdAt, v: h.amount })),
  ]
  const paid = [
    ...rows.filter((r) => r.status === 'paid').map((r) => ({ t: ts(r.inv.paidAt), v: r.inv.amount })),
    ...hist.map((h) => ({ t: h.doneAt ?? h.createdAt, v: h.amount })),
  ]
  const sparkUpcoming = new Array(5).fill(0)
  for (const r of rows) {
    if (r.status !== 'pending' && r.status !== 'escrow' && r.status !== 'overdue') continue
    const d = Math.max(0, Math.floor((ts(r.inv.dueAt) - today) / (7 * DAY)))
    if (d < 5) sparkUpcoming[d] += r.inv.amount
  }
  return {
    escrow,
    escrowJobs,
    paidMonth,
    paidPrevMonth,
    paidMonthCount: paidMonthRows.length,
    upcoming: upcomingRows.reduce((a, r) => a + r.inv.amount, 0),
    upcomingCount: upcomingRows.length,
    overdue: overdueRows.reduce((a, r) => a + r.inv.amount, 0),
    overdueCount: overdueRows.length,
    oldestOverdueDays: oldest,
    sparkCommitted: weekly(8, committed, now),
    sparkPaid: weekly(8, paid, now),
    sparkUpcoming,
  }
}

/** Amount per invoice status — feeds the "money pipeline" bar. */
export function statusTotals(rows: InvoiceRow[]) {
  const out = { draft: 0, pending: 0, overdue: 0, escrow: 0, paid: 0 }
  const count = { draft: 0, pending: 0, overdue: 0, escrow: 0, paid: 0 }
  for (const r of rows) {
    out[r.status] += r.inv.amount
    count[r.status]++
  }
  return { amount: out, count }
}

/** Spend / earnings per discipline over the last 12 months (real invoices + imported history). */
export function byDiscipline(rows: InvoiceRow[], records: WorkRecord[], now = Date.now()) {
  const from = startOfMonth(new Date(now), -11)
  const out = Object.fromEntries(DISCIPLINE_IDS.map((d) => [d, 0])) as Record<DisciplineId, number>
  const jobsPer = Object.fromEntries(DISCIPLINE_IDS.map((d) => [d, 0])) as Record<DisciplineId, number>
  for (const r of rows) {
    if (r.status === 'draft' || !r.discipline) continue
    if (ts(r.inv.issuedAt) < from) continue
    out[r.discipline] += r.inv.amount
    jobsPer[r.discipline]++
  }
  for (const h of records) {
    if (h.real || h.createdAt < from) continue
    out[h.discipline] += h.amount
    jobsPer[h.discipline]++
  }
  return { amount: out, jobs: jobsPer }
}

/** Monthly flow split into money that moved and money still committed. */
export function monthlyFlow(rows: InvoiceRow[], records: WorkRecord[], discipline: DisciplineFilter, n = 12, now = new Date()) {
  const buckets = monthBuckets(n, now)
  const hist = records.filter((r) => !r.real && matchesDisc(discipline, r.discipline))
  const paid = buckets.map(
    (b) =>
      rows.filter((r) => r.status === 'paid' && inRange(ts(r.inv.paidAt), b.start, b.end)).reduce((a, r) => a + r.inv.amount, 0) +
      hist.filter((h) => inRange(h.doneAt ?? NaN, b.start, b.end)).reduce((a, h) => a + h.amount, 0),
  )
  const open = buckets.map((b) =>
    rows
      .filter((r) => (r.status === 'pending' || r.status === 'overdue' || r.status === 'escrow') && inRange(ts(r.inv.issuedAt), b.start, b.end))
      .reduce((a, r) => a + r.inv.amount, 0),
  )
  return { buckets, paid, open }
}

export interface UpcomingItem {
  id: string
  kind: 'invoice' | 'milestone'
  at: number
  amount: number
  label: string
  jobId: string
  row?: InvoiceRow
  job?: Job
  milestone?: Milestone
  overdue: boolean
}

/** What has to be paid in the next `days` days — invoices and milestones, dated. */
export function upcomingPayments(rows: InvoiceRow[], jobs: Job[], days = 30, now = Date.now()): UpcomingItem[] {
  const today = startOfDayMs(now)
  const until = today + days * DAY
  const out: UpcomingItem[] = []
  for (const r of rows) {
    if (r.status !== 'pending' && r.status !== 'overdue') continue
    const at = ts(r.inv.dueAt)
    if (at > until) continue
    out.push({ id: r.inv.id, kind: 'invoice', at, amount: r.inv.amount, label: r.job?.title ?? r.inv.lineItems[0]?.label ?? r.inv.id, jobId: r.inv.jobId, row: r, job: r.job, overdue: r.status === 'overdue' })
  }
  for (const j of jobs) {
    if (['approved', 'declined', 'cancelled'].includes(j.status)) continue
    for (const m of j.milestones) {
      if (m.status === 'released') continue
      const at = ts(m.dueAt)
      if (!Number.isFinite(at) || at > until) continue
      out.push({ id: `${j.id}-${m.id}`, kind: 'milestone', at, amount: m.amount, label: m.label, jobId: j.id, job: j, milestone: m, overdue: at < today })
    }
  }
  return out.sort((a, b) => a.at - b.at)
}

/** Next `n` weeks of outgoing money, split by kind. */
export function cashflowWeeks(items: UpcomingItem[], n = 5, now = Date.now()) {
  const today = startOfDayMs(now)
  const inv = new Array(n).fill(0)
  const ms = new Array(n).fill(0)
  for (const it of items) {
    const w = Math.min(n - 1, Math.max(0, Math.floor((it.at - today) / (7 * DAY))))
    if (it.kind === 'invoice') inv[w] += it.amount
    else ms[w] += it.amount
  }
  return { invoices: inv, milestones: ms }
}

// ───────────────────────── designer ─────────────────────────

export function usePayouts(): Payout[] {
  const seededAt = useApp((s) => s.seededAt)
  const payouts = usePayPrefs((s) => s.payouts)
  return useMemo(() => payouts.filter((p) => p.seededAt === seededAt), [payouts, seededAt])
}

export interface DesignerMoney {
  balance: number
  paidTotal: number
  paidOut: number
  pending: number
  pendingCount: number
  escrow: number
  escrowJobs: number
  lifetime: number
  /** Average days between issue and payment of paid invoices. */
  avgDaysToPaid: number
  invoicedMonth: number
  collectedMonth: number
  collectedYear: number
  /** Weekly earnings, last 8 weeks (spark). */
  sparkPaid: number[]
  sparkPending: number[]
}

/** Account-level money for designer-Ali (balance ignores the discipline tab). */
export function designerMoney(allRows: InvoiceRow[], rows: InvoiceRow[], jobs: Job[], records: WorkRecord[], payouts: Payout[], discipline: DisciplineFilter, now = Date.now()): DesignerMoney {
  const paidRows = allRows.filter((r) => r.status === 'paid')
  const paidTotal = paidRows.reduce((a, r) => a + r.inv.amount, 0)
  const paidOut = payouts.reduce((a, p) => a + p.amount, 0)
  const pendingRows = rows.filter((r) => r.status === 'pending' || r.status === 'overdue')
  const { total: escrow, count: escrowJobs } = escrowHeld(jobs)
  const hist = records.filter((r) => !r.real && matchesDisc(discipline, r.discipline))
  const lifetime = rows.filter((r) => r.status === 'paid').reduce((a, r) => a + r.inv.amount, 0) + hist.reduce((a, h) => a + h.amount, 0)
  const days = rows.filter((r) => r.status === 'paid' && r.inv.paidAt).map((r) => (ts(r.inv.paidAt) - ts(r.inv.issuedAt)) / DAY)
  const m0 = startOfMonth(new Date(now))
  const y0 = new Date(new Date(now).getFullYear(), 0, 1).getTime()
  const invoicedMonth = allRows.filter((r) => r.status !== 'draft' && ts(r.inv.issuedAt) >= m0).reduce((a, r) => a + r.inv.amount, 0)
  const collectedMonth = paidRows.filter((r) => ts(r.inv.paidAt) >= m0).reduce((a, r) => a + r.inv.amount, 0)
  const allHist = records.filter((r) => !r.real)
  const collectedYear =
    paidRows.filter((r) => ts(r.inv.paidAt) >= y0).reduce((a, r) => a + r.inv.amount, 0) + allHist.filter((h) => (h.doneAt ?? 0) >= y0).reduce((a, h) => a + h.amount, 0)
  return {
    balance: Math.max(0, paidTotal - paidOut),
    paidTotal,
    paidOut,
    pending: pendingRows.reduce((a, r) => a + r.inv.amount, 0),
    pendingCount: pendingRows.length,
    escrow,
    escrowJobs,
    lifetime,
    avgDaysToPaid: days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0,
    invoicedMonth,
    collectedMonth,
    collectedYear,
    sparkPaid: weekly(
      8,
      [...rows.filter((r) => r.status === 'paid').map((r) => ({ t: ts(r.inv.paidAt), v: r.inv.amount })), ...hist.map((h) => ({ t: h.doneAt ?? h.createdAt, v: h.amount }))],
      now,
    ),
    sparkPending: weekly(8, pendingRows.map((r) => ({ t: ts(r.inv.issuedAt), v: r.inv.amount })), now),
  }
}

export interface ClientShare {
  id: string
  amount: number
  jobs: number
  share: number
  lastAt: number
}

/** Top counterparts by money over the last 12 months. */
export function topCounterparts(rows: InvoiceRow[], records: WorkRecord[], discipline: DisciplineFilter, now = Date.now()): ClientShare[] {
  const from = startOfMonth(new Date(now), -11)
  const map = new Map<string, ClientShare>()
  const add = (id: string, amount: number, at: number) => {
    const cur = map.get(id) ?? { id, amount: 0, jobs: 0, share: 0, lastAt: 0 }
    cur.amount += amount
    cur.jobs++
    cur.lastAt = Math.max(cur.lastAt, at)
    map.set(id, cur)
  }
  for (const r of rows) if (r.status !== 'draft' && ts(r.inv.issuedAt) >= from) add(r.counterpartId, r.inv.amount, ts(r.inv.issuedAt))
  for (const h of records) if (!h.real && matchesDisc(discipline, h.discipline) && h.createdAt >= from) add(h.counterpartId, h.amount, h.doneAt ?? h.createdAt)
  const list = [...map.values()].sort((a, b) => b.amount - a.amount)
  const total = list.reduce((a, c) => a + c.amount, 0) || 1
  return list.map((c) => ({ ...c, share: (c.amount / total) * 100 }))
}

/** Monthly auto-payouts of the imported history (already settled money). */
export function historyPayouts(records: WorkRecord[], limit = 6) {
  const map = new Map<string, { at: number; amount: number; count: number }>()
  for (const h of records) {
    if (h.real || !h.doneAt) continue
    const d = new Date(h.doneAt)
    const at = new Date(d.getFullYear(), d.getMonth() + 1, 1, 9).getTime()
    const key = String(at)
    const cur = map.get(key) ?? { at, amount: 0, count: 0 }
    cur.amount += h.amount
    cur.count++
    map.set(key, cur)
  }
  return [...map.values()].filter((p) => p.at < Date.now()).sort((a, b) => b.at - a.at).slice(0, limit)
}

/** Approved / active jobs of designer-Ali that have no live invoice yet. */
export function uninvoicedJobs(jobs: Job[], rows: InvoiceRow[]) {
  const invoiced = new Set(rows.filter((r) => r.status !== 'draft').map((r) => r.inv.jobId))
  return jobs
    .filter((j) => !['requested', 'declined', 'cancelled'].includes(j.status) && !invoiced.has(j.id))
    .sort((a, b) => Number(b.status === 'approved') - Number(a.status === 'approved') || ts(b.updatedAt) - ts(a.updatedAt))
}

export type { Bucket }

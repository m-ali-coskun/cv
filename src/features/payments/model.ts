import { useMemo } from 'react'
import { localeOf } from '@/lib/format'
import { useApp } from '@/store'
import { useDiscipline, useRole } from '@/store/selectors'
import {
  ME_CLIENT_ID,
  ME_DESIGNER_ID,
  type Client,
  type Designer,
  type DisciplineFilter,
  type DisciplineId,
  type Invoice,
  type InvoiceStatus,
  type Job,
  type Lang,
  type Role,
} from '@/store/types'
import { DAY, historyCutoff, realRecords, startOfDayMs, syntheticRecords, ts, type WorkRecord } from '@/features/analytics/history'

export { DAY, ts, startOfDayMs }

export const INVOICE_STATUSES: InvoiceStatus[] = ['pending', 'overdue', 'escrow', 'paid', 'draft']

/** A pending invoice whose due date has passed is overdue, whatever the stored status says. */
export function effectiveStatus(inv: Invoice, now = Date.now()): InvoiceStatus {
  if (inv.status === 'pending' && ts(inv.dueAt) < startOfDayMs(now)) return 'overdue'
  return inv.status
}

export interface InvoiceRow {
  inv: Invoice
  status: InvoiceStatus
  job?: Job
  discipline?: DisciplineId
  designer?: Designer
  client?: Client
  /** The other party for the active role. */
  counterpart?: Designer | Client
  counterpartId: string
}

const STATUS_ORDER: Record<InvoiceStatus, number> = { overdue: 0, pending: 1, escrow: 2, paid: 3, draft: 4 }

export function sortRows(rows: InvoiceRow[]) {
  return [...rows].sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (s) return s
    if (a.status === 'paid') return ts(b.inv.paidAt) - ts(a.inv.paidAt)
    return ts(a.inv.dueAt) - ts(b.inv.dueAt)
  })
}

export function matchesDisc(d: DisciplineFilter, disc?: DisciplineId) {
  return d === 'all' || disc === d
}

/** Invoices of the active role joined with job + people. */
export function useInvoiceRows(opts?: { ignoreDiscipline?: boolean }): InvoiceRow[] {
  const role = useRole()
  const discipline = useDiscipline()
  const invoices = useApp((s) => s.invoices)
  const jobs = useApp((s) => s.jobs)
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const ignore = opts?.ignoreDiscipline
  return useMemo(() => {
    const me = role === 'client' ? ME_CLIENT_ID : ME_DESIGNER_ID
    const now = Date.now()
    const rows: InvoiceRow[] = []
    for (const inv of invoices) {
      if ((role === 'client' ? inv.clientId : inv.designerId) !== me) continue
      const job = jobs.find((j) => j.id === inv.jobId)
      if (!ignore && !matchesDisc(discipline, job?.discipline)) continue
      const designer = designers.find((d) => d.id === inv.designerId)
      const client = clients.find((c) => c.id === inv.clientId)
      rows.push({
        inv,
        status: effectiveStatus(inv, now),
        job,
        discipline: job?.discipline,
        designer,
        client,
        counterpart: role === 'client' ? designer : client,
        counterpartId: role === 'client' ? inv.designerId : inv.clientId,
      })
    }
    return sortRows(rows)
  }, [invoices, jobs, designers, clients, role, discipline, ignore])
}

/** Real + imported work records for the active role (all disciplines). */
export function useWorkRecords(role?: Role): { records: WorkRecord[]; cutoff: number } {
  const activeRole = useRole()
  const r = role ?? activeRole
  const jobs = useApp((s) => s.jobs)
  const invoices = useApp((s) => s.invoices)
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const cutoff = useMemo(() => historyCutoff(jobs, invoices, r), [jobs, invoices, r])
  const synthetic = useMemo(() => syntheticRecords(r, designers, clients, cutoff), [r, cutoff, designers, clients])
  const real = useMemo(() => realRecords(jobs, r), [jobs, r])
  return useMemo(() => ({ records: [...real, ...synthetic], cutoff }), [real, synthetic, cutoff])
}

// ───────────────────────── time buckets ─────────────────────────

export interface Bucket {
  key: string
  start: number
  end: number
  date: Date
}

export function monthBuckets(n: number, now = new Date()): Bucket[] {
  const out: Bucket[] = []
  for (let i = n - 1; i >= 0; i--) {
    const s = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    out.push({ key: `${s.getFullYear()}-${s.getMonth() + 1}`, start: s.getTime(), end: e.getTime(), date: s })
  }
  return out
}

/** `n` equal buckets of `spanDays` ending today (inclusive). */
export function dayBuckets(n: number, spanDays: number, now = Date.now()): Bucket[] {
  const end = startOfDayMs(now) + DAY
  const out: Bucket[] = []
  for (let i = n - 1; i >= 0; i--) {
    const e = end - i * spanDays * DAY
    const s = e - spanDays * DAY
    out.push({ key: String(s), start: s, end: e, date: new Date(e - DAY) })
  }
  return out
}

const inB = (t: number | undefined, b: { start: number; end: number }) => t !== undefined && Number.isFinite(t) && t >= b.start && t < b.end

export interface MoneySeries {
  buckets: Bucket[]
  /** Money that actually moved (paid invoices + imported history). */
  paid: number[]
  /** Invoiced / committed in the period. */
  booked: number[]
}

/**
 * Monthly money flow. Real invoices drive every month after the cutoff;
 * imported history fills the months before it.
 */
export function moneySeries(rows: InvoiceRow[], records: WorkRecord[], buckets: Bucket[], discipline: DisciplineFilter): MoneySeries {
  const hist = records.filter((r) => !r.real && matchesDisc(discipline, r.discipline))
  const paid = buckets.map(
    (b) =>
      rows.filter((r) => r.status === 'paid' && inB(ts(r.inv.paidAt), b)).reduce((a, r) => a + r.inv.amount, 0) +
      hist.filter((h) => inB(h.doneAt, b)).reduce((a, h) => a + h.amount, 0),
  )
  const booked = buckets.map(
    (b) =>
      rows.filter((r) => r.status !== 'draft' && inB(ts(r.inv.issuedAt), b)).reduce((a, r) => a + r.inv.amount, 0) +
      hist.filter((h) => inB(h.createdAt, b)).reduce((a, h) => a + h.amount, 0),
  )
  return { buckets, paid, booked }
}

export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

/** Money with fixed decimals (invoices: always 2, round figures: 0). */
export function money(amount: number, currency: 'EUR' | 'USD', lang: Lang, decimals = 2) {
  return new Intl.NumberFormat(localeOf(lang), { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount)
}

export function pctDelta(cur: number, prev: number) {
  if (!prev) return cur ? 100 : 0
  return Math.round(((cur - prev) / prev) * 100)
}

// ───────────────────────── card helpers ─────────────────────────

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown'

export function detectBrand(num: string): CardBrand {
  const n = num.replace(/\D/g, '')
  if (/^4/.test(n)) return 'visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return 'mastercard'
  if (/^3[47]/.test(n)) return 'amex'
  if (/^(6011|65|64[4-9])/.test(n)) return 'discover'
  return 'unknown'
}

export function formatCardNumber(raw: string) {
  const n = raw.replace(/\D/g, '')
  const brand = detectBrand(n)
  if (brand === 'amex') {
    const d = n.slice(0, 15)
    return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ')
  }
  return (n.slice(0, 16).match(/.{1,4}/g) ?? []).join(' ')
}

export function cardLength(brand: CardBrand) {
  return brand === 'amex' ? 15 : 16
}

export function luhn(num: string) {
  const n = num.replace(/\D/g, '')
  let s = 0
  let dbl = false
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i])
    if (dbl) {
      d *= 2
      if (d > 9) d -= 9
    }
    s += d
    dbl = !dbl
  }
  return n.length >= 13 && s % 10 === 0
}

export function formatExpiry(raw: string) {
  const n = raw.replace(/\D/g, '').slice(0, 4)
  if (n.length <= 2) return n.length === 2 && raw.endsWith('/') ? `${n}/` : n
  return `${n.slice(0, 2)}/${n.slice(2)}`
}

export function expiryValid(exp: string, now = new Date()) {
  const m = exp.match(/^(\d{2})\/(\d{2})$/)
  if (!m) return false
  const month = Number(m[1])
  const year = 2000 + Number(m[2])
  if (month < 1 || month > 12) return false
  return new Date(year, month, 1).getTime() > new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

// ───────────────────────── CSV ─────────────────────────

export function toCsv(rows: (string | number | undefined | null)[][]) {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = v === undefined || v === null ? '' : String(v)
          return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(','),
    )
    .join('\n')
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function invoicesCsv(rows: InvoiceRow[], role: Role) {
  const head = ['invoice_id', 'job_id', 'job_title', 'discipline', role === 'client' ? 'designer' : 'client', 'amount', 'currency', 'status', 'issued_at', 'due_at', 'paid_at']
  return toCsv([
    head,
    ...rows.map((r) => [
      r.inv.id,
      r.inv.jobId,
      r.job?.title ?? '',
      r.discipline ?? '',
      r.counterpart?.name ?? r.counterpartId,
      r.inv.amount,
      r.inv.currency,
      r.status,
      r.inv.issuedAt.slice(0, 10),
      r.inv.dueAt.slice(0, 10),
      r.inv.paidAt?.slice(0, 10) ?? '',
    ]),
  ])
}

/** Deterministic pseudo bank reference for an invoice. */
export function paymentReference(id: string) {
  let h = 7
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return `RF${(h % 89) + 10} ${String(h).padStart(10, '0').slice(0, 4)} ${String(h * 7).slice(-4)} ${id.replace(/\D/g, '')}`
}

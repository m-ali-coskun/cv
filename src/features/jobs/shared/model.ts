import { useEffect, useMemo, useState } from 'react'
import { useApp, meIdFor } from '@/store'
import { jobRisk, useRole, type RiskLevel } from '@/store/selectors'
import { daysUntil } from '@/lib/dates'
import { JOB_STATUSES, type Client, type Designer, type Job, type JobStatus, type Priority, type Role } from '@/store/types'

/** Statuses that end a job's life on the board. */
export const CLOSED_STATUSES: JobStatus[] = ['approved', 'declined', 'cancelled']
export const isClosed = (s: JobStatus) => CLOSED_STATUSES.includes(s)
/** Terminal statuses that are not shown as board columns. */
export const ARCHIVED_STATUSES: JobStatus[] = ['declined', 'cancelled']

export const PRIORITY_RANK: Record<Priority, number> = { urgent: 3, high: 2, medium: 1, low: 0 }
export const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low']
export const STATUS_RANK = Object.fromEntries(JOB_STATUSES.map((s, i) => [s, i])) as Record<JobStatus, number>

/** Soft work-in-progress limits per column (shown as a hint, never enforced). */
export const WIP_LIMITS: Partial<Record<JobStatus, number>> = { in_progress: 3, final_touches: 3, in_review: 4, revisions: 2 }

export type Urgency = 'overdue' | 'soon' | 'ok' | 'done'

export function urgencyOf(job: Pick<Job, 'status' | 'dueAt'>): Urgency {
  if (isClosed(job.status)) return 'done'
  const d = daysUntil(job.dueAt)
  if (d < 0) return 'overdue'
  if (d <= 2) return 'soon'
  return 'ok'
}

export const URGENCY_TEXT: Record<Urgency, string> = {
  overdue: 'text-danger',
  soon: 'text-[color-mix(in_oklab,var(--warning)_70%,var(--ink))]',
  ok: 'text-ink-2',
  done: 'text-ink-3',
}
export const URGENCY_BG: Record<Urgency, string> = {
  overdue: 'bg-danger-soft',
  soon: 'bg-warning-soft',
  ok: 'bg-[var(--surface-2)]',
  done: 'bg-[var(--surface-2)]',
}

export interface JobRow {
  job: Job
  counterpartId: string
  counterpart?: Designer | Client
  /** Counterpart is a client (designer role) → render a brand avatar. */
  counterpartIsClient: boolean
  name: string
  unread: number
  conversationId?: string
  risk: { level: RiskLevel; reason: string; score: number }
  urgency: Urgency
  days: number
  done: number
  total: number
  /** Latest delivered version number (0 = nothing delivered yet). */
  version: number
}

/** Unread counts per conversation for the active role. */
export function useUnreadByConversation() {
  const role = useRole()
  const conversations = useApp((s) => s.conversations)
  const messages = useApp((s) => s.messages)
  return useMemo(() => {
    const me = meIdFor(role)
    const readAt = new Map<string, string>()
    for (const c of conversations) readAt.set(c.id, c.lastReadAt[me] ?? '')
    const out = new Map<string, number>()
    for (const m of messages) {
      const r = readAt.get(m.conversationId)
      if (r === undefined || m.senderId === me || m.createdAt <= r) continue
      out.set(m.conversationId, (out.get(m.conversationId) ?? 0) + 1)
    }
    return out
  }, [conversations, messages, role])
}

/** Enrich jobs with everything the board / list / timeline needs. */
export function useJobRows(jobs: Job[]): JobRow[] {
  const role = useRole()
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const conversations = useApp((s) => s.conversations)
  const unread = useUnreadByConversation()
  return useMemo(() => {
    const dMap = new Map(designers.map((d) => [d.id, d]))
    const cMap = new Map(clients.map((c) => [c.id, c]))
    return jobs.map((job) => {
      const counterpartIsClient = role === 'designer'
      const counterpartId = counterpartIsClient ? job.clientId : job.designerId
      const counterpart = counterpartIsClient ? cMap.get(counterpartId) : dMap.get(counterpartId)
      const conversationId =
        job.conversationId ?? conversations.find((c) => c.clientId === job.clientId && c.designerId === job.designerId)?.id
      return {
        job,
        counterpartId,
        counterpart,
        counterpartIsClient,
        name: counterpart?.name ?? '—',
        unread: conversationId ? (unread.get(conversationId) ?? 0) : 0,
        conversationId,
        risk: jobRisk(job),
        urgency: urgencyOf(job),
        days: daysUntil(job.dueAt),
        done: job.deliverables.filter((d) => d.done).length,
        total: job.deliverables.length,
        version: job.versions.length,
      }
    })
  }, [jobs, designers, clients, conversations, unread, role])
}

// ─────────────────────────── drag & drop rules ───────────────────────────

export type MoveVerdict =
  | { kind: 'same' }
  | { kind: 'ok'; action: 'accept' | 'status' | 'acceptCounter' }
  | { kind: 'modal'; modal: 'approve' | 'revision' | 'deliver' }
  | { kind: 'refuse'; reason: RefuseReason }

export type RefuseReason = 'designerOnly' | 'clientOnly' | 'acceptFirst' | 'locked' | 'noBack' | 'counterPending'

/**
 * Who may move a card where. The designer runs the pipeline; the client only
 * decides on reviews (approve / request changes) and counter-offers.
 */
export function moveVerdict(job: Pick<Job, 'status' | 'counterOffer'>, to: JobStatus, role: Role): MoveVerdict {
  const from = job.status
  if (from === to) return { kind: 'same' }
  if (role === 'designer') {
    if (from === 'approved' || isClosed(from)) return { kind: 'refuse', reason: 'locked' }
    if (to === 'approved' || to === 'revisions') return { kind: 'refuse', reason: 'clientOnly' }
    if (from === 'requested') {
      if (job.counterOffer?.status === 'pending') return { kind: 'refuse', reason: 'counterPending' }
      return to === 'queued' ? { kind: 'ok', action: 'accept' } : { kind: 'refuse', reason: 'acceptFirst' }
    }
    if (to === 'requested') return { kind: 'refuse', reason: 'noBack' }
    if (to === 'in_review') return { kind: 'modal', modal: 'deliver' }
    return { kind: 'ok', action: 'status' }
  }
  if (from === 'in_review' && to === 'approved') return { kind: 'modal', modal: 'approve' }
  if (from === 'in_review' && to === 'revisions') return { kind: 'modal', modal: 'revision' }
  if (from === 'requested' && job.counterOffer?.status === 'pending' && to === 'queued') return { kind: 'ok', action: 'acceptCounter' }
  return { kind: 'refuse', reason: 'designerOnly' }
}

// ─────────────────────────── small hooks ───────────────────────────

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

/** Re-render every `ms` (for live countdowns). */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

/** "Declined: reason" → "reason" from the job timeline. */
export function declineReason(job: Job): string | undefined {
  const ev = job.timeline.find((e) => e.kind === 'declined')
  if (!ev) return undefined
  const m = ev.text.match(/^Declined:\s*(.+)$/)
  return m?.[1]
}

/** When the job left the 'requested' state (accept / decline / counter). */
export function respondedAt(job: Job): string | undefined {
  const evs = job.timeline.filter((e) => e.kind === 'accepted' || e.kind === 'declined' || e.kind === 'counter')
  return evs.length ? evs[evs.length - 1]!.at : undefined
}

export function jobUrl(id: string) {
  if (typeof window === 'undefined') return `#/jobs/${id}`
  return `${window.location.origin}${window.location.pathname}#/jobs/${id}`
}

/** Download a CSV built from rows of cells. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Derived data hooks.
 *
 * ⚠️ zustand v5: a selector must return a STABLE reference. Never write
 * `useApp(s => s.jobs.filter(...))` — it creates a new array every render and
 * React will loop. Select raw slices and derive with useMemo (as below), or use
 * `useShallow` from 'zustand/react/shallow'.
 */
import { useMemo } from 'react'
import { useApp, meIdFor } from './index'
import { daysUntil } from '@/lib/dates'
import {
  ME_CLIENT_ID,
  ME_DESIGNER_ID,
  type Client,
  type Conversation,
  type Designer,
  type DisciplineFilter,
  type Job,
  type Message,
  type Role,
} from './types'

export const useRole = () => useApp((s) => s.settings.role)
export const useDiscipline = () => useApp((s) => s.settings.discipline)
export const useSettings = () => useApp((s) => s.settings)
export const useMeId = () => useApp((s) => meIdFor(s.settings.role))

export function useMe(): { role: Role; id: string; designer?: Designer; client?: Client; name: string; avatarSeed: string } {
  const role = useRole()
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  return useMemo(() => {
    const designer = designers.find((d) => d.id === ME_DESIGNER_ID)
    const client = clients.find((c) => c.id === ME_CLIENT_ID)
    return role === 'client'
      ? { role, id: ME_CLIENT_ID, designer, client, name: client?.contactName ?? 'Ali', avatarSeed: 'ali' }
      : { role, id: ME_DESIGNER_ID, designer, client, name: designer?.name ?? 'Ali', avatarSeed: 'ali' }
  }, [role, designers, clients])
}

export function useDesigner(id: string | undefined) {
  const designers = useApp((s) => s.designers)
  return useMemo(() => designers.find((d) => d.id === id), [designers, id])
}

export function useClient(id: string | undefined) {
  const clients = useApp((s) => s.clients)
  return useMemo(() => clients.find((c) => c.id === id), [clients, id])
}

/** Designer or client by id — whichever exists. */
export function usePerson(id: string | undefined): { kind: 'designer'; data: Designer } | { kind: 'client'; data: Client } | undefined {
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  return useMemo(() => {
    const d = designers.find((x) => x.id === id)
    if (d) return { kind: 'designer' as const, data: d }
    const c = clients.find((x) => x.id === id)
    if (c) return { kind: 'client' as const, data: c }
    return undefined
  }, [designers, clients, id])
}

export function personName(p: Designer | Client | undefined) {
  if (!p) return 'Unknown'
  return 'contactName' in p ? p.name : p.name
}

export function useJob(id: string | undefined) {
  const jobs = useApp((s) => s.jobs)
  return useMemo(() => jobs.find((j) => j.id === id), [jobs, id])
}

export function matchesDiscipline(d: DisciplineFilter, job: Pick<Job, 'discipline'>) {
  return d === 'all' || job.discipline === d
}

/** Jobs belonging to the active role, optionally filtered by the active discipline tab. */
export function useMyJobs(opts?: { ignoreDiscipline?: boolean; includeClosed?: boolean }) {
  const role = useRole()
  const discipline = useDiscipline()
  const jobs = useApp((s) => s.jobs)
  return useMemo(() => {
    const me = meIdFor(role)
    return jobs.filter(
      (j) =>
        (role === 'client' ? j.clientId === me : j.designerId === me) &&
        (opts?.ignoreDiscipline || matchesDiscipline(discipline, j)) &&
        (opts?.includeClosed !== false || !['declined', 'cancelled'].includes(j.status)),
    )
  }, [jobs, role, discipline, opts?.ignoreDiscipline, opts?.includeClosed])
}

/** The person on the other side of a job for the active role. */
export function counterpartId(job: Pick<Job, 'clientId' | 'designerId'>, role: Role) {
  return role === 'client' ? job.designerId : job.clientId
}

export type RiskLevel = 'low' | 'medium' | 'high'

/** Heuristic risk scoring used by dashboards & the AI card. */
export function jobRisk(job: Job): { level: RiskLevel; reason: string; score: number } {
  if (['approved', 'declined', 'cancelled'].includes(job.status)) return { level: 'low', reason: 'Closed', score: 0 }
  const days = daysUntil(job.dueAt)
  let score = 0
  let reason = 'On track'
  if (days < 0) {
    score += 70
    reason = `Overdue by ${Math.abs(days)}d`
  } else if (days <= 1 && job.progress < 80) {
    score += 55
    reason = `Due ${days === 0 ? 'today' : 'tomorrow'} at ${job.progress}%`
  } else if (days <= 3 && job.progress < 50) {
    score += 40
    reason = `${days} days left at ${job.progress}%`
  }
  if (job.blocker) {
    score += 30
    reason = job.blocker
  }
  if (job.status === 'requested' && Date.now() - new Date(job.createdAt).getTime() > 2 * 864e5) {
    score += 25
    reason = 'Awaiting designer response'
  }
  if (job.status === 'in_review' && job.deliveredAt && Date.now() - new Date(job.deliveredAt).getTime() > 2 * 864e5) {
    score += 25
    reason = 'Review pending for 2+ days'
  }
  if (job.revisions.length >= job.revisionLimit && job.status === 'revisions') {
    score += 20
    reason = 'Revision limit reached'
  }
  if (job.priority === 'urgent') score += 10
  const level: RiskLevel = score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low'
  return { level, reason, score }
}

/** Jobs that need the current user's attention, highest risk first. */
export function useAttentionJobs() {
  const role = useRole()
  const jobs = useMyJobs({ includeClosed: false })
  return useMemo(() => {
    const scored = jobs
      .filter((j) => !['approved', 'declined', 'cancelled'].includes(j.status))
      .map((j) => {
        const risk = jobRisk(j)
        // things waiting on *me*
        const waitingOnMe =
          role === 'client'
            ? j.status === 'in_review' || j.counterOffer?.status === 'pending'
            : j.status === 'requested' || j.status === 'revisions'
        return { job: j, risk, waitingOnMe }
      })
      .filter((x) => x.risk.level !== 'low' || x.waitingOnMe)
    return scored.sort((a, b) => Number(b.waitingOnMe) - Number(a.waitingOnMe) || b.risk.score - a.risk.score)
  }, [jobs, role])
}

export interface ConversationView {
  conversation: Conversation
  counterpart: Designer | Client | undefined
  counterpartId: string
  last: Message | undefined
  unread: number
  messages: Message[]
}

/** Conversations for the active role with counterpart, last message and unread count. */
export function useConversations(opts?: { includeArchived?: boolean }): ConversationView[] {
  const role = useRole()
  const conversations = useApp((s) => s.conversations)
  const messages = useApp((s) => s.messages)
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  return useMemo(() => {
    const me = meIdFor(role)
    const byConv = new Map<string, Message[]>()
    for (const m of messages) {
      const arr = byConv.get(m.conversationId)
      if (arr) arr.push(m)
      else byConv.set(m.conversationId, [m])
    }
    return conversations
      .filter((c) => (role === 'client' ? c.clientId === me : c.designerId === me))
      .filter((c) => opts?.includeArchived || !c.archived)
      .map((c) => {
        const msgs = (byConv.get(c.id) ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        const otherId = role === 'client' ? c.designerId : c.clientId
        const counterpart = role === 'client' ? designers.find((d) => d.id === otherId) : clients.find((x) => x.id === otherId)
        const readAt = c.lastReadAt[me] ?? ''
        const unread = msgs.filter((m) => m.senderId !== me && m.createdAt > readAt).length
        return { conversation: c, counterpart, counterpartId: otherId, last: msgs[msgs.length - 1], unread, messages: msgs }
      })
      .sort(
        (a, b) =>
          Number(b.conversation.pinned) - Number(a.conversation.pinned) ||
          (b.last?.createdAt ?? b.conversation.createdAt).localeCompare(a.last?.createdAt ?? a.conversation.createdAt),
      )
  }, [conversations, messages, designers, clients, role, opts?.includeArchived])
}

export function useUnreadMessages() {
  const convs = useConversations()
  return useMemo(() => convs.reduce((n, c) => n + (c.conversation.muted ? 0 : c.unread), 0), [convs])
}

export function useMyNotifications() {
  const role = useRole()
  const notifications = useApp((s) => s.notifications)
  return useMemo(() => notifications.filter((n) => n.role === role), [notifications, role])
}

/** Matches for the active role, with the matched profile. */
export function useMyMatches() {
  const role = useRole()
  const matches = useApp((s) => s.matches)
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  return useMemo(() => {
    if (role === 'client')
      return matches
        .filter((m) => m.clientId === ME_CLIENT_ID)
        .map((m) => ({ match: m, designer: designers.find((d) => d.id === m.designerId), client: undefined as Client | undefined }))
        .filter((x) => x.designer)
    return matches
      .filter((m) => m.designerId === ME_DESIGNER_ID)
      .map((m) => ({ match: m, client: clients.find((c) => c.id === m.clientId), designer: undefined as Designer | undefined }))
      .filter((x) => x.client)
  }, [matches, designers, clients, role])
}

/** Deterministic 0–100 compatibility score between Ali (current role) and a profile. */
export function matchScore(profile: Designer | Client, role: Role, discipline: DisciplineFilter = 'all'): number {
  let h = 0
  for (const ch of profile.id) h = (h * 33 + ch.charCodeAt(0)) >>> 0
  let score = 62 + (h % 30)
  if ('primary' in profile) {
    if (discipline !== 'all' && profile.disciplines.includes(discipline)) score += 6
    if (profile.availability === 'available') score += 3
    if (profile.topRated) score += 2
  } else {
    if (discipline !== 'all' && profile.disciplinesNeeded.includes(discipline)) score += 6
    if (profile.paymentVerified) score += 3
  }
  void role
  return Math.min(99, score)
}

/**
 * Network ("My designers" / "My clients") derived data.
 * Pure helpers + hooks that select raw store slices and derive with useMemo.
 */
import { useMemo } from 'react'
import { useApp } from '@/store'
import { useConversations, useDiscipline, useRole, type ConversationView } from '@/store/selectors'
import { ME_CLIENT_ID, ME_DESIGNER_ID, type Asset, type Job, type Match, type MediaRef, type Message, type Role } from '@/store/types'
import { disciplinesOf, pairForPerson, personOf, type Person } from '@/features/discover/model'

export const CLOSED: Job['status'][] = ['approved', 'declined', 'cancelled']
export const isActiveJob = (j: Job) => !CLOSED.includes(j.status)

export interface NetworkEntry {
  match: Match
  person: Person
  conv?: ConversationView
  jobs: Job[]
  activeJobs: number
  /** Last activity (message or match) for "recent" sorting. */
  lastAt: string
}

/** Jobs between Ali (in whichever role fits the person) and this person. */
export function jobsWith(jobs: Job[], p: Person): Job[] {
  const { clientId, designerId } = pairForPerson(p)
  return jobs.filter((j) => j.clientId === clientId && j.designerId === designerId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** All matches of the active role with person, chat and jobs. Discipline tab applied. */
export function useNetworkEntries() {
  const role = useRole()
  const discipline = useDiscipline()
  const matches = useApp((s) => s.matches)
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const jobs = useApp((s) => s.jobs)
  const convs = useConversations({ includeArchived: true })

  return useMemo(() => {
    const convBy = new Map(convs.map((c) => [c.counterpartId, c]))
    const out: NetworkEntry[] = []
    for (const m of matches) {
      if (role === 'client' ? m.clientId !== ME_CLIENT_ID : m.designerId !== ME_DESIGNER_ID) continue
      const raw = role === 'client' ? designers.find((d) => d.id === m.designerId) : clients.find((c) => c.id === m.clientId)
      if (!raw) continue
      const person = personOf(raw)
      if (discipline !== 'all' && !disciplinesOf(person).includes(discipline)) continue
      const conv = convBy.get(raw.id)
      const js = jobsWith(jobs, person)
      const lastAt = [m.createdAt, conv?.last?.createdAt ?? ''].sort().pop()!
      out.push({ match: m, person, conv, jobs: js, activeJobs: js.filter(isActiveJob).length, lastAt })
    }
    return out
  }, [matches, designers, clients, jobs, convs, role, discipline])
}

/**
 * Typical (median) time the counterpart took to answer one of Ali's messages,
 * in hours, measured from real chat history. Falls back to the designers'
 * profile value when there is no back-and-forth yet.
 */
export function avgReplyHours(entries: NetworkEntry[], messages: Message[], role: Role): number | null {
  const me = role === 'client' ? ME_CLIENT_ID : ME_DESIGNER_ID
  const byConv = new Map<string, Message[]>()
  for (const m of messages) {
    const list = byConv.get(m.conversationId)
    if (list) list.push(m)
    else byConv.set(m.conversationId, [m])
  }
  const deltas: number[] = []
  for (const e of entries) {
    if (!e.conv) continue
    const msgs = (byConv.get(e.conv.conversation.id) ?? []).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    let waitingSince: number | null = null
    for (const m of msgs) {
      if (m.senderId === 'system') continue
      if (m.senderId === me) waitingSince ??= new Date(m.createdAt).getTime()
      else if (waitingSince !== null) {
        deltas.push((new Date(m.createdAt).getTime() - waitingSince) / 36e5)
        waitingSince = null
      }
    }
  }
  // median of real replies (gaps over 3 days are new threads, not replies)
  const replies = deltas.filter((d) => d >= 0 && d <= 72).sort((a, b) => a - b)
  if (replies.length) {
    const mid = Math.floor(replies.length / 2)
    return replies.length % 2 ? replies[mid] : (replies[mid - 1] + replies[mid]) / 2
  }
  const ds = entries.filter((e) => e.person.kind === 'designer').map((e) => (e.person.kind === 'designer' ? e.person.data.responseTimeHrs : 0))
  return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null
}

export function fmtHours(h: number | null): { value: number; unit: 'm' | 'h' } {
  if (h === null) return { value: 0, unit: 'h' }
  if (h < 1) return { value: Math.max(1, Math.round(h * 60)), unit: 'm' }
  return { value: Math.round(h * 10) / 10, unit: 'h' }
}

export interface SharedFile {
  id: string
  name: string
  kind: Asset['kind'] | 'delivery'
  size: number
  media: MediaRef
  jobId: string
  jobTitle: string
  addedAt: string
  addedBy: string
}

/** Every asset and delivered file exchanged in these jobs, newest first. */
export function filesOf(jobs: Job[]): SharedFile[] {
  const out: SharedFile[] = []
  for (const j of jobs) {
    for (const a of j.assets) out.push({ id: a.id, name: a.name, kind: a.kind, size: a.size, media: a.media, jobId: j.id, jobTitle: j.title, addedAt: a.addedAt, addedBy: a.addedBy })
    for (const v of j.versions)
      v.media.forEach((m, i) =>
        out.push({
          id: `${v.id}-${i}`,
          name: m.kind === 'file' ? m.name : `${j.id} · v${v.version} — ${i + 1}`,
          kind: 'delivery',
          size: m.kind === 'file' ? m.size : 0,
          media: m,
          jobId: j.id,
          jobTitle: j.title,
          addedAt: v.submittedAt,
          addedBy: j.designerId,
        }),
      )
  }
  return out.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
}

/** Undecided profiles that already like Ali (they'd match on a like back). */
export function useLikesYou() {
  const role = useRole()
  const discipline = useDiscipline()
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const decisions = useApp((s) => s.decisions)
  const matches = useApp((s) => s.matches)
  return useMemo(() => {
    const pool = role === 'client' ? designers.filter((d) => d.id !== ME_DESIGNER_ID).map(personOf) : clients.filter((c) => c.id !== ME_CLIENT_ID).map(personOf)
    return pool.filter((p) => {
      if (!p.data.interestedInYou) return false
      if (decisions[role][p.data.id]) return false
      const { clientId, designerId } = pairForPerson(p)
      if (matches.some((m) => m.clientId === clientId && m.designerId === designerId)) return false
      return discipline === 'all' || disciplinesOf(p).includes(discipline)
    })
  }, [role, discipline, designers, clients, decisions, matches])
}

/** Liked (or super liked) but no match yet. */
export function usePendingLikes() {
  const role = useRole()
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const decisions = useApp((s) => s.decisions)
  const matches = useApp((s) => s.matches)
  return useMemo(() => {
    const out: { person: Person; decision: 'like' | 'super' }[] = []
    for (const [id, d] of Object.entries(decisions[role])) {
      if (d === 'pass') continue
      const raw = role === 'client' ? designers.find((x) => x.id === id) : clients.find((x) => x.id === id)
      if (!raw) continue
      const p = personOf(raw)
      const { clientId, designerId } = pairForPerson(p)
      if (matches.some((m) => m.clientId === clientId && m.designerId === designerId)) continue
      out.push({ person: p, decision: d })
    }
    return out
  }, [role, designers, clients, decisions, matches])
}

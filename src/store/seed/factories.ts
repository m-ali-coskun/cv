/**
 * Small builders that keep seed files readable. Dates are always relative to
 * "now" so the demo never looks stale: `ago(3)` = 3 days ago, `inDays(5)`,
 * `dayAt(2, 18)` = the day after tomorrow at 18:00 local time.
 *
 * The clock is frozen per seed build (`resetClock()`), so every record built in
 * one pass shares the same "now" and relative ordering is exact.
 */
import type {
  Annotation,
  Asset,
  CalendarEvent,
  Client,
  Conversation,
  DeliveryVersion,
  Designer,
  DisciplineId,
  Job,
  MediaRef,
  Message,
  MessageKind,
  Milestone,
  PortfolioItem,
  Review,
  RevisionRequest,
  ArtVariant,
  StyleGuide,
  TimelineEvent,
} from '../types'

let n = 0
export const sid = (prefix: string) => `${prefix}${(++n).toString(36).padStart(3, '0')}`

const DAY = 864e5
const HOUR = 36e5
let NOW = Date.now()

/** Freeze "now" for a fresh seed build and restart the short-id counter. */
export function resetClock(at = Date.now()) {
  NOW = at
  n = 0
}
export const seedNow = () => NOW

/** ISO date `days` ago (fractional allowed), optional extra hours ago. */
export const ago = (days: number, hours = 0) => new Date(NOW - days * DAY - hours * HOUR).toISOString()
/** ISO date `days` in the future, optional extra hours. */
export const inDays = (days: number, hours = 0) => new Date(NOW + days * DAY + hours * HOUR).toISOString()
export const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()
/** Local calendar day `days` from today at a fixed clock time (negative = past). */
export function dayAt(days: number, hour: number, minute = 0) {
  const d = new Date(NOW)
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

const VARIANT_FOR: Record<DisciplineId, ArtVariant[]> = {
  visual: ['poster', 'photo', 'mesh', 'type'],
  video: ['video', 'photo', 'poster'],
  motion: ['video', 'blob3d', 'mesh'],
  illustration: ['illustration', 'pattern', 'poster'],
  brand: ['logo', 'type', 'pattern', 'poster'],
  uiux: ['ui', 'ui', 'mesh'],
  '3d': ['blob3d', 'blob3d', 'mesh'],
}

export function art(seed: string, discipline: DisciplineId, variant?: ArtVariant) {
  const list = VARIANT_FOR[discipline]
  const v = variant ?? list[Math.abs(hash(seed)) % list.length]
  return { kind: 'art' as const, seed, variant: v, discipline }
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

export function portfolio(
  designerId: string,
  items: { title: string; description: string; discipline: DisciplineId; year?: number; tags?: string[]; client?: string; variant?: ArtVariant; shots?: number }[],
): PortfolioItem[] {
  return items.map((it, i) => {
    const seed = `${designerId}-${i}-${it.title}`
    const shots = it.shots ?? 3
    return {
      id: `${designerId}-pf${i}`,
      title: it.title,
      description: it.description,
      discipline: it.discipline,
      year: it.year ?? 2026 - (i % 3),
      tags: it.tags ?? [],
      client: it.client,
      cover: art(seed, it.discipline, it.variant),
      media: Array.from({ length: shots }, (_, k) => art(`${seed}-${k}`, it.discipline, k === 0 ? it.variant : undefined)),
      likes: 40 + ((hash(seed) >>> 0) % 900),
      views: 800 + ((hash(seed + 'v') >>> 0) % 12000),
    }
  })
}

export function reviews(list: { name: string; company?: string; rating: number; text: string; daysAgo: number }[]): Review[] {
  return list.map((r, i) => ({
    id: sid('rw'),
    authorName: r.name,
    authorCompany: r.company,
    authorAvatarSeed: `${r.name}-${i}`,
    rating: r.rating,
    text: r.text,
    createdAt: ago(r.daysAgo),
  }))
}

export type DesignerSeed = Omit<Designer, 'portfolio' | 'reviews' | 'socials'> & {
  portfolio?: PortfolioItem[]
  reviews?: Review[]
  socials?: Designer['socials']
}

export function designer(d: DesignerSeed): Designer {
  return { portfolio: [], reviews: [], socials: [], ...d }
}

export function client(c: Client): Client {
  return c
}

/** Social links from compact `[label, handle-or-url]` pairs. */
export function socials(list: [string, string][]): Designer['socials'] {
  const base: Record<string, string> = {
    Behance: 'https://www.behance.net/',
    Dribbble: 'https://dribbble.com/',
    Instagram: 'https://www.instagram.com/',
    Vimeo: 'https://vimeo.com/',
    ArtStation: 'https://www.artstation.com/',
    LinkedIn: 'https://www.linkedin.com/in/',
    YouTube: 'https://www.youtube.com/@',
    X: 'https://x.com/',
  }
  return list.map(([label, v]) => ({ label, url: v.startsWith('http') ? v : `${base[label] ?? 'https://'}${v}` }))
}

export function styleGuide(p: Partial<StyleGuide>): StyleGuide {
  return { palette: [], fonts: [], mood: [], references: [], dos: [], donts: [], notes: '', ...p }
}

/** Style-guide references with job-scoped ids. */
export function refs(jobId: string, list: [label: string, url: string][]): StyleGuide['references'] {
  return list.map(([label, url], i) => ({ id: `${jobId}-rf${i + 1}`, label, url }))
}

export function asset(
  id: string,
  name: string,
  kind: Asset['kind'],
  addedBy: string,
  daysAgo: number,
  discipline: DisciplineId,
  opts?: { size?: number; url?: string; note?: string; variant?: ArtVariant },
): Asset {
  return {
    id,
    name,
    kind,
    size:
      opts?.size ??
      (kind === 'video' ? 84_000_000 : kind === 'link' ? 0 : kind === 'audio' ? 9_400_000 : kind === 'font' ? 380_000 : kind === 'archive' ? 64_000_000 : 2_300_000),
    media: opts?.url ? { kind: 'url', url: opts.url, name } : art(`${id}-${name}`, discipline, opts?.variant),
    addedBy,
    addedAt: ago(daysAgo),
    note: opts?.note,
  }
}

/** Deliverables with job-scoped ids: `['Label', true]` = done. */
export function deliverables(jobId: string, list: (string | [string, boolean])[]): Job['deliverables'] {
  return list.map((d, i) => {
    const [label, done] = typeof d === 'string' ? [d, false] : d
    return { id: `${jobId}-dl${i + 1}`, label, done }
  })
}

/** Milestones with job-scoped ids. */
export function milestones(jobId: string, list: [label: string, amount: number, dueAt: string, status: Milestone['status']][]): Milestone[] {
  return list.map(([label, amount, dueAt, status], i) => ({ id: `${jobId}-ms${i + 1}`, label, amount, dueAt, status }))
}

/** Timeline (newest first) with job-scoped ids. */
export function timeline(
  jobId: string,
  list: [kind: TimelineEvent['kind'], at: string, actorId: string, text: string, meta?: TimelineEvent['meta']][],
): TimelineEvent[] {
  return list.map(([kind, at, actorId, text, meta], i) => ({ id: `${jobId}-t${list.length - i}`, kind, at, actorId, text, meta }))
}

/** A delivered version with job-scoped annotation ids. */
export function version(
  jobId: string,
  num: number,
  v: {
    note: string
    at: string
    status: DeliveryVersion['status']
    media: MediaRef[]
    pins?: [x: number, y: number, mediaIndex: number, text: string, authorId: string, at: string, resolved: boolean][]
  },
): DeliveryVersion {
  const id = `v-${jobId.replace(/\D/g, '')}-${num}`
  const annotations: Annotation[] = (v.pins ?? []).map(([x, y, mediaIndex, text, authorId, at, resolved], i) => ({
    id: `${id}-an${i + 1}`,
    x,
    y,
    mediaIndex,
    text,
    authorId,
    createdAt: at,
    resolved,
  }))
  return { id, version: num, note: v.note, media: v.media, submittedAt: v.at, status: v.status, annotations }
}

/** A revision request tied to a version: `items` as `['text', done]`. */
export function revision(
  jobId: string,
  num: number,
  r: { versionNum?: number; at: string; by: string; summary: string; items: [string, boolean][]; status: RevisionRequest['status'] },
): RevisionRequest {
  const id = `rv-${jobId.replace(/\D/g, '')}-${num}`
  return {
    id,
    versionId: r.versionNum ? `v-${jobId.replace(/\D/g, '')}-${r.versionNum}` : undefined,
    requestedAt: r.at,
    requestedBy: r.by,
    summary: r.summary,
    items: r.items.map(([text, done], i) => ({ id: `${id}-i${i + 1}`, text, done })),
    status: r.status,
  }
}

/** Build a job with sensible defaults. `updatedAt` follows the newest timeline event. */
export function job(j: Partial<Job> & Pick<Job, 'id' | 'title' | 'clientId' | 'designerId' | 'discipline' | 'status' | 'dueAt'>): Job {
  const created = j.createdAt ?? ago(10)
  return {
    summary: '',
    description: '',
    priority: 'medium',
    createdAt: created,
    updatedAt: j.updatedAt ?? j.timeline?.[0]?.at ?? created,
    budget: 1200,
    currency: 'EUR',
    progress: 0,
    deliverables: [],
    styleGuide: styleGuide({}),
    assets: [],
    versions: [],
    revisions: [],
    revisionLimit: 3,
    timeline: [],
    milestones: [],
    tags: [],
    cover: art(j.id, j.discipline),
    timeTrackedMin: 0,
    starred: false,
    ...j,
  }
}

export type ScriptLine = {
  from: 'c' | 'd' | 'sys'
  text: string
  at: string
  kind?: MessageKind
  jobId?: string
  attachments?: Message['attachments']
  reactions?: Message['reactions']
  /** Stable key of this line, so other lines can reply to it. */
  key?: string
  /** `key` (or script index) of the message being replied to. */
  replyTo?: string | number
  edited?: boolean
  /** Voice note length in seconds (sets kind to 'voice'). */
  duration?: number
}

/** Conversation + messages from a compact script. */
export function thread(
  id: string,
  clientId: string,
  designerId: string,
  jobIds: string[],
  script: ScriptLine[],
  opts?: { pinned?: boolean; unreadFor?: 'c' | 'd'; unread?: number; muted?: boolean; archived?: boolean },
): { conversation: Conversation; messages: Message[] } {
  // Stable chronological order; `replyTo` indices are remapped to the sorted positions.
  const order = script.map((_, i) => i).sort((a, b) => script[a].at.localeCompare(script[b].at) || a - b)
  const pos = new Map(order.map((orig, sorted) => [orig, sorted]))
  const keyed = new Map(script.flatMap((m, i) => (m.key ? [[m.key, i] as const] : [])))
  const replyIndex = (r: string | number | undefined) => (typeof r === 'string' ? keyed.get(r) : r)
  const messages: Message[] = order.map((orig, i) => {
    const m = script[orig]
    return {
      id: `${id}-m${i}`,
      conversationId: id,
      senderId: m.from === 'c' ? clientId : m.from === 'd' ? designerId : 'system',
      kind: m.kind ?? (m.duration ? 'voice' : m.attachments?.length ? 'attachment' : 'text'),
      text: m.text,
      attachments: m.attachments,
      jobId: m.jobId,
      createdAt: m.at,
      reactions: m.reactions ?? [],
      ...(pos.has(replyIndex(m.replyTo) ?? -1) ? { replyToId: `${id}-m${pos.get(replyIndex(m.replyTo)!)}` } : {}),
      ...(m.edited ? { edited: true } : {}),
      ...(m.duration ? { duration: m.duration } : {}),
    }
  })
  const last = messages[messages.length - 1]?.createdAt ?? ago(1)
  // The side with unread messages last read just before the N-th newest message.
  const count = Math.max(1, Math.min(opts?.unread ?? 1, messages.length))
  const firstUnread = messages[messages.length - count]?.createdAt ?? last
  const before = new Date(new Date(firstUnread).getTime() - 60_000).toISOString()
  return {
    conversation: {
      id,
      clientId,
      designerId,
      jobIds,
      pinned: opts?.pinned ?? false,
      muted: opts?.muted ?? false,
      archived: opts?.archived ?? false,
      lastReadAt: {
        [clientId]: opts?.unreadFor === 'c' ? before : last,
        [designerId]: opts?.unreadFor === 'd' ? before : last,
      },
      createdAt: messages[0]?.createdAt ?? ago(5),
    },
    messages,
  }
}

export function calEvent(e: Omit<CalendarEvent, 'id'>): CalendarEvent {
  return { id: sid('ce'), ...e }
}

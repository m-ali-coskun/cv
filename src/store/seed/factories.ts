/**
 * Small builders that keep seed files readable. Dates are always relative to
 * "now" so the demo never looks stale: `ago(3)` = 3 days ago, `inDays(5)`.
 */
import type {
  Asset,
  CalendarEvent,
  Client,
  Conversation,
  Designer,
  DisciplineId,
  Job,
  Message,
  MessageKind,
  PortfolioItem,
  Review,
  ArtVariant,
  StyleGuide,
} from '../types'

let n = 0
export const sid = (prefix: string) => `${prefix}${(++n).toString(36).padStart(3, '0')}`

const DAY = 864e5
const HOUR = 36e5
/** ISO date `days` ago (fractional allowed), optional extra hours ago. */
export const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * HOUR).toISOString()
/** ISO date `days` in the future, optional extra hours. */
export const inDays = (days: number, hours = 0) => new Date(Date.now() + days * DAY + hours * HOUR).toISOString()
export const minsAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

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

export function styleGuide(p: Partial<StyleGuide>): StyleGuide {
  return { palette: [], fonts: [], mood: [], references: [], dos: [], donts: [], notes: '', ...p }
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
    size: opts?.size ?? (kind === 'video' ? 84_000_000 : kind === 'link' ? 0 : 2_300_000),
    media: opts?.url ? { kind: 'url', url: opts.url, name } : art(`${id}-${name}`, discipline, opts?.variant),
    addedBy,
    addedAt: ago(daysAgo),
    note: opts?.note,
  }
}

/** Build a job with sensible defaults. */
export function job(j: Partial<Job> & Pick<Job, 'id' | 'title' | 'clientId' | 'designerId' | 'discipline' | 'status' | 'dueAt'>): Job {
  const created = j.createdAt ?? ago(10)
  return {
    summary: '',
    description: '',
    priority: 'medium',
    createdAt: created,
    updatedAt: j.updatedAt ?? ago(0, 3),
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

/** Conversation + messages from a compact script. */
export function thread(
  id: string,
  clientId: string,
  designerId: string,
  jobIds: string[],
  script: { from: 'c' | 'd' | 'sys'; text: string; at: string; kind?: MessageKind; jobId?: string; attachments?: Message['attachments']; reactions?: Message['reactions'] }[],
  opts?: { pinned?: boolean; unreadFor?: 'c' | 'd'; muted?: boolean },
): { conversation: Conversation; messages: Message[] } {
  const messages: Message[] = script.map((m, i) => ({
    id: `${id}-m${i}`,
    conversationId: id,
    senderId: m.from === 'c' ? clientId : m.from === 'd' ? designerId : 'system',
    kind: m.kind ?? (m.attachments?.length ? 'attachment' : 'text'),
    text: m.text,
    attachments: m.attachments,
    jobId: m.jobId,
    createdAt: m.at,
    reactions: m.reactions ?? [],
  }))
  const last = messages[messages.length - 1]?.createdAt ?? ago(1)
  // the reader that has "unread" messages last read before the final message
  const before = new Date(new Date(last).getTime() - 60_000).toISOString()
  return {
    conversation: {
      id,
      clientId,
      designerId,
      jobIds,
      pinned: opts?.pinned ?? false,
      muted: opts?.muted ?? false,
      archived: false,
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

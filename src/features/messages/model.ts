import { differenceInCalendarDays, isToday, isYesterday } from 'date-fns'
import { fmt } from '@/lib/dates'
import { localeOf } from '@/lib/format'
import { hashString, prng } from '@/lib/random'
import type { TFn } from '@/i18n'
import type { Client, Designer, DisciplineFilter, Job, JobStatus, Lang, Message, MessageKind, Role } from '@/store/types'
import type { ConversationView } from '@/store/selectors'

/* ───────────────────────────── people ───────────────────────────── */

export type Person = Designer | Client

export const isDesignerP = (p: Person | undefined): p is Designer => !!p && 'primary' in p

/** One-line description under a name: designer headline / client contact. */
export function personLine(p: Person | undefined) {
  if (!p) return ''
  return isDesignerP(p) ? p.headline : `${p.contactName} · ${p.contactRole}`
}

/** Disciplines a counterpart works in (designer) or needs (client). */
export function personDisciplines(p: Person | undefined) {
  if (!p) return []
  return isDesignerP(p) ? p.disciplines : p.disciplinesNeeded
}

export function conversationMatchesDiscipline(view: ConversationView, d: DisciplineFilter, jobById: Map<string, Job>) {
  if (d === 'all') return true
  if (personDisciplines(view.counterpart).includes(d)) return true
  return view.conversation.jobIds.some((id) => jobById.get(id)?.discipline === d)
}

/* ───────────────────────────── presence ───────────────────────────── */

export type Presence = 'online' | 'away' | 'offline'

/**
 * Bots don't really have presence, so it is derived: typing or a message in
 * the last 20 minutes = online, otherwise a stable per-person pseudo state.
 */
export function presenceOf(id: string, lastFromThem: string | undefined, typing: boolean, now: number): Presence {
  if (typing) return 'online'
  if (lastFromThem && now - new Date(lastFromThem).getTime() < 20 * 60_000) return 'online'
  const h = hashString(id) % 5
  return h < 2 ? 'online' : h === 2 ? 'away' : 'offline'
}

/* ───────────────────────────── time ───────────────────────────── */

export function dayKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function dayLabel(iso: string, lang: Lang, t: TFn) {
  const d = new Date(iso)
  if (isToday(d)) return t('messages.day.today')
  if (isYesterday(d)) return t('messages.day.yesterday')
  const diff = differenceInCalendarDays(new Date(), d)
  if (diff > 0 && diff < 7) return fmt(d, 'EEEE', lang)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  const pattern = {
    en: sameYear ? 'EEEE, MMMM d' : 'MMMM d, yyyy',
    de: sameYear ? 'EEEE, d. MMMM' : 'd. MMMM yyyy',
    tr: sameYear ? 'd MMMM EEEE' : 'd MMMM yyyy',
  }[lang]
  return fmt(d, pattern, lang)
}

export const clock = (iso: string, lang: Lang) => fmt(iso, 'HH:mm', lang)

export function mmss(sec: number) {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const COUNTRY_TZ: Record<string, string> = {
  DE: 'Europe/Berlin',
  PT: 'Europe/Lisbon',
  BR: 'America/Sao_Paulo',
  CZ: 'Europe/Prague',
  JP: 'Asia/Tokyo',
  UK: 'Europe/London',
  GB: 'Europe/London',
  IT: 'Europe/Rome',
  SE: 'Europe/Stockholm',
  PL: 'Europe/Warsaw',
  AT: 'Europe/Vienna',
  NL: 'Europe/Amsterdam',
  NO: 'Europe/Oslo',
  CA: 'America/Toronto',
  IL: 'Asia/Jerusalem',
  AE: 'Asia/Dubai',
  IN: 'Asia/Kolkata',
  FR: 'Europe/Paris',
  MX: 'America/Mexico_City',
  KR: 'Asia/Seoul',
  NG: 'Africa/Lagos',
  SG: 'Asia/Singapore',
  HR: 'Europe/Zagreb',
  ES: 'Europe/Madrid',
  FI: 'Europe/Helsinki',
  IE: 'Europe/Dublin',
  DK: 'Europe/Copenhagen',
  US: 'America/New_York',
  ZA: 'Africa/Johannesburg',
  CH: 'Europe/Zurich',
  BE: 'Europe/Brussels',
  TR: 'Europe/Istanbul',
  AU: 'Australia/Sydney',
}
const CITY_TZ: Record<string, string> = {
  'Los Angeles': 'America/Los_Angeles',
  'San Francisco': 'America/Los_Angeles',
  Seattle: 'America/Los_Angeles',
  Austin: 'America/Chicago',
  Chicago: 'America/Chicago',
  Denver: 'America/Denver',
  Vancouver: 'America/Vancouver',
}

/** Best-effort IANA zone from "City, CC". */
export function tzOf(location: string | undefined): string | undefined {
  if (!location) return undefined
  const [city = '', cc = ''] = location.split(',').map((s) => s.trim())
  return CITY_TZ[city] ?? COUNTRY_TZ[cc.toUpperCase()]
}

function wallMinutes(now: Date, zone?: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now)
  const g = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'))
}

/** Local time of a counterpart + hour difference to the viewer. */
export function localClock(tz: string, lang: Lang, now = new Date()) {
  try {
    const time = new Intl.DateTimeFormat(localeOf(lang), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz }).format(now)
    const diffH = Math.round(((wallMinutes(now, tz) - wallMinutes(now)) / 3_600_000) * 2) / 2
    const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(now)) % 24
    return { time, diffH, night: hour < 7 || hour >= 22, hour }
  } catch {
    return undefined
  }
}

/* ───────────────────────────── thread layout ───────────────────────────── */

export const CENTER_KINDS = new Set<MessageKind>(['status', 'system'])
export const CARD_KINDS = new Set<MessageKind>(['brief', 'revision', 'delivery', 'approval'])
const GROUP_GAP = 5 * 60_000

export const isCenter = (m: Message) => CENTER_KINDS.has(m.kind) || m.senderId === 'system'

export type ThreadItem =
  | { type: 'day'; key: string; iso: string }
  | { type: 'unread'; key: string }
  | { type: 'msg'; key: string; msg: Message; own: boolean; first: boolean; last: boolean; center: boolean; index: number }

/**
 * Turns a flat message list into render items: day separators, the
 * "new messages" divider and consecutive-sender grouping (first/last flags
 * drive names, avatars and bubble tails).
 */
export function buildThread(messages: Message[], meId: string, unreadFromId?: string | null): ThreadItem[] {
  const out: ThreadItem[] = []
  let prevDay = ''
  const joins = (a: Message | undefined, b: Message | undefined) =>
    !!a &&
    !!b &&
    a.senderId === b.senderId &&
    dayKey(a.createdAt) === dayKey(b.createdAt) &&
    !isCenter(a) &&
    !isCenter(b) &&
    !CARD_KINDS.has(a.kind) &&
    !CARD_KINDS.has(b.kind) &&
    Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < GROUP_GAP &&
    b.id !== unreadFromId
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    const dk = dayKey(m.createdAt)
    if (dk !== prevDay) {
      out.push({ type: 'day', key: `day-${dk}`, iso: m.createdAt })
      prevDay = dk
    }
    if (m.id === unreadFromId) out.push({ type: 'unread', key: 'unread-divider' })
    out.push({
      type: 'msg',
      key: m.id,
      msg: m,
      own: m.senderId === meId,
      first: !joins(messages[i - 1], m),
      last: !joins(m, messages[i + 1]),
      center: isCenter(m),
      index: i,
    })
  }
  return out
}

/* ───────────────────────────── text ───────────────────────────── */

export type Token = { t: 'text' | 'link' | 'job'; v: string }
const TOKEN_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])|\b(DT-\d{4})\b/g

/** Splits message text into plain text, links and job-id mentions. */
export function tokenize(text: string): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of text.matchAll(TOKEN_RE)) {
    const i = m.index ?? 0
    if (i > last) out.push({ t: 'text', v: text.slice(last, i) })
    out.push(m[1] ? { t: 'link', v: m[1] } : { t: 'job', v: m[2]! })
    last = i + m[0].length
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) })
  return out
}

const STATUS_BY_LABEL: Record<string, JobStatus> = {
  requested: 'requested',
  queued: 'queued',
  'in progress': 'in_progress',
  'final touches': 'final_touches',
  'in review': 'in_review',
  revisions: 'revisions',
  approved: 'approved',
  declined: 'declined',
  cancelled: 'cancelled',
}

/** "Status update: Queued → In progress" → job statuses (for translated badges). */
export function parseStatus(text: string): { from?: JobStatus; to?: JobStatus; fromLabel: string; toLabel: string } | null {
  const m = text.match(/^Status update:\s*(.+?)\s*→\s*(.+?)\s*$/)
  if (!m) return null
  return {
    fromLabel: m[1],
    toLabel: m[2],
    from: STATUS_BY_LABEL[m[1].toLowerCase()],
    to: STATUS_BY_LABEL[m[2].toLowerCase()],
  }
}

export function parseRevision(text: string) {
  const lines = text.split('\n')
  return {
    summary: lines[0] ?? '',
    items: lines
      .slice(1)
      .map((l) => l.replace(/^[•\-*]\s*/, '').trim())
      .filter(Boolean),
  }
}

export function parseDelivery(text: string) {
  const [head = '', ...rest] = text.split('\n')
  const v = head.match(/v(\d+)/)
  return { version: v ? Number(v[1]) : undefined, head, note: rest.join('\n').trim() }
}

export function parseBrief(text: string) {
  const [head = '', ...rest] = text.split('\n')
  return { title: head.replace(/^New brief:\s*/i, ''), summary: rest.join('\n').trim() }
}

/** Short single-line preview for the conversation list. */
export function previewOf(m: Message, t: TFn): string {
  const first = m.text.split('\n')[0] ?? ''
  switch (m.kind) {
    case 'attachment': {
      const n = m.attachments?.length ?? 0
      const files = t('messages.preview.files', { count: n })
      return first ? `📎 ${first}` : `📎 ${files}`
    }
    case 'voice':
      return `🎤 ${t('messages.preview.voice')} · ${mmss(m.duration ?? 0)}`
    case 'brief':
      return `📝 ${t('messages.preview.brief')}: ${parseBrief(m.text).title}`
    case 'revision':
      return `↺ ${t('messages.preview.revision')}: ${parseRevision(m.text).summary}`
    case 'delivery':
      return `📦 ${first}`
    case 'approval':
      return `✅ ${first.replace(/^Approved ✅\s*—?\s*/, '') || t('messages.card.approved')}`
    default:
      return first || (m.attachments?.length ? `📎 ${t('messages.preview.files', { count: m.attachments.length })}` : '')
  }
}

/** Plain text used for copy & search. */
export function searchableText(m: Message) {
  return m.text
}

/* ───────────────────────────── voice ───────────────────────────── */

/** Deterministic waveform bar heights (0..1) for a voice message. */
export function waveform(seed: string, n = 34) {
  const r = prng(seed)
  return Array.from({ length: n }, (_, i) => {
    const env = Math.sin((i / (n - 1)) * Math.PI) * 0.55 + 0.45
    return Math.max(0.16, Math.min(1, r.range(0.2, 1) * env + 0.08))
  })
}

/* ───────────────────────────── composer ───────────────────────────── */

export const REACTIONS = ['👍', '❤️', '🔥', '😂', '🎉', '👀'] as const

export const EMOJI_GROUPS: { id: string; icon: string; emojis: string[] }[] = [
  {
    id: 'smileys',
    icon: '😀',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😎', '🤓', '🧐', '🤔', '🤨', '😐', '🙄', '😏', '😬', '😌', '😴', '🤯', '🥳', '😮', '😲', '🥹', '😭', '😤', '😱', '🫠', '🤗', '🫡', '🤫'],
  },
  {
    id: 'gestures',
    icon: '👍',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏', '🙌', '🫶', '👐', '🤝', '🙏', '💪', '👀', '👋', '✋', '🤙', '👉', '👈', '☝️', '✍️', '💅', '🧠'],
  },
  {
    id: 'hearts',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💗', '💓', '💞', '💕', '💯', '✨', '⭐', '🌟', '💫', '🔥', '⚡', '🌈', '☀️', '🌙', '🌸'],
  },
  {
    id: 'work',
    icon: '🎨',
    emojis: ['🎨', '🖌️', '✏️', '🖍️', '📐', '📏', '🖼️', '🎬', '🎞️', '📸', '🎥', '🎧', '🎵', '💻', '🖥️', '📱', '⌨️', '🖱️', '📁', '📎', '📌', '📝', '📦', '🚀', '⏰', '📅', '💡', '🔍', '🧩', '🛠️'],
  },
  {
    id: 'celebrate',
    icon: '🎉',
    emojis: ['🎉', '🎊', '🥂', '🍾', '🏆', '🥇', '🎁', '🎈', '🍕', '☕', '🍩', '🌮', '🍿', '🧁', '🍰', '🌱', '🌍', '🦄', '🐙', '🦊', '🐝', '🐶', '🐱', '🍀'],
  },
]

/**
 * Smart-reply chips. Seed/bot content is English-only, so replies are too —
 * they are message content, not UI chrome.
 */
export function quickReplies(role: Role, last: Message | undefined, meId: string): string[] {
  const fromThem = !!last && last.senderId !== meId && last.senderId !== 'system'
  if (role === 'client') {
    if (fromThem && last.kind === 'delivery')
      return ['Love it — approving now ✅', 'Leaving a few notes on the delivery 📌', 'Can we try one more colour option?', 'Could you share the source files?']
    if (fromThem && last.kind === 'voice') return ['Thanks for the walkthrough! 🎧', 'Makes sense — go for it.', 'Can we jump on a quick call?']
    if (fromThem && last.attachments?.length) return ['These look great! 😍', 'Option B is my favourite.', 'Can I get these in higher resolution?']
    if (fromThem && last.kind === 'status') return ['Great, thanks for the update! 🙌', 'What’s the ETA on the next version?', 'Anything you need from me?']
    return ['Sounds good! 👍', 'What’s the ETA on the next version?', 'Can we hop on a quick call?', 'Could you share a progress update?', 'Thanks, appreciate it 🙏']
  }
  if (fromThem && last.kind === 'revision') return ['Got it — working on the changes now 🛠️', 'Thanks for the clear notes!', 'Quick question on the second point —']
  if (fromThem && last.kind === 'brief') return ['Thanks for the brief! Reviewing it now.', 'Happy to take this on 🙌', 'Could you share the brand assets?']
  if (fromThem && last.kind === 'approval') return ['Thank you so much! 💛', 'Loved working on this — anytime!', 'Would you mind leaving a short review?']
  if (fromThem && last.attachments?.length) return ['Thanks, got the files! 📁', 'These are super helpful.', 'Can you send the originals too?']
  return ['On it! 🚀', 'Sharing a progress update shortly.', 'Could you send the brand assets?', 'v2 will be ready tomorrow.', 'Thanks! 🙏']
}

/** Statuses that make the shortcut actions meaningful. */
export const CAN_REQUEST_REVISION: JobStatus[] = ['in_review', 'revisions']
export const CAN_DELIVER: JobStatus[] = ['in_progress', 'final_touches', 'revisions', 'in_review']
export const CLOSED: JobStatus[] = ['approved', 'declined', 'cancelled']

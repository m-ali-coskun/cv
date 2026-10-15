import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  Archive,
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  FileText,
  Film,
  Flag,
  Handshake,
  Image as ImageIcon,
  Link2,
  MessageSquareText,
  Music,
  PackageCheck,
  Paperclip,
  Repeat2,
  Sparkles,
  Type,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { GenerativeArt } from '@/components/art/GenerativeArt'
import { loadFileUrl } from '@/lib/files'
import { localeOf } from '@/lib/format'
import type { AssetKind, Job, JobStatus, Lang, MediaRef, TimelineKind } from '@/store/types'

/** The happy-path pipeline shown in the status journey. */
export const JOURNEY: JobStatus[] = ['requested', 'queued', 'in_progress', 'final_touches', 'in_review', 'revisions', 'approved']
/** Statuses a designer can set directly while working. */
export const WORK_STATUSES: JobStatus[] = ['queued', 'in_progress', 'final_touches']
export const CLOSED: JobStatus[] = ['approved', 'declined', 'cancelled']

export const isClosed = (s: JobStatus) => CLOSED.includes(s)
export const isActiveWork = (s: JobStatus) => WORK_STATUSES.includes(s)

/** Journey steps for a job — the revisions loop only shows when it happened. */
export function journeySteps(job: Job): JobStatus[] {
  const withRevisions = job.revisions.length > 0 || job.status === 'revisions'
  return JOURNEY.filter((s) => s !== 'revisions' || withRevisions)
}

/** Position of the job inside its journey (revisions sits between review & approval). */
export function journeyIndex(job: Job, steps: JobStatus[]): number {
  if (job.status === 'declined' || job.status === 'cancelled') return -1
  return Math.max(0, steps.indexOf(job.status))
}

/** When did the job first reach `status`? Derived from the timeline. */
export function reachedAt(job: Job, status: JobStatus): string | undefined {
  const asc = [...job.timeline].sort((a, b) => a.at.localeCompare(b.at))
  const byMeta = asc.find((e) => e.meta?.to === status)?.at
  switch (status) {
    case 'requested':
      return job.createdAt
    case 'queued':
      return asc.find((e) => e.kind === 'accepted')?.at ?? byMeta
    case 'in_progress':
      return job.startedAt ?? byMeta
    case 'in_review':
      return asc.find((e) => e.kind === 'delivery')?.at ?? byMeta
    case 'revisions':
      return asc.find((e) => e.kind === 'revision')?.at ?? byMeta
    case 'approved':
      return job.approvedAt ?? byMeta
    default:
      return byMeta
  }
}

/** Seconds logged on a job, including a running timer. */
export function trackedSeconds(job: Pick<Job, 'timeTrackedMin' | 'timerStartedAt'>, now = Date.now()) {
  const running = job.timerStartedAt ? Math.max(0, (now - new Date(job.timerStartedAt).getTime()) / 1000) : 0
  return Math.max(0, Math.round(job.timeTrackedMin * 60 + running))
}

/** "2d 4h" / "5h 12m" / "12m" with translatable unit letters. */
export function durationLabel(minutes: number, units: { d: string; h: string; m: string }) {
  const m = Math.max(0, Math.round(minutes))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  const mm = m % 60
  if (d > 0) return `${d}${units.d} ${h}${units.h}`
  if (h > 0) return `${h}${units.h} ${String(mm).padStart(2, '0')}${units.m}`
  return `${mm}${units.m}`
}

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0')

export function hms(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`
}

/** Remaining (or overdue) time split for the live countdown. */
export function countdown(dueAt: string, now = Date.now()) {
  const diff = new Date(dueAt).getTime() - now
  const overdue = diff < 0
  const abs = Math.abs(diff) / 1000
  const days = Math.floor(abs / 86400)
  const rest = abs - days * 86400
  return { overdue, days, clock: hms(rest), urgent: !overdue && diff < 2 * 864e5 }
}

export const ASSET_ICON: Record<AssetKind, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  doc: FileText,
  font: Type,
  link: Link2,
  archive: Archive,
}

/** Folder tints per asset kind (independent of the discipline accent). */
export const ASSET_COLOR: Record<AssetKind, string> = {
  image: '#5B8DEF',
  video: '#9B6BFF',
  audio: '#FF7A59',
  doc: '#F5B83D',
  font: '#2FB36B',
  link: '#3CC8E8',
  archive: '#8B8B93',
}

export const TIMELINE_ICON: Record<TimelineKind, LucideIcon> = {
  created: Sparkles,
  accepted: Handshake,
  declined: XCircle,
  status: Flag,
  asset: Paperclip,
  delivery: PackageCheck,
  revision: Repeat2,
  approved: BadgeCheck,
  deadline: CalendarClock,
  comment: MessageSquareText,
  payment: CircleDollarSign,
  counter: CalendarClock,
}

/** Timeline filter groups. */
export const TIMELINE_GROUPS: Record<string, TimelineKind[]> = {
  all: [],
  progress: ['created', 'accepted', 'declined', 'status', 'counter', 'deadline', 'approved'],
  work: ['delivery', 'revision', 'asset'],
  comments: ['comment'],
  money: ['payment'],
}

export function paragraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Best-effort fallback stack so a font preview still feels right without the font installed. */
export function fontStack(name: string) {
  const n = name.toLowerCase()
  if (/mono|code|jetbrains/.test(n)) return `'${name}', ui-monospace, 'Geist Mono Variable', monospace`
  if (/serif|recoleta|canela|editorial|freight|alpina|ogg|cormorant|garamond|caslon|playfair|lettered/.test(n) && !/sans/.test(n))
    return `'${name}', 'Iowan Old Style', 'Times New Roman', Georgia, serif`
  if (/druk|wide|display|condensed|ironvale/.test(n)) return `'${name}', 'Arial Black', Impact, 'Geist Variable', sans-serif`
  return `'${name}', 'Geist Variable', ui-sans-serif, system-ui, sans-serif`
}

export const FONT_SUGGESTIONS = [
  'Inter',
  'Geist',
  'Söhne',
  'GT America',
  'Neue Montreal',
  'Satoshi',
  'Canela',
  'Recoleta',
  'Editorial New',
  'Druk Wide',
  'JetBrains Mono',
  'IBM Plex Sans',
  'Playfair Display',
  'Space Grotesk',
]
export const MOOD_SUGGESTIONS = [
  'Minimal',
  'Playful',
  'Bold',
  'Retro',
  'Elegant',
  'Warm',
  'Techy',
  'Organic',
  'Luxurious',
  'Editorial',
  'Brutalist',
  'Calm',
  'Sunny',
  'Cinematic',
]

/** Stable pleasant colour from a string (reference favicons, initials). */
export function hueColor(text: string) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360
  return `hsl(${h} 70% 52%)`
}

// ─────────────── downloads ───────────────

function clickDownload(href: string, name: string, newTab = false) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  if (newTab) {
    a.target = '_blank'
    a.rel = 'noopener'
  }
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  clickDownload(url, name)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Download any MediaRef: uploads from IndexedDB, links in a new tab, generated art as SVG. */
export async function downloadMedia(media: MediaRef, fallbackName = 'designtab-file') {
  if (media.kind === 'file') {
    const url = await loadFileUrl(media.fileId)
    if (url) clickDownload(url, media.name)
    return !!url
  }
  if (media.kind === 'url') {
    clickDownload(media.url, media.name ?? '', true)
    return true
  }
  const markup = renderToStaticMarkup(
    createElement(GenerativeArt, { seed: media.seed, variant: media.variant, discipline: media.discipline, playBadge: false }),
  ).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" ')
  downloadBlob(new Blob([markup], { type: 'image/svg+xml' }), `${fallbackName.replace(/\.[a-z0-9]+$/i, '')}.svg`)
  return true
}

/** Plain-text/markdown export of the brief. */
export function briefMarkdown(job: Job, names: { client: string; designer: string }, money: string, due: string) {
  const sg = job.styleGuide
  const list = (items: string[]) => items.map((i) => `- ${i}`).join('\n')
  return [
    `# ${job.title}`,
    `${job.id} · ${names.client} → ${names.designer}`,
    '',
    `**Budget:** ${money}  `,
    `**Due:** ${due}  `,
    `**Priority:** ${job.priority} · **Revisions:** ${job.revisionLimit}`,
    '',
    `> ${job.summary}`,
    '',
    job.description,
    '',
    '## Deliverables',
    job.deliverables.map((d) => `- [${d.done ? 'x' : ' '}] ${d.label}`).join('\n'),
    '',
    '## Style guide',
    `**Palette:** ${sg.palette.join(', ')}`,
    `**Fonts:** ${sg.fonts.join(', ')}`,
    `**Mood:** ${sg.mood.join(', ')}`,
    '',
    '### Do',
    list(sg.dos),
    '',
    "### Don't",
    list(sg.donts),
    sg.references.length ? `\n### References\n${sg.references.map((r) => `- [${r.label}](${r.url})`).join('\n')}` : '',
    sg.notes ? `\n### Notes\n${sg.notes}` : '',
    '',
    job.tags.length ? `Tags: ${job.tags.map((t) => `#${t}`).join(' ')}` : '',
  ].join('\n')
}

/** Currency without cents — keeps €720 and €1,680 visually consistent. */
export function moneyWhole(amount: number, currency: 'EUR' | 'USD', lang: Lang) {
  return new Intl.NumberFormat(localeOf(lang), { style: 'currency', currency, maximumFractionDigits: 0 }).format(Math.round(amount))
}

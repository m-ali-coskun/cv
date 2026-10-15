/**
 * Brief wizard — pure model: draft shape, catalogue data, validation,
 * pricing / timeline heuristics and the "brief quality" score.
 * Everything here is UI-free so the preview, steps and review share it.
 */
import { addDays, differenceInCalendarDays, format, setHours, setMinutes, startOfDay } from 'date-fns'
import type { Asset, Designer, DisciplineId, NewJobInput, Priority, StyleGuide } from '@/store/types'
import { DISCIPLINE_IDS } from '@/store/types'
import { uid } from '@/lib/ids'

// ─────────────────────────── steps ───────────────────────────

export const STEP_IDS = ['start', 'designer', 'project', 'deliverables', 'style', 'assets', 'review'] as const
export type StepId = (typeof STEP_IDS)[number]
export const STEP = {
  start: 0,
  designer: 1,
  project: 2,
  deliverables: 3,
  style: 4,
  assets: 5,
  review: 6,
} as const satisfies Record<StepId, number>

// ─────────────────────────── draft ───────────────────────────

export interface DraftDeliverable {
  id: string
  label: string
}

export interface BriefDraft {
  templateId: string | null
  designerId: string | null
  title: string
  summary: string
  description: string
  discipline: DisciplineId | null
  tags: string[]
  priority: Priority
  budget: number
  /** The client typed/slid a budget themselves — stop auto-suggesting. */
  budgetTouched: boolean
  dueAt: string | null
  revisionLimit: number
  deliverables: DraftDeliverable[]
  style: StyleGuide
  assets: Asset[]
}

export const emptyStyle = (): StyleGuide => ({ palette: [], fonts: [], mood: [], references: [], dos: [], donts: [], notes: '' })

export function emptyDraft(patch: Partial<BriefDraft> = {}): BriefDraft {
  return {
    templateId: null,
    designerId: null,
    title: '',
    summary: '',
    description: '',
    discipline: null,
    tags: [],
    priority: 'medium',
    budget: 1500,
    budgetTouched: false,
    dueAt: null,
    revisionLimit: 2,
    deliverables: [],
    style: emptyStyle(),
    assets: [],
    ...patch,
  }
}

/** Has the client actually written anything worth restoring? */
export function draftHasContent(d: BriefDraft) {
  return !!(
    d.title.trim() ||
    d.summary.trim() ||
    d.description.trim() ||
    d.deliverables.length ||
    d.style.palette.length ||
    d.style.references.length ||
    d.assets.length ||
    d.templateId
  )
}

export const deliverable = (label: string): DraftDeliverable => ({ id: uid('dv_'), label })

// ─────────────────────────── limits ───────────────────────────

export const LIMITS = {
  title: 80,
  summary: 140,
  description: 4000,
  budgetMin: 100,
  budgetMax: 25000,
  revisionsMin: 1,
  revisionsMax: 5,
  deliverables: 20,
} as const

// ─────────────────────────── catalogue ───────────────────────────

export const DELIVERABLE_SUGGESTIONS: Record<DisciplineId, string[]> = {
  visual: ['Key visual (master artwork)', 'Instagram feed posts ×6', 'Stories set ×4 (9:16)', 'Web hero banner', 'Paid social ads ×3 sizes', 'Email header', 'OOH poster (A0)', 'Layered source files'],
  video: ['16:9 master', '9:16 cut-down', '1:1 social cut', 'Subtitles SRT', 'Colour grade', 'Sound mix & music licence', 'Thumbnail options ×2', '15s teaser'],
  motion: ['5s logo sting', 'Lottie JSON for web', 'Transparent ProRes 4444', 'Explainer animation (60s)', 'Animated social posts ×3', 'Storyboard & styleframes', 'Sound design', 'After Effects project file'],
  illustration: ['Sketch round ×3 options', 'Final illustration (print)', 'Spot illustrations ×5', 'Book cover (full wrap)', 'Ebook cover 1600×2560', 'Print-ready CMYK PDF', 'Vector source (AI/SVG)', 'Social crops ×3'],
  brand: ['Logo suite (primary, secondary, mark)', 'Colour palette', 'Typography system', 'Brand guidelines PDF', 'Business card & letterhead', 'Social avatar & cover', 'Packaging dieline', 'Brand pattern'],
  uiux: ['User flow map', 'Lo-fi wireframes', 'Hi-fi screens (iOS + Android)', 'Interactive Figma prototype', 'Component library', 'Dev handoff specs', 'Usability test (5 users)', 'Design QA pass'],
  '3d': ['Hero render 4K', '360° turntable video', 'Exploded view', 'Lifestyle scenes ×3', 'Transparent PNG packshots', 'Material & lighting study', 'AR-ready GLB model', 'Source scene files'],
}

export const TAG_SUGGESTIONS: Record<DisciplineId, string[]> = {
  visual: ['campaign', 'social', 'key visual', 'retouching', 'OOH', 'launch', 'ads', 'retail'],
  video: ['youtube', 'documentary', 'reels', 'colour grade', 'interview', 'b-roll', 'subtitles', 'podcast'],
  motion: ['logo animation', 'lottie', 'explainer', '2D', 'kinetic type', 'UI motion', 'sound design', 'loop'],
  illustration: ['editorial', 'book cover', 'children', 'map', 'packaging art', 'character', 'spot art', 'mural'],
  brand: ['identity', 'packaging', 'rebrand', 'logo', 'guidelines', 'print', 'naming', 'stationery'],
  uiux: ['mobile app', 'onboarding', 'design system', 'web app', 'research', 'prototype', 'dashboard', 'accessibility'],
  '3d': ['product render', 'CGI', 'packshot', 'turntable', 'AR', 'lighting', 'industrial', 'animation'],
}

export const FONT_SUGGESTIONS = [
  'Geist',
  'Inter',
  'Söhne',
  'Helvetica Neue',
  'Neue Montreal',
  'Satoshi',
  'Space Grotesk',
  'DM Sans',
  'Clash Display',
  'Playfair Display',
  'DM Serif Display',
  'Fraunces',
  'Canela',
  'Recoleta',
  'Cormorant Garamond',
  'IBM Plex Mono',
  'JetBrains Mono',
  'Georgia',
]

/** Moods are stored on the job (English content), so they stay untranslated. */
export const MOODS = ['Minimal', 'Bold', 'Playful', 'Luxury', 'Retro', 'Organic', 'Techy', 'Editorial', 'Warm', 'Cinematic', 'Brutalist', 'Whimsical', 'Calm', 'Futuristic']

export const MOOD_EMOJI: Record<string, string> = {
  Minimal: '◻️',
  Bold: '⚡',
  Playful: '🎈',
  Luxury: '💎',
  Retro: '📼',
  Organic: '🌿',
  Techy: '🛰️',
  Editorial: '📰',
  Warm: '☀️',
  Cinematic: '🎬',
  Brutalist: '🧱',
  Whimsical: '🦄',
  Calm: '🌊',
  Futuristic: '🚀',
}

export const DO_SUGGESTIONS = ['Keep generous whitespace', 'Lead with the product', 'Use real photography', 'Make the CTA obvious', 'Design for mobile first', 'Stay on-brand with the palette']
export const DONT_SUGGESTIONS = ['No stock-photo clichés', 'No more than two typefaces', 'Avoid gradients on the logo', 'No dark patterns', 'Don’t crop the product', 'Avoid pure black backgrounds']

export const EXTRA_PALETTES = [
  { name: '70s soda', colors: ['#F2E8CF', '#E76F51', '#F4A261', '#2A9D8F', '#264653'] },
  { name: 'Nordic calm', colors: ['#F7F7F2', '#D8DDD6', '#9AA59B', '#4E5D52', '#1F2A24'] },
  { name: 'Neon night', colors: ['#0B0B14', '#3A0CA3', '#7209B7', '#F72585', '#4CC9F0'] },
  { name: 'Paper & ink', colors: ['#FBF7EF', '#E9DFCB', '#B8A88A', '#3B3A36', '#111111'] },
]

/** Accepted upload types in the assets step. */
export const ASSET_ACCEPT = 'image/*,video/*,audio/*,application/pdf,font/*,.ttf,.otf,.woff,.woff2,.zip,.rar,.7z,.psd,.ai,.fig,.sketch'

// ─────────────────────────── heuristics ───────────────────────────

/** Typical effort for a small-to-medium scope, per discipline. */
export const BASE_HOURS: Record<DisciplineId, number> = { visual: 24, video: 30, motion: 34, illustration: 28, brand: 40, uiux: 48, '3d': 36 }
/** Typical calendar days for that scope. */
export const BASE_DAYS: Record<DisciplineId, number> = { visual: 7, video: 9, motion: 11, illustration: 10, brand: 14, uiux: 18, '3d': 12 }

const PRIORITY_FACTOR: Record<Priority, number> = { low: 0.95, medium: 1, high: 1.1, urgent: 1.25 }

export function estimateHours(d: Pick<BriefDraft, 'discipline' | 'deliverables' | 'revisionLimit'>) {
  const disc = d.discipline ?? 'visual'
  const extra = Math.max(0, d.deliverables.length - 3) * 4
  const revisions = Math.max(0, d.revisionLimit - 2) * 3
  return BASE_HOURS[disc] + extra + revisions
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step

export interface BudgetAdvice {
  hours: number
  rate: number
  suggested: number
  low: number
  high: number
  verdict: 'low' | 'fair' | 'generous'
}

export function budgetAdvice(d: BriefDraft, designer: Designer | undefined): BudgetAdvice {
  const hours = estimateHours(d)
  const rate = designer?.hourlyRate ?? 70
  const suggested = Math.max(LIMITS.budgetMin, roundTo(rate * hours * PRIORITY_FACTOR[d.priority], 50))
  const low = roundTo(suggested * 0.85, 50)
  const high = roundTo(suggested * 1.15, 50)
  const verdict = d.budget < low ? 'low' : d.budget > high ? 'generous' : 'fair'
  return { hours, rate, suggested, low, high, verdict }
}

/** Calendar days this designer realistically needs for the scope. */
export function recommendedDays(d: BriefDraft, designer: Designer | undefined) {
  const disc = d.discipline ?? designer?.primary ?? 'visual'
  let days = BASE_DAYS[disc] + Math.max(0, d.deliverables.length - 4) + Math.max(0, d.revisionLimit - 2)
  if (designer?.availability === 'limited') days += 3
  if (designer?.availability === 'booked') days += 7
  if (d.priority === 'urgent') days = Math.ceil(days * 0.7)
  else if (d.priority === 'high') days = Math.ceil(days * 0.85)
  return Math.max(3, days)
}

/** A deadline at 17:00, `days` from today. */
export function dueInDays(days: number) {
  return setMinutes(setHours(addDays(startOfDay(new Date()), days), 17), 0).toISOString()
}

export const tomorrow = () => addDays(startOfDay(new Date()), 1)

export function deadlineInfo(d: BriefDraft, designer: Designer | undefined) {
  const rec = recommendedDays(d, designer)
  if (!d.dueAt) return { days: null as number | null, rec, tight: false, past: false }
  const days = differenceInCalendarDays(new Date(d.dueAt), new Date())
  return { days, rec, tight: days < rec, past: days < 1 }
}

// ─────────────────────────── validation ───────────────────────────

export function isUrl(s: string) {
  try {
    const u = new URL(s.trim())
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')
  } catch {
    return false
  }
}

/** Adds https:// when the user typed "figma.com/…". */
export function normalizeUrl(s: string) {
  const v = s.trim()
  if (!v) return v
  return /^[a-z]+:\/\//i.test(v) ? v : `https://${v}`
}

export type FieldErrors = Partial<Record<string, string>>

/** i18n keys (under `brief.err.*`) for everything blocking the step. */
export function stepErrors(step: number, d: BriefDraft, ctx: { designerExists: boolean }): FieldErrors {
  const e: FieldErrors = {}
  if (step === STEP.designer) {
    if (!d.designerId || !ctx.designerExists) e.designer = 'brief.err.designer'
  }
  if (step === STEP.project) {
    if (d.title.trim().length < 4) e.title = 'brief.err.title'
    if (d.summary.trim().length < 10) e.summary = 'brief.err.summary'
    if (d.description.trim().length < 40) e.description = 'brief.err.description'
    if (!d.discipline) e.discipline = 'brief.err.discipline'
    if (!Number.isFinite(d.budget) || d.budget < LIMITS.budgetMin) e.budget = 'brief.err.budget'
    if (!d.dueAt) e.dueAt = 'brief.err.dueAt'
    else if (differenceInCalendarDays(new Date(d.dueAt), new Date()) < 1) e.dueAt = 'brief.err.duePast'
  }
  if (step === STEP.deliverables) {
    if (d.deliverables.filter((x) => x.label.trim()).length === 0) e.deliverables = 'brief.err.deliverables'
  }
  return e
}

export function stepValid(step: number, d: BriefDraft, ctx: { designerExists: boolean }): boolean {
  if (step === STEP.review) return [STEP.designer, STEP.project, STEP.deliverables].every((s) => stepValid(s, d, ctx))
  return Object.keys(stepErrors(step, d, ctx)).length === 0
}

/** First step (≤ upTo) that is still invalid — or -1. */
export function firstInvalidStep(d: BriefDraft, ctx: { designerExists: boolean }, upTo: number = STEP.review) {
  for (let s = 0; s < upTo; s++) if (!stepValid(s, d, ctx)) return s
  return -1
}

// ─────────────────────────── quality ───────────────────────────

export interface QualityTip {
  key: string // i18n key under brief.tip.*
  step: number
  points: number
}

export function briefQuality(d: BriefDraft, designer: Designer | undefined) {
  const tips: QualityTip[] = []
  let score = 0
  const add = (ok: boolean, pts: number, key: string, step: number, partial = 0) => {
    if (ok) score += pts
    else {
      score += partial
      tips.push({ key, step, points: pts - partial })
    }
  }
  const desc = d.description.trim().length
  const advice = budgetAdvice(d, designer)
  const dl = deadlineInfo(d, designer)
  add(!!designer, 10, 'designer', STEP.designer)
  add(d.title.trim().length >= 4, 8, 'title', STEP.project)
  add(d.summary.trim().length >= 20, 8, 'summary', STEP.project, d.summary.trim().length >= 10 ? 4 : 0)
  add(desc >= 160, 14, 'description', STEP.project, desc >= 40 ? 7 : 0)
  add(d.deliverables.length >= 3, 10, 'deliverables', STEP.deliverables, d.deliverables.length ? 5 : 0)
  add(!!d.dueAt && !dl.tight, 8, d.dueAt ? 'deadlineTight' : 'deadline', STEP.project, d.dueAt ? 4 : 0)
  add(advice.verdict !== 'low', 8, 'budget', STEP.project, 3)
  add(d.style.palette.length >= 3, 8, 'palette', STEP.style, d.style.palette.length ? 4 : 0)
  add(d.style.fonts.length >= 1, 5, 'fonts', STEP.style)
  add(d.style.mood.length >= 2, 5, 'mood', STEP.style, d.style.mood.length ? 2 : 0)
  add(d.style.references.length >= 1, 6, 'references', STEP.style)
  add(d.style.dos.length >= 1 && d.style.donts.length >= 1, 5, 'dosDonts', STEP.style, d.style.dos.length || d.style.donts.length ? 2 : 0)
  add(d.assets.length >= 1, 5, 'assets', STEP.assets)
  tips.sort((a, b) => b.points - a.points)
  return { score: Math.max(0, Math.min(100, Math.round(score))), tips }
}

export function qualityLabelKey(score: number) {
  if (score >= 90) return 'brief.quality.excellent'
  if (score >= 70) return 'brief.quality.strong'
  if (score >= 45) return 'brief.quality.good'
  return 'brief.quality.thin'
}

// ─────────────────────────── timeline ───────────────────────────

export interface Phase {
  key: string // brief.phase.*
  start: Date
  end: Date
}

/** Splits today → deadline into a realistic phase plan. */
export function buildTimeline(d: BriefDraft): Phase[] {
  if (!d.dueAt) return []
  const start = startOfDay(new Date())
  const end = new Date(d.dueAt)
  const total = Math.max(1, differenceInCalendarDays(end, start))
  const rev = Math.max(1, d.revisionLimit)
  const weights: [string, number][] = [
    ['kickoff', 0.08],
    ['concept', 0.22],
    ['draft', 0.3],
    ['revisions', 0.12 + rev * 0.04],
    ['final', 0.1],
  ]
  const sum = weights.reduce((n, [, w]) => n + w, 0)
  let cursor = 0
  return weights.map(([key, w]) => {
    const len = (w / sum) * total
    const s = addDays(start, Math.round(cursor))
    cursor += len
    const e = addDays(start, Math.max(Math.round(cursor), Math.round(cursor - len) + 1))
    return { key, start: s, end: e > end ? end : e }
  })
}

// ─────────────────────────── output ───────────────────────────

export function toJobInput(d: BriefDraft): NewJobInput {
  return {
    title: d.title.trim(),
    summary: d.summary.trim(),
    description: d.description.trim(),
    designerId: d.designerId!,
    discipline: d.discipline ?? 'visual',
    priority: d.priority,
    dueAt: d.dueAt!,
    budget: Math.round(d.budget),
    deliverables: d.deliverables.map((x) => x.label.trim()).filter(Boolean),
    styleGuide: { ...d.style, notes: d.style.notes.trim() },
    assets: d.assets,
    revisionLimit: d.revisionLimit,
    tags: d.tags,
  }
}

/** Plain-text / Markdown export of the brief (download + clipboard). */
export function briefToMarkdown(d: BriefDraft, designer: Designer | undefined, money: (n: number) => string) {
  const lines: string[] = []
  lines.push(`# ${d.title || 'Untitled brief'}`, '')
  if (d.summary) lines.push(`> ${d.summary}`, '')
  lines.push(
    `- **Designer:** ${designer ? `${designer.name} (@${designer.handle})` : '—'}`,
    `- **Discipline:** ${d.discipline ?? '—'}`,
    `- **Priority:** ${d.priority}`,
    `- **Budget:** ${money(d.budget)}`,
    `- **Deadline:** ${d.dueAt ? format(new Date(d.dueAt), 'EEE, d MMM yyyy') : '—'}`,
    `- **Revision rounds:** ${d.revisionLimit}`,
  )
  if (d.tags.length) lines.push(`- **Tags:** ${d.tags.join(', ')}`)
  lines.push('', '## Description', '', d.description || '—', '', '## Deliverables', '')
  d.deliverables.forEach((x, i) => lines.push(`${i + 1}. ${x.label}`))
  const s = d.style
  lines.push('', '## Design language', '')
  if (s.palette.length) lines.push(`- **Palette:** ${s.palette.join(' ')}`)
  if (s.fonts.length) lines.push(`- **Fonts:** ${s.fonts.join(', ')}`)
  if (s.mood.length) lines.push(`- **Mood:** ${s.mood.join(', ')}`)
  if (s.references.length) {
    lines.push('- **References:**')
    s.references.forEach((r) => lines.push(`  - [${r.label}](${r.url})`))
  }
  if (s.dos.length) lines.push(`- **Do:** ${s.dos.join(' · ')}`)
  if (s.donts.length) lines.push(`- **Don't:** ${s.donts.join(' · ')}`)
  if (s.notes) lines.push('', s.notes)
  if (d.assets.length) {
    lines.push('', '## Assets', '')
    d.assets.forEach((a) => lines.push(`- ${a.name}${a.media.kind === 'url' ? ` — ${a.media.url}` : ''}`))
  }
  lines.push('', `_Written with designTab · ${format(new Date(), 'yyyy-MM-dd HH:mm')}_`)
  return lines.join('\n')
}

export const isDiscipline = (v: unknown): v is DisciplineId => typeof v === 'string' && (DISCIPLINE_IDS as readonly string[]).includes(v)

/**
 * Discover / network domain helpers.
 *
 * A "Person" is whatever sits on the other side of the marketplace for the
 * active role: client-Ali discovers DESIGNERS, designer-Ali discovers CLIENTS.
 * Everything in this file is pure so it can be memoised in components.
 */
import {
  ME_CLIENT_ID,
  ME_DESIGNER_ID,
  type ArtVariant,
  type Availability,
  type Client,
  type Designer,
  type DisciplineFilter,
  type DisciplineId,
  type Match,
  type MediaRef,
  type Role,
  type SwipeDecision,
} from '@/store/types'
import { matchScore } from '@/store/selectors'

export type Person = { kind: 'designer'; data: Designer } | { kind: 'client'; data: Client }

export const personOf = (p: Designer | Client): Person =>
  'primary' in p ? { kind: 'designer', data: p } : { kind: 'client', data: p }

export const primaryOf = (p: Person): DisciplineId => (p.kind === 'designer' ? p.data.primary : (p.data.disciplinesNeeded[0] ?? 'visual'))
export const disciplinesOf = (p: Person): DisciplineId[] => (p.kind === 'designer' ? p.data.disciplines : p.data.disciplinesNeeded)
export const headlineOf = (p: Person) => (p.kind === 'designer' ? p.data.headline : p.data.industry)
export const subtitleOf = (p: Person) => (p.kind === 'designer' ? p.data.handle : `${p.data.contactName} · ${p.data.contactRole}`)
export const isVerified = (p: Person) => p.data.verified
export const isTopRated = (p: Person) => (p.kind === 'designer' ? p.data.topRated : p.data.rating >= 4.8 && p.data.hiresCount >= 15)
/** Rating to display — a designer without reviews has no meaningful rating yet. */
export const ratingOf = (p: Person): number | null =>
  p.kind === 'designer' ? (p.data.reviewsCount > 0 && p.data.rating > 0 ? p.data.rating : null) : p.data.rating > 0 ? p.data.rating : null

export const isFresh = (p: Person) => p.data.isNew || (p.kind === 'designer' && !!p.data.registeredInApp)

/** Searchable tags: skills + tools for designers, industry + brief titles for clients. */
export function tagsOf(p: Person): string[] {
  if (p.kind === 'designer') return [...p.data.skills, ...p.data.tools]
  return [p.data.industry, ...p.data.openBriefs.map((b) => b.title)]
}

/** Which side of the marketplace a role discovers. */
export const targetKind = (role: Role): Person['kind'] => (role === 'client' ? 'designer' : 'client')

/** Client / designer ids of the pair formed by Ali (in `role`) and `personId`. */
export function pairFor(role: Role, personId: string) {
  return role === 'client' ? { clientId: ME_CLIENT_ID, designerId: personId } : { clientId: personId, designerId: ME_DESIGNER_ID }
}

/** Pair for a person regardless of the active role (designer → Ali-client, client → Ali-designer). */
export function pairForPerson(p: Person) {
  return p.kind === 'designer' ? { clientId: ME_CLIENT_ID, designerId: p.data.id, role: 'client' as Role } : { clientId: p.data.id, designerId: ME_DESIGNER_ID, role: 'designer' as Role }
}

export function findMatch(matches: Match[], p: Person) {
  const { clientId, designerId } = pairForPerson(p)
  return matches.find((m) => m.clientId === clientId && m.designerId === designerId)
}

export type Relation = 'none' | 'liked' | 'super' | 'passed' | 'matched'

export function relationOf(p: Person, decisions: Record<Role, Record<string, SwipeDecision>>, matches: Match[]): Relation {
  if (findMatch(matches, p)) return 'matched'
  const role = pairForPerson(p).role
  const d = decisions[role]?.[p.data.id]
  if (d === 'like') return 'liked'
  if (d === 'super') return 'super'
  if (d === 'pass') return 'passed'
  return 'none'
}

// ───────────────────────────── media ─────────────────────────────

export interface Shot {
  media: MediaRef
  title: string
  caption?: string
  /** Portfolio item id (designers) — used to open the right folder. */
  itemId?: string
}

const BRIEF_VARIANT: Record<DisciplineId, ArtVariant> = {
  visual: 'poster',
  video: 'video',
  motion: 'mesh',
  illustration: 'illustration',
  brand: 'logo',
  uiux: 'ui',
  '3d': 'blob3d',
}

export const briefArt = (clientId: string, i: number, discipline: DisciplineId): MediaRef => ({
  kind: 'art',
  seed: `${clientId}-brief-${i}`,
  variant: BRIEF_VARIANT[discipline],
  discipline,
})

/** Portfolio shots for carousels: one cover per project first, then extra artboards. */
export function shotsOf(p: Person, max = 6): Shot[] {
  if (p.kind === 'client') {
    const c = p.data
    const out: Shot[] = c.openBriefs.map((b, i) => ({ media: briefArt(c.id, i, b.discipline), title: b.title, caption: c.name }))
    out.push({ media: { kind: 'art', seed: `${c.id}-brand`, variant: 'pattern', discipline: c.disciplinesNeeded[0] ?? 'visual' }, title: c.name, caption: c.industry })
    return out.slice(0, max)
  }
  const d = p.data
  const covers: Shot[] = d.portfolio.map((it) => ({ media: it.cover, title: it.title, caption: it.client ?? String(it.year), itemId: it.id }))
  const extras: Shot[] = d.portfolio.flatMap((it) => it.media.slice(1).map((m) => ({ media: m, title: it.title, caption: it.client ?? String(it.year), itemId: it.id })))
  const all = [...covers, ...extras]
  if (!all.length) all.push({ media: { kind: 'art', seed: `${d.id}-cover`, variant: 'mesh', discipline: d.primary }, title: d.name })
  return all.slice(0, max)
}

// ───────────────────────────── regions ─────────────────────────────

export const REGIONS = ['europe', 'americas', 'apac', 'mea'] as const
export type Region = (typeof REGIONS)[number]

const COUNTRY_REGION: Record<string, Region> = {
  NL: 'europe', ES: 'europe', DE: 'europe', DK: 'europe', IE: 'europe', UK: 'europe', GB: 'europe', FI: 'europe', AT: 'europe',
  PT: 'europe', IT: 'europe', NO: 'europe', FR: 'europe', CZ: 'europe', SE: 'europe', PL: 'europe', HR: 'europe', CH: 'europe',
  BE: 'europe', TR: 'europe', GR: 'europe',
  US: 'americas', MX: 'americas', CA: 'americas', BR: 'americas', AR: 'americas', CO: 'americas', CL: 'americas',
  IN: 'apac', JP: 'apac', KR: 'apac', SG: 'apac', AU: 'apac', NZ: 'apac', CN: 'apac', ID: 'apac', VN: 'apac', TH: 'apac',
  AE: 'mea', ZA: 'mea', NG: 'mea', IL: 'mea', EG: 'mea', KE: 'mea', MA: 'mea', SA: 'mea',
}

export function regionOf(location: string): Region {
  const code = location.split(',').pop()?.trim().toUpperCase() ?? ''
  return COUNTRY_REGION[code] ?? 'europe'
}

// ───────────────────────────── filters ─────────────────────────────

export type SortKey = 'match' | 'rating' | 'price' | 'newest'

export interface DiscoverFilters {
  availability: Availability[]
  /** Hourly rate range (designers). */
  rate: [number, number]
  /** Budget range overlap (clients). */
  budget: [number, number]
  minRating: number
  tags: string[]
  regions: Region[]
  verifiedOnly: boolean
  paymentVerified: boolean
  sort: SortKey
}

export const RATE_MAX = 200
export const BUDGET_MAX = 15000

export const DEFAULT_FILTERS: DiscoverFilters = {
  availability: [],
  rate: [0, RATE_MAX],
  budget: [0, BUDGET_MAX],
  minRating: 0,
  tags: [],
  regions: [],
  verifiedOnly: false,
  paymentVerified: false,
  sort: 'match',
}

export function activeFilterCount(f: DiscoverFilters, kind: Person['kind']): number {
  let n = 0
  if (kind === 'designer') {
    if (f.availability.length) n++
    if (f.rate[0] > 0 || f.rate[1] < RATE_MAX) n++
  } else {
    if (f.budget[0] > 0 || f.budget[1] < BUDGET_MAX) n++
    if (f.paymentVerified) n++
  }
  if (f.minRating > 0) n++
  if (f.tags.length) n++
  if (f.regions.length) n++
  if (f.verifiedOnly) n++
  return n
}

export function matchesQuery(p: Person, q: string) {
  const query = q.trim().toLowerCase()
  if (!query) return true
  const hay = [p.data.name, headlineOf(p), subtitleOf(p), p.data.location, p.data.bio, ...tagsOf(p)].join(' ').toLowerCase()
  return query.split(/\s+/).every((w) => hay.includes(w))
}

export function matchesDisciplineTab(p: Person, d: DisciplineFilter) {
  return d === 'all' || disciplinesOf(p).includes(d)
}

export function passesFilters(p: Person, f: DiscoverFilters): boolean {
  if (f.minRating > 0 && p.data.rating < f.minRating) return false
  if (f.verifiedOnly && !p.data.verified) return false
  if (f.regions.length && !f.regions.includes(regionOf(p.data.location))) return false
  if (f.tags.length) {
    const tags = tagsOf(p).map((t) => t.toLowerCase())
    if (!f.tags.some((t) => tags.includes(t.toLowerCase()))) return false
  }
  if (p.kind === 'designer') {
    const d = p.data
    if (f.availability.length && !f.availability.includes(d.availability)) return false
    if (d.hourlyRate < f.rate[0] || (f.rate[1] < RATE_MAX && d.hourlyRate > f.rate[1])) return false
  } else {
    const c = p.data
    if (f.paymentVerified && !c.paymentVerified) return false
    const [lo, hi] = c.budgetRange
    // budget ranges overlap
    if (hi < f.budget[0] || (f.budget[1] < BUDGET_MAX && lo > f.budget[1])) return false
  }
  return true
}

export const priceOf = (p: Person) => (p.kind === 'designer' ? p.data.hourlyRate : p.data.budgetRange[1])

export function sortPeople(list: Person[], sort: SortKey, role: Role, discipline: DisciplineFilter): Person[] {
  const out = [...list]
  const fresh = (p: Person) => (p.kind === 'designer' && p.data.registeredInApp ? 1 : 0)
  switch (sort) {
    case 'rating':
      return out.sort((a, b) => b.data.rating - a.data.rating)
    case 'price':
      return out.sort((a, b) => priceOf(a) - priceOf(b))
    case 'newest':
      return out.sort((a, b) => fresh(b) - fresh(a) || b.data.joinedAt.localeCompare(a.data.joinedAt))
    default:
      return out.sort(
        (a, b) => fresh(b) - fresh(a) || matchScore(b.data, role, discipline) - matchScore(a.data, role, discipline) || b.data.rating - a.data.rating,
      )
  }
}

/** Popular tags in a pool (for the filter chips). */
export function topTags(list: Person[], max = 14): string[] {
  const counts = new Map<string, number>()
  for (const p of list) {
    const tags = p.kind === 'designer' ? p.data.tools : [p.data.industry.split('·')[0].trim()]
    for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([t]) => t)
}

// ───────────────────────────── "why this match" ─────────────────────────────

export interface Reason {
  key: string
  vars?: Record<string, string | number>
  tone: 'good' | 'info' | 'warn'
}

/** Human reasons behind the match score — shown in the AI card. Keys live in the discover namespace. */
export function reasonsFor(p: Person, discipline: DisciplineFilter): Reason[] {
  const out: Reason[] = []
  if (p.kind === 'designer') {
    const d = p.data
    if (discipline !== 'all' && d.disciplines.includes(discipline)) out.push({ key: 'why.discipline', tone: 'good' })
    if (d.availability === 'available') out.push({ key: 'why.available', tone: 'good' })
    else if (d.availability === 'booked') out.push({ key: 'why.booked', tone: 'warn' })
    if (d.onTimeRate >= 0.95) out.push({ key: 'why.onTime', vars: { pct: Math.round(d.onTimeRate * 100) }, tone: 'good' })
    if (d.responseTimeHrs <= 2) out.push({ key: 'why.fastReply', vars: { hours: d.responseTimeHrs }, tone: 'good' })
    if (d.topRated) out.push({ key: 'why.topRated', tone: 'good' })
    if (d.repeatClientRate >= 0.6) out.push({ key: 'why.repeat', vars: { pct: Math.round(d.repeatClientRate * 100) }, tone: 'info' })
    if (d.registeredInApp || d.isNew) out.push({ key: 'why.newTalent', tone: 'info' })
    if (d.languages.includes('German') || d.languages.includes('Turkish')) out.push({ key: 'why.language', tone: 'info' })
  } else {
    const c = p.data
    if (discipline !== 'all' && c.disciplinesNeeded.includes(discipline)) out.push({ key: 'why.needsDiscipline', tone: 'good' })
    if (c.paymentVerified) out.push({ key: 'why.paymentVerified', tone: 'good' })
    else out.push({ key: 'why.paymentUnverified', tone: 'warn' })
    if (c.openBriefs.length) out.push({ key: 'why.openBriefs', vars: { count: c.openBriefs.length }, tone: 'good' })
    if (c.hiresCount >= 10) out.push({ key: 'why.hires', vars: { count: c.hiresCount }, tone: 'info' })
    if (c.isNew) out.push({ key: 'why.newClient', tone: 'info' })
    if (c.rating >= 4.8) out.push({ key: 'why.goodClient', tone: 'good' })
  }
  return out.slice(0, 5)
}

export const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 864e5))

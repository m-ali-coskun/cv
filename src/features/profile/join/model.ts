import { uid } from '@/lib/ids'
import type { Availability, Designer, DisciplineId, MediaRef } from '@/store/types'
import type { WorkInput } from '../shared/WorkModal'
import {
  PERSONAS,
  guessTimezone,
  handleFrom,
  headlineIdeas,
  isValidEmail,
  isValidUrl,
  personaExtras,
  polishBio,
  randomSeed,
  sampleProject,
  socialUrl,
  uniqueHandle,
  type WritingInput,
} from '../shared/data'

export const STEPS = ['welcome', 'basics', 'craft', 'story', 'work', 'preview'] as const
export type StepId = (typeof STEPS)[number]

export const HEADLINE_MIN = 20
export const HEADLINE_MAX = 90
export const JOIN_BIO_MIN = 80
export const MAX_WORKS = 6

export interface JoinWork extends WorkInput {
  key: string
}

export interface JoinDraft {
  name: string
  email: string
  location: string
  timezone: string
  languages: string[]
  website: string
  avatarSeed: string
  avatar?: MediaRef
  primary: DisciplineId | null
  disciplines: DisciplineId[]
  skills: string[]
  tools: string[]
  hourlyRate: number
  currency: 'EUR' | 'USD'
  availability: Availability
  responseTimeHrs: number
  headline: string
  bio: string
  works: JoinWork[]
  agree: boolean
}

export function emptyDraft(): JoinDraft {
  return {
    name: '',
    email: '',
    location: '',
    timezone: guessTimezone(),
    languages: ['English'],
    website: '',
    avatarSeed: randomSeed('av'),
    primary: null,
    disciplines: [],
    skills: [],
    tools: [],
    hourlyRate: 55,
    currency: 'EUR',
    availability: 'available',
    responseTimeHrs: 2,
    headline: '',
    bio: '',
    works: [],
    agree: false,
  }
}

export function draftHasContent(d: JoinDraft) {
  return !!(d.name.trim() || d.email.trim() || d.headline.trim() || d.bio.trim() || d.works.length || d.primary)
}

export function writingFrom(d: JoinDraft): WritingInput {
  const primary = d.primary ?? 'visual'
  return { name: d.name || 'there', location: d.location, primary, disciplines: d.disciplines.length ? d.disciplines : [primary], skills: d.skills, tools: d.tools, availability: d.availability, bio: d.bio }
}

/** i18n keys (profile.join.err.*) per field for a step. */
export function stepErrors(step: StepId, d: JoinDraft): Record<string, string> {
  const e: Record<string, string> = {}
  if (step === 'basics') {
    if (d.name.trim().length < 2 || !/\p{L}/u.test(d.name)) e.name = 'name'
    if (!isValidEmail(d.email)) e.email = d.email.trim() ? 'emailBad' : 'email'
    if (d.location.trim().length < 2) e.location = 'location'
    if (d.website.trim() && !isValidUrl(socialUrl('Website', d.website))) e.website = 'website'
  }
  if (step === 'craft') {
    if (!d.primary) e.primary = 'primary'
    if (d.skills.length < 2) e.skills = 'skills'
    if (d.hourlyRate < 10) e.rate = 'rate'
  }
  if (step === 'story') {
    if (d.headline.trim().length < HEADLINE_MIN) e.headline = 'headline'
    if (d.headline.trim().length > HEADLINE_MAX) e.headline = 'headlineLong'
    if (d.bio.trim().length < JOIN_BIO_MIN) e.bio = 'bio'
  }
  if (step === 'work') {
    if (d.works.length < 1) e.works = 'works'
  }
  if (step === 'preview') {
    if (!d.agree) e.agree = 'agree'
  }
  return e
}

export const stepValid = (step: StepId, d: JoinDraft) => Object.keys(stepErrors(step, d)).length === 0

export function firstInvalid(d: JoinDraft): number {
  for (let i = 1; i < STEPS.length - 1; i++) if (!stepValid(STEPS[i], d)) return i
  return -1
}

/** A Designer object for previews (Discover card, profile mock). */
export function draftToDesigner(d: JoinDraft, joinedAt: string, id = 'd-preview'): Designer {
  const primary = d.primary ?? 'visual'
  return {
    id,
    name: d.name.trim() || 'Your name',
    handle: handleFrom(d.name) || '@yourname',
    avatarSeed: d.avatarSeed,
    avatar: d.avatar,
    headline: d.headline.trim(),
    bio: d.bio.trim(),
    location: d.location.trim(),
    timezone: d.timezone,
    languages: d.languages,
    primary,
    disciplines: d.disciplines.length ? d.disciplines : [primary],
    skills: d.skills,
    tools: d.tools,
    hourlyRate: d.hourlyRate,
    currency: d.currency,
    rating: 0,
    reviewsCount: 0,
    completedJobs: 0,
    responseTimeHrs: d.responseTimeHrs,
    onTimeRate: 1,
    repeatClientRate: 0,
    availability: d.availability,
    joinedAt,
    isNew: true,
    verified: false,
    topRated: false,
    portfolio: d.works.map(({ key, ...w }) => ({ ...w, id: key, likes: 0, views: 0 })),
    reviews: [],
    interestedInYou: true,
    socials: d.website.trim() ? [{ label: 'Website', url: socialUrl('Website', d.website) }] : [],
    registeredInApp: true,
  }
}

/** Input for the store's registerDesigner(). */
export function draftToInput(d: JoinDraft, takenHandles: string[]) {
  const primary = d.primary ?? 'visual'
  return {
    name: d.name.trim(),
    handle: uniqueHandle(handleFrom(d.name) || '@designer', takenHandles),
    avatarSeed: d.avatarSeed,
    avatar: d.avatar,
    headline: d.headline.trim(),
    bio: d.bio.trim(),
    location: d.location.trim(),
    timezone: d.timezone,
    languages: d.languages,
    primary,
    disciplines: d.disciplines.includes(primary) ? d.disciplines : [primary, ...d.disciplines],
    skills: d.skills,
    tools: d.tools,
    hourlyRate: d.hourlyRate,
    currency: d.currency,
    availability: d.availability,
    responseTimeHrs: d.responseTimeHrs,
    portfolio: d.works.map(({ key: _k, ...w }) => ({ ...w, id: uid('pf_'), likes: 0, views: 0 })),
    socials: d.website.trim() ? [{ label: 'Website', url: socialUrl('Website', d.website) }] : [],
  }
}

/** A complete, believable sample designer for demos. */
export function personaDraft(index: number): JoinDraft {
  const p = PERSONAS[index % PERSONAS.length]
  const seed = randomSeed('persona')
  const { skills, tools } = personaExtras(p, seed)
  const base: JoinDraft = {
    ...emptyDraft(),
    name: p.name,
    email: p.email,
    location: p.location,
    timezone: p.timezone,
    languages: p.languages,
    website: `${p.name.toLowerCase().split(' ')[0].normalize('NFD').replace(/[̀-ͯ]/g, '')}.design`,
    avatarSeed: `${p.name}-${seed}`,
    primary: p.primary,
    disciplines: p.disciplines,
    skills,
    tools,
    hourlyRate: p.rate,
    availability: p.availability,
    responseTimeHrs: [1, 2, 4][index % 3],
    agree: false,
  }
  const w = writingFrom(base)
  base.headline = headlineIdeas(w, index)[0]
  base.bio = polishBio(w, (['friendly', 'professional', 'bold'] as const)[index % 3], index)
  base.works = [0, 1].map((i) => ({ ...sampleProject(i === 0 ? p.primary : (p.disciplines[1] ?? p.primary), i), key: uid('jw_') }))
  return base
}

// ───────────────────────────── persistence (per browser convenience) ─────────────────────────────

const KEY = 'designtab-join-draft'

export function loadDraft(): { draft: JoinDraft; step: number } | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { draft: Partial<JoinDraft>; step: number }
    if (!parsed?.draft) return null
    return { draft: { ...emptyDraft(), ...parsed.draft }, step: Math.max(0, Math.min(STEPS.length - 1, parsed.step || 0)) }
  } catch {
    return null
  }
}

export function saveDraft(draft: JoinDraft, step: number) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ draft, step }))
  } catch {
    /* storage unavailable */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

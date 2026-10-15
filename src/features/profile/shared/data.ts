/**
 * Static data + pure helpers for the profile editor and the /join wizard.
 * Everything that ends up IN a profile (bios, headlines, skills) is user
 * content and therefore English only; UI chrome lives in locales/profile.ts.
 */
import { prng } from '@/lib/random'
import { uid } from '@/lib/ids'
import {
  DISCIPLINE_IDS,
  type ArtVariant,
  type Availability,
  type Client,
  type Designer,
  type DisciplineId,
  type MediaRef,
  type PortfolioItem,
} from '@/store/types'

export { DISCIPLINE_IDS }

/** English discipline names used inside generated (user) content. */
export const DISC_EN: Record<DisciplineId, string> = {
  visual: 'visual design',
  video: 'video editing',
  motion: 'motion design',
  illustration: 'illustration',
  brand: 'brand & print',
  uiux: 'UI/UX',
  '3d': '3D & CGI',
}

const DISC_ROLE: Record<DisciplineId, string> = {
  visual: 'visual designer',
  video: 'video editor',
  motion: 'motion designer',
  illustration: 'illustrator',
  brand: 'brand designer',
  uiux: 'product designer',
  '3d': '3D artist',
}

export const SKILLS: Record<DisciplineId, string[]> = {
  visual: ['Campaign design', 'Key visuals', 'Social content', 'Art direction', 'Retouching', 'Poster design', 'Editorial layout', 'Ad creatives', 'Presentation design', 'Photo manipulation'],
  video: ['Video editing', 'Color grading', 'Sound design', 'Storytelling', 'Short-form video', 'Documentary', 'Trailers', 'Subtitles', 'Reels & TikTok', 'Multicam editing'],
  motion: ['Motion design', '2D animation', 'Kinetic typography', 'Logo animation', 'Explainer videos', 'Lottie', 'Character rigging', 'Transitions', 'Motion systems', 'UI animation'],
  illustration: ['Editorial illustration', 'Character design', "Children's books", 'Concept art', 'Pattern design', 'Hand lettering', 'Icon design', 'Mascots', 'Storyboards', 'Digital painting'],
  brand: ['Brand identity', 'Logo design', 'Packaging', 'Typography', 'Brand guidelines', 'Naming', 'Print production', 'Signage', 'Stationery', 'Brand strategy'],
  uiux: ['UI design', 'UX research', 'Prototyping', 'Design systems', 'Wireframing', 'Usability testing', 'Mobile apps', 'Web design', 'Interaction design', 'Accessibility'],
  '3d': ['3D modeling', 'Product rendering', 'Look development', 'Lighting', 'Texturing', 'Character modeling', 'Architectural viz', 'Simulation', 'Sculpting', 'AR assets'],
}

export const TOOLS: Record<DisciplineId, string[]> = {
  visual: ['Photoshop', 'Illustrator', 'Figma', 'Lightroom', 'InDesign', 'Affinity Photo', 'Midjourney', 'Canva'],
  video: ['Premiere Pro', 'DaVinci Resolve', 'Final Cut Pro', 'After Effects', 'Audition', 'Frame.io', 'CapCut'],
  motion: ['After Effects', 'Cinema 4D', 'Rive', 'Lottie', 'Blender', 'Spline', 'Cavalry', 'Premiere Pro'],
  illustration: ['Procreate', 'Illustrator', 'Photoshop', 'Fresco', 'Clip Studio Paint', 'Krita', 'Affinity Designer'],
  brand: ['Illustrator', 'InDesign', 'Photoshop', 'Figma', 'Glyphs', 'Dimension'],
  uiux: ['Figma', 'Framer', 'ProtoPie', 'Sketch', 'Maze', 'Webflow', 'Principle', 'Notion'],
  '3d': ['Blender', 'Cinema 4D', 'Houdini', 'Maya', 'ZBrush', 'Substance Painter', 'KeyShot', 'Octane', 'Redshift', 'Unreal Engine'],
}

/** Suggestions for the union of disciplines (primary first, de-duplicated). */
export function suggestionsFor(map: Record<DisciplineId, string[]>, primary: DisciplineId, disciplines: DisciplineId[]) {
  const order = [primary, ...disciplines.filter((d) => d !== primary)]
  const out: string[] = []
  for (const d of order) for (const s of map[d]) if (!out.includes(s)) out.push(s)
  return out
}

export const LANGUAGE_OPTIONS = [
  'English', 'German', 'Turkish', 'French', 'Spanish', 'Italian', 'Portuguese', 'Dutch', 'Polish', 'Swedish',
  'Danish', 'Norwegian', 'Finnish', 'Greek', 'Arabic', 'Hebrew', 'Hindi', 'Mandarin', 'Cantonese', 'Japanese', 'Korean',
  'Russian', 'Ukrainian', 'Czech', 'Romanian', 'Hungarian', 'Vietnamese', 'Thai', 'Indonesian', 'Persian',
]

export const TIMEZONES: { id: string; offset: string; city: string }[] = [
  { id: 'PST', offset: 'UTC−8', city: 'Los Angeles' },
  { id: 'MST', offset: 'UTC−7', city: 'Denver' },
  { id: 'CST', offset: 'UTC−6', city: 'Mexico City' },
  { id: 'EST', offset: 'UTC−5', city: 'New York' },
  { id: 'BRT', offset: 'UTC−3', city: 'São Paulo' },
  { id: 'GMT', offset: 'UTC±0', city: 'London' },
  { id: 'WET', offset: 'UTC±0', city: 'Lisbon' },
  { id: 'CET', offset: 'UTC+1', city: 'Berlin' },
  { id: 'EET', offset: 'UTC+2', city: 'Athens' },
  { id: 'TRT', offset: 'UTC+3', city: 'Istanbul' },
  { id: 'GST', offset: 'UTC+4', city: 'Dubai' },
  { id: 'IST', offset: 'UTC+5:30', city: 'Mumbai' },
  { id: 'ICT', offset: 'UTC+7', city: 'Bangkok' },
  { id: 'SGT', offset: 'UTC+8', city: 'Singapore' },
  { id: 'JST', offset: 'UTC+9', city: 'Tokyo' },
  { id: 'KST', offset: 'UTC+9', city: 'Seoul' },
  { id: 'AEST', offset: 'UTC+10', city: 'Sydney' },
  { id: 'NZST', offset: 'UTC+12', city: 'Auckland' },
]

/** Best-guess timezone from the browser, mapped to our short ids. */
export function guessTimezone(): string {
  try {
    const off = -new Date().getTimezoneOffset() / 60
    const hit = TIMEZONES.find((t) => {
      const m = t.offset.match(/UTC([+−±])(\d+)(?::(\d+))?/)
      if (!m) return false
      const sign = m[1] === '−' ? -1 : 1
      const v = sign * (Number(m[2]) + (m[3] ? Number(m[3]) / 60 : 0))
      return v === off
    })
    return hit?.id ?? 'CET'
  } catch {
    return 'CET'
  }
}

export const CITY_SUGGESTIONS = [
  'Berlin, DE', 'Hamburg, DE', 'Munich, DE', 'Istanbul, TR', 'Izmir, TR', 'Ankara, TR', 'London, UK', 'Manchester, UK', 'Lisbon, PT',
  'Porto, PT', 'Barcelona, ES', 'Madrid, ES', 'Paris, FR', 'Amsterdam, NL', 'Copenhagen, DK', 'Stockholm, SE', 'Warsaw, PL', 'Vienna, AT',
  'Zurich, CH', 'Milan, IT', 'New York, US', 'Los Angeles, US', 'Austin, US', 'Toronto, CA', 'Mexico City, MX', 'São Paulo, BR',
  'Buenos Aires, AR', 'Dubai, AE', 'Mumbai, IN', 'Singapore, SG', 'Tokyo, JP', 'Seoul, KR', 'Sydney, AU', 'Remote',
]

export const INDUSTRIES = [
  'Creative studio', 'Food & beverage', 'Fintech', 'SaaS', 'E-commerce', 'Gaming', 'Fashion', 'Beauty', 'Health & wellness',
  'Education', 'Media & publishing', 'Music & entertainment', 'Hospitality', 'Real estate', 'Mobility', 'Non-profit', 'Sports', 'Agency',
]

export const SOCIAL_PLATFORMS: { id: string; base: string; placeholder: string }[] = [
  { id: 'Behance', base: 'https://www.behance.net/', placeholder: 'yourname' },
  { id: 'Dribbble', base: 'https://dribbble.com/', placeholder: 'yourname' },
  { id: 'Instagram', base: 'https://www.instagram.com/', placeholder: 'yourname' },
  { id: 'LinkedIn', base: 'https://www.linkedin.com/in/', placeholder: 'your-name' },
  { id: 'ArtStation', base: 'https://www.artstation.com/', placeholder: 'yourname' },
  { id: 'Vimeo', base: 'https://vimeo.com/', placeholder: 'yourname' },
  { id: 'YouTube', base: 'https://www.youtube.com/@', placeholder: 'yourchannel' },
  { id: 'X', base: 'https://x.com/', placeholder: 'yourname' },
  { id: 'TikTok', base: 'https://www.tiktok.com/@', placeholder: 'yourname' },
  { id: 'GitHub', base: 'https://github.com/', placeholder: 'yourname' },
  { id: 'Website', base: 'https://', placeholder: 'yourstudio.com' },
]

/** Turn "alidesigns" or "behance.net/alidesigns" into a full URL for the platform. */
export function socialUrl(platform: string, input: string) {
  const v = input.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (/\.[a-z]{2,}(\/|$)/i.test(v) && v.includes('.')) return `https://${v.replace(/^\/+/, '')}`
  const base = SOCIAL_PLATFORMS.find((p) => p.id === platform)?.base ?? 'https://'
  return base + v.replace(/^@/, '')
}

export function isValidUrl(v: string) {
  if (!v) return false
  try {
    const u = new URL(v)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')
  } catch {
    return false
  }
}

export function prettyUrl(v: string) {
  return v.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')
}

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

/** "Ayşe Nur Kaya" → "@aysenur.kaya" */
export function handleFrom(name: string) {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!base.length) return ''
  if (base.length === 1) return `@${base[0]}`
  return `@${base.slice(0, -1).join('')}.${base[base.length - 1]}`
}

export function normalizeHandle(v: string) {
  const clean = v.toLowerCase().replace(/[^a-z0-9._]/g, '')
  return clean ? `@${clean}` : ''
}

// ───────────────────────────── art ─────────────────────────────

export const ART_VARIANTS: ArtVariant[] = ['poster', 'mesh', 'blob3d', 'ui', 'video', 'type', 'pattern', 'logo', 'illustration', 'photo']

export const VARIANTS_FOR: Record<DisciplineId, ArtVariant[]> = {
  visual: ['poster', 'type', 'photo', 'mesh'],
  video: ['video', 'photo', 'poster'],
  motion: ['video', 'blob3d', 'mesh'],
  illustration: ['illustration', 'pattern', 'poster'],
  brand: ['logo', 'type', 'pattern', 'poster'],
  uiux: ['ui', 'mesh'],
  '3d': ['blob3d', 'mesh'],
}

export function artSet(seed: string, discipline: DisciplineId, variant: ArtVariant | 'mix', count: number): MediaRef[] {
  const r = prng(seed)
  const pool = VARIANTS_FOR[discipline]
  return Array.from({ length: count }, (_, i) => ({
    kind: 'art' as const,
    seed: `${seed}-${i}`,
    variant: variant === 'mix' ? (i === 0 ? pool[0] : r.pick(ART_VARIANTS)) : variant,
    discipline,
  }))
}

export const randomSeed = (prefix = 's') => `${prefix}-${Math.random().toString(36).slice(2, 9)}`

/** A full sample project — used by "Generate sample" in the wizard. */
const SAMPLE_PROJECTS: Record<DisciplineId, { title: string; description: string; tags: string[]; client: string }[]> = {
  visual: [
    { title: 'Solstice — summer campaign', description: 'Key visual, OOH posters and a 24-piece social kit for a beverage launch.', tags: ['Campaign', 'OOH', 'Social'], client: 'Solstice Drinks' },
    { title: 'Northbound festival poster series', description: 'Six screen-printed posters and a matching digital rollout.', tags: ['Poster', 'Music'], client: 'Northbound Fest' },
  ],
  video: [
    { title: 'Making of — Atelier Nord', description: 'A 3-minute brand documentary, edited and graded from 14 hours of footage.', tags: ['Documentary', 'Color grading'], client: 'Atelier Nord' },
    { title: 'Product launch reels', description: 'Twelve vertical edits for a sneaker drop, cut to beat.', tags: ['Short-form', 'Social'], client: 'Stride Labs' },
  ],
  motion: [
    { title: 'Orbit — logo sting & UI motion', description: 'Animated logo, onboarding micro-interactions and a Lottie library.', tags: ['Logo animation', 'Lottie'], client: 'Orbit Finance' },
    { title: 'Explainer: how payouts work', description: '90-second 2D explainer with kinetic type.', tags: ['Explainer', '2D'], client: 'Payly' },
  ],
  illustration: [
    { title: 'The Lighthouse Keeper — picture book', description: '32 spreads of gouache-style digital illustration.', tags: ['Children’s book', 'Editorial'], client: 'Paper Kite Press' },
    { title: 'Café mural & menu art', description: 'A 6-metre mural plus matching menu illustrations.', tags: ['Mural', 'Hospitality'], client: 'Kinfolk Café' },
  ],
  brand: [
    { title: 'Fieldnotes — tea brand identity', description: 'Wordmark, packaging system and brand book for an organic tea label.', tags: ['Identity', 'Packaging'], client: 'Fieldnotes Tea' },
    { title: 'Studio Ostra rebrand', description: 'Logo, type system and stationery for an architecture studio.', tags: ['Rebrand', 'Typography'], client: 'Studio Ostra' },
  ],
  uiux: [
    { title: 'Ledger — banking app redesign', description: 'Research, flows and a 120-component design system for iOS & Android.', tags: ['Mobile', 'Design system'], client: 'Ledger Bank' },
    { title: 'Booking flow for a clinic chain', description: 'Cut drop-off by 38% with a 3-step booking flow.', tags: ['UX', 'Web'], client: 'Mediq' },
  ],
  '3d': [
    { title: 'Aero headphones — product renders', description: 'Hero renders, exploded views and a 360° turntable.', tags: ['Product', 'Rendering'], client: 'Aero Audio' },
    { title: 'Ironvale — character key art', description: 'Sculpted hero character and capsule art for a game launch.', tags: ['Gaming', 'Character'], client: 'Pixelforge' },
  ],
}

export function sampleProject(discipline: DisciplineId, index: number): Omit<PortfolioItem, 'id' | 'likes' | 'views'> {
  const list = SAMPLE_PROJECTS[discipline]
  const p = list[index % list.length]
  const seed = randomSeed('pf')
  const media = artSet(seed, discipline, 'mix', 3)
  return { ...p, discipline, year: new Date().getFullYear() - (index % 2), cover: media[0], media }
}

export function newPortfolioItem(item: Omit<PortfolioItem, 'id' | 'likes' | 'views'>): PortfolioItem {
  return { ...item, id: uid('pf_'), likes: 0, views: 0 }
}

// ───────────────────────────── writing assistant ─────────────────────────────

export type Tone = 'friendly' | 'professional' | 'bold'

const OUTCOME: Record<DisciplineId, string> = {
  visual: 'campaigns people remember',
  video: 'stories that hold attention to the very last frame',
  motion: 'brands that move',
  illustration: 'worlds people want to step into',
  brand: 'identities that sit proudly on the shelf',
  uiux: 'products that feel effortless',
  '3d': 'renders that look better than reality',
}

const AUDIENCE: Record<DisciplineId, string> = {
  visual: 'launches & campaigns',
  video: 'brands & creators',
  motion: 'tech & media brands',
  illustration: 'publishers & brands',
  brand: 'food, beverage & lifestyle brands',
  uiux: 'SaaS & mobile products',
  '3d': 'products, games & retail',
}

const PROCESS = [
  'I work in short, visible loops: a moodboard within 48 hours, first concepts within a week, and a shared board so you always know where things stand.',
  'Every project starts with a 30-minute call, a clear scope and a fixed timeline — no surprises and no endless rounds.',
  'Expect clear check-ins, tidy source files and feedback rounds that actually move the work forward.',
]

const AVAIL_LINE: Record<Availability, string> = {
  available: 'Currently taking on new projects — let’s talk.',
  limited: 'Limited availability this month, so reach out early.',
  booked: 'Fully booked right now, but happy to plan ahead for upcoming launches.',
}

export interface WritingInput {
  name: string
  location: string
  primary: DisciplineId
  disciplines: DisciplineId[]
  skills: string[]
  tools: string[]
  availability: Availability
  bio?: string
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] || 'there'
const city = (loc: string) => loc.split(',')[0]?.trim() || 'Europe'
function listOf(items: string[], max = 3) {
  const xs = items.slice(0, max).map((s) => s.toLowerCase())
  if (xs.length <= 1) return xs[0] ?? ''
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
}
function yearsFrom(bio: string | undefined, fallback: number) {
  const m = bio?.match(/(\d{1,2})\s*\+?\s*(years|yrs)/i)
  return m ? Number(m[1]) : fallback
}

/** Template-based "AI" rewrite. `variant` lets the user re-roll. */
export function polishBio(input: WritingInput, tone: Tone, variant = 0): string {
  const r = prng(`${input.name}|${tone}|${variant}`)
  const years = yearsFrom(input.bio, 3 + (variant % 4) * 2)
  const role = DISC_ROLE[input.primary]
  const others = input.disciplines.filter((d) => d !== input.primary).map((d) => DISC_EN[d])
  const skills = input.skills.length ? listOf(input.skills) : DISC_EN[input.primary]
  const tools = input.tools.length ? listOf(input.tools.map((x) => x), 3).replace(/\b\w/g, (c) => c) : ''
  const toolsLine = input.tools.length ? input.tools.slice(0, 3).join(', ') : ''
  const process = PROCESS[(variant + r.int(0, 2)) % PROCESS.length]
  const avail = AVAIL_LINE[input.availability]
  const also = others.length ? ` — and comfortable jumping into ${listOf(others, 2)} when a project needs it` : ''
  void tools

  if (tone === 'professional') {
    return [
      `${city(input.location)}-based ${role} with ${years}+ years of experience${also}.`,
      `I focus on ${skills}${toolsLine ? `, working mainly in ${toolsLine}` : ''}.`,
      process,
      avail,
    ].join(' ')
  }
  if (tone === 'bold') {
    const hooks = ['Design that refuses to be ignored.', 'Make the launch impossible to miss.', 'Less noise, more signal.', 'Good enough is never the brief.']
    return [
      hooks[(variant + r.int(0, 3)) % hooks.length],
      `I’m ${firstName(input.name)}, a ${role} in ${city(input.location)} who turns briefs into ${OUTCOME[input.primary]}.`,
      `${years}+ years, ${Math.max(1, input.skills.length)} specialties — ${skills}${toolsLine ? `, built in ${toolsLine}` : ''}.`,
      process,
      avail,
    ].join(' ')
  }
  const hooks = ['I love making things people actually stop scrolling for.', 'Good design should feel obvious in hindsight — that’s what I aim for.', 'I care about the small details that make a big first impression.']
  return [
    `Hi, I’m ${firstName(input.name)} — a ${role} based in ${city(input.location)}${also}.`,
    hooks[(variant + r.int(0, 2)) % hooks.length],
    `Over the last ${years} years I’ve worked on ${skills}${toolsLine ? `, mostly in ${toolsLine}` : ''}.`,
    process,
    avail,
  ].join(' ')
}

export function headlineIdeas(input: WritingInput, variant = 0): string[] {
  const role = DISC_ROLE[input.primary]
  const Role = role.charAt(0).toUpperCase() + role.slice(1)
  const s = input.skills.length ? input.skills : [DISC_EN[input.primary]]
  const rot = (i: number) => s[(i + variant) % s.length]
  const tools = input.tools.slice(0, 2)
  const ideas = [
    `${Role} — ${[rot(0), rot(1), rot(2)].filter((v, i, a) => a.indexOf(v) === i).join(', ').toLowerCase()}`,
    `${rot(0)} for ${AUDIENCE[input.primary]}`,
    `${city(input.location)}-based ${role}${tools.length ? ` · ${tools.join(' & ')}` : ''}`,
    `I design ${OUTCOME[input.primary]}`,
  ]
  return ideas.slice(variant % 2, (variant % 2) + 3)
}

export interface BioAnalysis {
  chars: number
  words: number
  score: number
  level: 'empty' | 'short' | 'ok' | 'great' | 'long'
  checks: { id: 'length' | 'experience' | 'process' | 'results' | 'voice'; ok: boolean }[]
}

export const BIO_MIN = 150
export const BIO_GREAT = 320
export const BIO_MAX = 1200

export function analyzeBio(bio: string): BioAnalysis {
  const text = bio.trim()
  const chars = text.length
  const words = text ? text.split(/\s+/).length : 0
  const checks: BioAnalysis['checks'] = [
    { id: 'length', ok: chars >= BIO_MIN && chars <= BIO_MAX },
    { id: 'experience', ok: /(\d+\s*\+?\s*(years|yrs))|experience|since \d{4}|former|previously/i.test(text) },
    { id: 'process', ok: /process|loop|workflow|call|timeline|feedback|round|deliver|scope|check-in/i.test(text) },
    { id: 'results', ok: /\d+\s*%|\d{2,}|sold|grew|doubled|increased|award|launched/i.test(text) },
    { id: 'voice', ok: /\b(I|I’m|I'm|my|we)\b/.test(text) },
  ]
  const passed = checks.filter((c) => c.ok).length
  const lengthScore = Math.min(1, chars / BIO_GREAT)
  const score = Math.round(Math.min(100, lengthScore * 50 + passed * 10))
  const level: BioAnalysis['level'] =
    chars === 0 ? 'empty' : chars > BIO_MAX ? 'long' : chars < BIO_MIN ? 'short' : score >= 85 ? 'great' : 'ok'
  return { chars, words, score, level, checks }
}

// ───────────────────────────── profile strength ─────────────────────────────

export type SectionId = 'identity' | 'about' | 'craft' | 'rates' | 'portfolio' | 'socials' | 'reviews'

export interface StrengthItem {
  id: string
  section: SectionId | ClientSectionId
  weight: number
  ok: boolean
}

export function designerStrength(d: Designer): { score: number; items: StrengthItem[] } {
  const items: StrengthItem[] = [
    { id: 'photo', section: 'identity', weight: 10, ok: !!d.avatar },
    { id: 'headline', section: 'identity', weight: 10, ok: d.headline.trim().length >= 30 },
    { id: 'location', section: 'identity', weight: 5, ok: !!d.location.trim() && !!d.timezone },
    { id: 'languages', section: 'identity', weight: 5, ok: d.languages.length >= 2 },
    { id: 'bio', section: 'about', weight: 15, ok: d.bio.trim().length >= 200 },
    { id: 'disciplines', section: 'craft', weight: 5, ok: d.disciplines.length >= 2 },
    { id: 'skills', section: 'craft', weight: 10, ok: d.skills.length >= 5 },
    { id: 'tools', section: 'craft', weight: 5, ok: d.tools.length >= 3 },
    { id: 'rate', section: 'rates', weight: 5, ok: d.hourlyRate > 0 },
    { id: 'portfolio', section: 'portfolio', weight: 20, ok: d.portfolio.length >= 4 },
    { id: 'socials', section: 'socials', weight: 10, ok: d.socials.filter((s) => isValidUrl(s.url)).length >= 2 },
  ]
  const score = items.reduce((n, i) => n + (i.ok ? i.weight : 0), 0)
  return { score, items }
}

export type ClientSectionId = 'brand' | 'company' | 'hiring' | 'briefs' | 'trust'

export function clientStrength(c: Client): { score: number; items: StrengthItem[] } {
  const items: StrengthItem[] = [
    { id: 'contact', section: 'company', weight: 10, ok: !!c.contactName.trim() && !!c.contactRole.trim() },
    { id: 'industry', section: 'company', weight: 5, ok: !!c.industry.trim() && !!c.location.trim() },
    { id: 'website', section: 'company', weight: 10, ok: isValidUrl(c.website) },
    { id: 'cbio', section: 'company', weight: 15, ok: c.bio.trim().length >= 120 },
    { id: 'needs', section: 'hiring', weight: 10, ok: c.disciplinesNeeded.length >= 1 },
    { id: 'budget', section: 'hiring', weight: 5, ok: c.budgetRange[1] > c.budgetRange[0] },
    { id: 'briefs', section: 'briefs', weight: 20, ok: c.openBriefs.length >= 1 },
    { id: 'payment', section: 'trust', weight: 15, ok: c.paymentVerified },
    { id: 'verified', section: 'trust', weight: 10, ok: c.verified },
  ]
  const score = items.reduce((n, i) => n + (i.ok ? i.weight : 0), 0)
  return { score, items }
}

/** Deterministic daily profile-view series (simulated analytics). */
export function viewSeries(seed: string, total: number, days = 14): number[] {
  const r = prng(seed)
  const raw = Array.from({ length: days }, (_, i) => 0.6 + r.next() * 0.8 + i * 0.04)
  const sum = raw.reduce((a, b) => a + b, 0)
  const perDay = Math.max(1, total / 90)
  return raw.map((v) => Math.max(0, Math.round((v / sum) * days * perDay)))
}

export const BRAND_COLORS = [
  '#C9F158', '#0B0B0C', '#FF6B3D', '#FFB21E', '#2FB36B', '#14B8A6', '#3E8EF7', '#6366F1', '#9999FF',
  '#CF96FD', '#FF61F6', '#FF3366', '#E5484D', '#C2410C', '#8B5E3C', '#64748B',
]

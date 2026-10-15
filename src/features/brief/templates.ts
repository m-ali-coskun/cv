/**
 * "Start from a template" — ready-made briefs (English content) plus the
 * client's own saved templates (localStorage).
 */
import type { ArtVariant, DisciplineId, Job, Priority, StyleGuide } from '@/store/types'
import { uid } from '@/lib/ids'
import { deliverable, dueInDays, emptyStyle, type BriefDraft } from './model'

export interface BriefTemplate {
  id: string
  name: string
  discipline: DisciplineId
  /** Generative art used for the folder papers. */
  art: ArtVariant[]
  title: string
  summary: string
  description: string
  tags: string[]
  priority: Priority
  days: number
  revisionLimit: number
  deliverables: string[]
  style: Omit<StyleGuide, 'references'> & { references: { label: string; url: string }[] }
  /** Saved by the user (removable). */
  custom?: boolean
  savedAt?: string
}

export const BRIEF_TEMPLATES: BriefTemplate[] = [
  {
    id: 'tpl-launch',
    name: 'Launch campaign kit',
    discipline: 'visual',
    art: ['poster', 'photo', 'mesh'],
    title: 'Spring launch — campaign key visual & social kit',
    summary: 'One hero key visual plus a social and ads kit for our spring product launch.',
    description:
      'We are launching a new seasonal product line in six weeks and need a campaign look that works everywhere — from a 48-sheet poster to a 9:16 story.\n\nGoals\n• One memorable key visual that carries the whole campaign\n• A social kit the in-house team can keep extending after launch\n• Consistent results across print, web and paid social\n\nAudience\nUrban 25–40 year-olds who discover products on Instagram and in-store.\n\nWhat we need\nThe key visual first (two directions, then one refined), then roll-outs into feed posts, stories, ads and the web hero. Product photography and the logo pack are attached.\n\nSuccess looks like\nA campaign that feels premium but approachable, and a kit we can reuse for at least three months.',
    tags: ['campaign', 'launch', 'social', 'key visual'],
    priority: 'high',
    days: 14,
    revisionLimit: 2,
    deliverables: ['Key visual (master artwork)', 'Instagram feed posts ×6', 'Stories set ×4 (9:16)', 'Paid social ads ×3 sizes', 'Web hero banner', 'Email header'],
    style: {
      palette: ['#F2E8CF', '#E76F51', '#F4A261', '#2A9D8F', '#264653'],
      fonts: ['Söhne', 'Canela'],
      mood: ['Bold', 'Warm', 'Editorial'],
      references: [{ label: 'Campaign moodboard', url: 'https://www.pinterest.com/' }],
      dos: ['Lead with the product', 'Make the CTA obvious'],
      donts: ['No stock-photo clichés'],
      notes: 'Logo must sit on a light background. Legal line needs to be legible on the 1:1 ads.',
    },
  },
  {
    id: 'tpl-youtube',
    name: 'YouTube video edit',
    discipline: 'video',
    art: ['video', 'photo', 'mesh'],
    title: 'YouTube episode edit — 12-minute studio story',
    summary: 'Edit a 12-minute episode from ~3 hours of interview and b-roll, plus vertical cut-downs.',
    description:
      'We filmed a behind-the-scenes episode in our studio: two interviews (multicam), lots of b-roll and a few drone shots. We need a tight 12-minute YouTube edit that keeps people watching to the end.\n\nGoals\n• Strong hook in the first 15 seconds\n• Clear story arc: problem → process → reveal\n• Three vertical cut-downs for Shorts / Reels / TikTok\n\nStyle\nWarm, documentary-style grade. Music should feel optimistic but not cheesy — licensed tracks only.\n\nFootage\nRaw files are on the shared Drive (link in assets). Transcripts are included to speed up the paper edit.\n\nSuccess looks like\nAbove 50% average view duration and cut-downs that work with the sound off.',
    tags: ['youtube', 'documentary', 'reels', 'colour grade'],
    priority: 'medium',
    days: 12,
    revisionLimit: 3,
    deliverables: ['16:9 master', '9:16 cut-down', 'Subtitles SRT', 'Colour grade', 'Sound mix & music licence', 'Thumbnail options ×2'],
    style: {
      palette: ['#1A1A1A', '#F5F0E6', '#D97B48', '#6B8F71', '#2F4858'],
      fonts: ['Inter', 'IBM Plex Mono'],
      mood: ['Cinematic', 'Warm', 'Calm'],
      references: [{ label: 'Pacing reference', url: 'https://www.youtube.com/' }],
      dos: ['Keep cuts on the beat', 'Burn in captions for vertical'],
      donts: ['No whoosh transitions'],
      notes: 'Lower thirds: name + role, our brand font. End screen with subscribe + next episode.',
    },
  },
  {
    id: 'tpl-logo-anim',
    name: 'Logo animation',
    discipline: 'motion',
    art: ['logo', 'mesh', 'pattern'],
    title: 'Animated logo sting & web loop',
    summary: 'A 5-second logo sting for video intros plus a lightweight Lottie loop for the website.',
    description:
      'Our new identity launches next month and we want the logo to come alive — in video intros, on the website and in the app splash screen.\n\nGoals\n• A 5-second sting that feels confident and crafted\n• A subtle looping version for the web (Lottie, under 60 KB)\n• Motion principles we can reuse across the brand\n\nDirection\nPrecise, springy motion — think “satisfying” rather than flashy. The mark is built from three shapes; we would love to see them assemble.\n\nSuccess looks like\nA sting our team wants to put at the start of everything, and a loop that runs smoothly on mid-range phones.',
    tags: ['logo animation', 'lottie', 'sound design', 'loop'],
    priority: 'medium',
    days: 10,
    revisionLimit: 2,
    deliverables: ['Storyboard & styleframes', '5s logo sting', 'Lottie JSON for web', 'Transparent ProRes 4444', 'Sound design'],
    style: {
      palette: ['#0B0B0C', '#FFFFFF', '#7C5CFF', '#C9F158'],
      fonts: ['Geist', 'Geist Mono'],
      mood: ['Minimal', 'Techy', 'Playful'],
      references: [{ label: 'Motion principles', url: 'https://m3.material.io/styles/motion/overview' }],
      dos: ['Use springy easing', 'Hold the final lock-up for 1s'],
      donts: ['No 3D extrusions', 'Avoid pure black backgrounds'],
      notes: 'Vector logo files (SVG + AI) are attached. Keep the Lottie under 60 KB.',
    },
  },
  {
    id: 'tpl-onboarding',
    name: 'App onboarding redesign',
    discipline: 'uiux',
    art: ['ui', 'mesh', 'ui'],
    title: 'Mobile app onboarding redesign',
    summary: 'Redesign the first-run experience of our iOS/Android app to lift activation.',
    description:
      'Only 38% of new users finish onboarding today, and most drop off at the permissions step. We want a shorter, friendlier first-run flow that gets people to their first “aha” moment faster.\n\nGoals\n• Raise onboarding completion from 38% to 60%+\n• Ask for permissions in context, not up-front\n• Reuse our existing design system wherever possible\n\nScope\nWelcome, sign-up, personalisation (3 questions), permissions, empty home state. iOS and Android.\n\nResearch\nWe can recruit five users for a quick usability test; analytics funnels are attached.\n\nSuccess looks like\nA tested Figma prototype and specs our engineers can build in one sprint.',
    tags: ['mobile app', 'onboarding', 'research', 'prototype'],
    priority: 'high',
    days: 21,
    revisionLimit: 3,
    deliverables: ['User flow map', 'Lo-fi wireframes', 'Hi-fi screens (iOS + Android)', 'Interactive Figma prototype', 'Usability test (5 users)', 'Dev handoff specs'],
    style: {
      palette: ['#FFFFFF', '#F3F3F5', '#0B0B0C', '#FF61F6', '#31A8FF'],
      fonts: ['Inter'],
      mood: ['Minimal', 'Playful', 'Calm'],
      references: [{ label: 'Current app (Figma)', url: 'https://www.figma.com/' }],
      dos: ['Design for mobile first', 'Use the existing components'],
      donts: ['No dark patterns', 'No more than 5 onboarding screens'],
      notes: 'Accessibility: WCAG AA contrast, dynamic type up to XXL.',
    },
  },
  {
    id: 'tpl-renders',
    name: 'Product renders',
    discipline: '3d',
    art: ['blob3d', 'photo', 'blob3d'],
    title: 'Product renders — hero, turntable & packshots',
    summary: 'Photoreal CGI of our new speaker for the website, retailers and launch ads.',
    description:
      'We are launching a portable speaker in three colourways and need photoreal renders before the factory samples arrive.\n\nGoals\n• One hero render that sells the premium materials\n• Clean packshots for retailers (transparent PNG)\n• A 360° turntable for the product page\n\nInputs\nCAD files (STEP) and CMF specs are attached. Fabric and anodised aluminium need to look exactly right.\n\nSuccess looks like\nImages nobody can tell apart from photography — and source scenes we can re-light for future campaigns.',
    tags: ['product render', 'CGI', 'packshot', 'turntable'],
    priority: 'medium',
    days: 14,
    revisionLimit: 2,
    deliverables: ['Hero render 4K', '360° turntable video', 'Exploded view', 'Lifestyle scenes ×3', 'Transparent PNG packshots'],
    style: {
      palette: ['#E8E6E1', '#2B2B2B', '#B3472E', '#5E7A8A', '#F4F1EA'],
      fonts: ['Neue Montreal'],
      mood: ['Luxury', 'Minimal', 'Techy'],
      references: [{ label: 'Lighting reference', url: 'https://www.behance.net/' }],
      dos: ['Soft studio lighting', 'Show the fabric texture'],
      donts: ['Don’t crop the product', 'No lens flares'],
      notes: 'Colourways: Ember, Slate, Sand. Retailers need 3000×3000 px minimum.',
    },
  },
  {
    id: 'tpl-book-cover',
    name: 'Book cover illustration',
    discipline: 'illustration',
    art: ['illustration', 'type', 'illustration'],
    title: 'Book cover illustration — literary debut',
    summary: 'An illustrated cover (full wrap) for a literary novel set on the Portuguese coast.',
    description:
      '“The Salt Year” is a debut novel about a family running a small sardine cannery over one summer. We are looking for an illustrated cover that feels literary, warm and a little mysterious.\n\nGoals\n• A cover that stands out on a table of bestsellers\n• Works as a small thumbnail online\n• Full wrap for the hardback (spine + back)\n\nProcess\nThree rough sketches first, one refined direction, then final art. Title lettering can be hand-drawn or set — open to ideas.\n\nSuccess looks like\nA cover booksellers want to face out.',
    tags: ['book cover', 'editorial', 'print'],
    priority: 'low',
    days: 21,
    revisionLimit: 3,
    deliverables: ['Sketch round ×3 options', 'Book cover (full wrap)', 'Ebook cover 1600×2560', 'Print-ready CMYK PDF'],
    style: {
      palette: ['#F4EBD9', '#1D3557', '#E63946', '#A8DADC', '#457B9D'],
      fonts: ['Fraunces', 'Cormorant Garamond'],
      mood: ['Organic', 'Retro', 'Whimsical'],
      references: [{ label: 'Publisher cover archive', url: 'https://www.penguin.co.uk/' }],
      dos: ['Hand-made textures', 'Readable title at thumbnail size'],
      donts: ['No photo collage'],
      notes: 'Trim size 135×216 mm, 3 mm bleed, spine 28 mm (to be confirmed by the printer).',
    },
  },
  {
    id: 'tpl-identity',
    name: 'Brand identity',
    discipline: 'brand',
    art: ['logo', 'pattern', 'type'],
    title: 'Brand identity for a neighbourhood coffee roaster',
    summary: 'Logo suite, palette, type system and guidelines for a new specialty coffee brand.',
    description:
      'We are opening a small-batch roastery with a café in Lisbon this spring and need an identity from scratch.\n\nGoals\n• A distinctive mark that works on cups, bags and the shop sign\n• A flexible system (pattern, type, colour) for packaging and social\n• Guidelines simple enough for a two-person team\n\nPersonality\nCraft-driven, generous, a bit playful. Specialty coffee without the snobbery.\n\nSuccess looks like\nAn identity that feels like it has always been part of the street.',
    tags: ['identity', 'logo', 'packaging', 'guidelines'],
    priority: 'medium',
    days: 24,
    revisionLimit: 3,
    deliverables: ['Logo suite (primary, secondary, mark)', 'Colour palette', 'Typography system', 'Brand pattern', 'Brand guidelines PDF', 'Social avatar & cover'],
    style: {
      palette: ['#FBF7EF', '#3B2A20', '#C8553D', '#F2A541', '#588B8B'],
      fonts: ['Recoleta', 'DM Sans'],
      mood: ['Warm', 'Playful', 'Organic'],
      references: [{ label: 'Moodboard (Are.na)', url: 'https://www.are.na/' }],
      dos: ['Think about the cup first', 'Leave room for illustration'],
      donts: ['No coffee-bean clichés'],
      notes: 'Name: “Tide & Toast”. We would love a mark that works stamped in one colour.',
    },
  },
]

// ─────────────────────────── apply ───────────────────────────

export function templateToDraft(tpl: BriefTemplate, base: BriefDraft): BriefDraft {
  return {
    ...base,
    templateId: tpl.id,
    title: tpl.title,
    summary: tpl.summary,
    description: tpl.description,
    discipline: tpl.discipline,
    tags: [...tpl.tags],
    priority: tpl.priority,
    budgetTouched: false,
    dueAt: dueInDays(tpl.days),
    revisionLimit: tpl.revisionLimit,
    deliverables: tpl.deliverables.map(deliverable),
    style: {
      ...emptyStyle(),
      ...tpl.style,
      references: tpl.style.references.map((r) => ({ id: uid('rf_'), ...r })),
    },
  }
}

/**
 * Re-use a past job as the starting point: same designer, scope and style.
 * Only link assets are carried over — uploaded files stay with the original
 * job so removing them here can never delete the job's own blobs.
 */
export function jobToDraft(job: Job, base: BriefDraft): BriefDraft {
  return {
    ...base,
    templateId: null,
    designerId: job.designerId,
    title: `${job.title} (follow-up)`.slice(0, 80),
    summary: job.summary,
    description: job.description,
    discipline: job.discipline,
    tags: [...job.tags],
    priority: job.priority,
    budget: job.budget,
    budgetTouched: true,
    dueAt: null,
    revisionLimit: job.revisionLimit,
    deliverables: job.deliverables.map((d) => deliverable(d.label)),
    style: {
      ...emptyStyle(),
      ...job.styleGuide,
      references: job.styleGuide.references.map((r) => ({ ...r, id: uid('rf_') })),
    },
    assets: [...base.assets, ...job.assets.filter((a) => a.kind === 'link').map((a) => ({ ...a, id: uid('a_'), addedAt: new Date().toISOString() }))],
  }
}

// ─────────────────────────── user templates ───────────────────────────

const USER_KEY = 'designtab-brief-templates'

export function loadUserTemplates(): BriefTemplate[] {
  try {
    const raw = localStorage.getItem(USER_KEY)
    const arr = raw ? (JSON.parse(raw) as BriefTemplate[]) : []
    return Array.isArray(arr) ? arr.filter((t) => t && t.id && t.title) : []
  } catch {
    return []
  }
}

function storeUserTemplates(list: BriefTemplate[]) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(list))
  } catch {
    /* quota — ignore */
  }
}

export function saveUserTemplate(d: BriefDraft, name: string): BriefTemplate {
  const days = d.dueAt ? Math.max(3, Math.round((new Date(d.dueAt).getTime() - Date.now()) / 864e5)) : 14
  const tpl: BriefTemplate = {
    id: uid('tpl_'),
    name: name.trim() || d.title.trim() || 'My template',
    discipline: d.discipline ?? 'visual',
    art: ['poster', 'mesh', 'pattern'],
    title: d.title,
    summary: d.summary,
    description: d.description,
    tags: d.tags,
    priority: d.priority,
    days,
    revisionLimit: d.revisionLimit,
    deliverables: d.deliverables.map((x) => x.label),
    style: { ...d.style, references: d.style.references.map(({ label, url }) => ({ label, url })) },
    custom: true,
    savedAt: new Date().toISOString(),
  }
  storeUserTemplates([tpl, ...loadUserTemplates()].slice(0, 12))
  return tpl
}

export function removeUserTemplate(id: string) {
  storeUserTemplates(loadUserTemplates().filter((t) => t.id !== id))
}

/**
 * "Write with AI" — an offline, template-based brief writer. It reads the
 * title, discipline, deliverables, style and timeline from the draft and
 * composes a structured English description. Output is user content, so it
 * is always English (never translated).
 */
import { differenceInCalendarDays, format } from 'date-fns'
import type { Designer, DisciplineId } from '@/store/types'
import { prng } from '@/lib/random'
import type { BriefDraft } from './model'

export type AiTone = 'balanced' | 'concise' | 'detailed' | 'friendly'

const DISC: Record<DisciplineId, { noun: string; verb: string; goals: string[]; audience: string[]; success: string[]; process: string }> = {
  visual: {
    noun: 'visual design',
    verb: 'create a campaign look that works from poster to phone screen',
    goals: ['One memorable key visual that carries the whole idea', 'Assets that stay consistent across print, web and social', 'A system our team can extend after launch'],
    audience: ['people who discover products on Instagram and in-store', 'busy professionals scrolling on their phones', 'a design-savvy audience that notices details'],
    success: ['The work stops the scroll and is instantly recognisable as ours', 'Every format feels like part of one family'],
    process: 'Two creative directions first, then one refined route rolled out across all formats.',
  },
  video: {
    noun: 'video editing',
    verb: 'shape our footage into a story people watch to the end',
    goals: ['A strong hook in the first 15 seconds', 'A clear story arc with good pacing', 'Cut-downs that work with the sound off'],
    audience: ['YouTube viewers who expect tight, well-paced edits', 'social audiences watching vertically on mute', 'customers who want to see the people behind the product'],
    success: ['High average view duration and shares', 'Vertical cuts that perform without extra work from us'],
    process: 'A paper edit from the transcripts, a rough cut for structure, then fine cut, grade and mix.',
  },
  motion: {
    noun: 'motion design',
    verb: 'bring our brand to life with precise, springy motion',
    goals: ['Motion that feels crafted and on-brand', 'Lightweight exports for web and app', 'Principles we can reuse across the product'],
    audience: ['people meeting our brand for the first time', 'app users who notice small moments of delight', 'viewers of our video content and ads'],
    success: ['Motion our team wants to use everywhere', 'Smooth playback on mid-range phones'],
    process: 'Storyboard and styleframes first, then animatic, then final animation and exports.',
  },
  illustration: {
    noun: 'illustration',
    verb: 'create original artwork with a distinctive, hand-made voice',
    goals: ['Artwork that feels unmistakably ours', 'Works at thumbnail size and in large print', 'A style we can build a series around'],
    audience: ['readers browsing a crowded shelf', 'a curious audience that loves craft', 'families and gift buyers'],
    success: ['People pick it up because of the artwork', 'The illustration becomes part of how we are recognised'],
    process: 'Three rough sketches, one refined direction, then final artwork and print-ready files.',
  },
  brand: {
    noun: 'brand identity',
    verb: 'build an identity system that feels like it has always existed',
    goals: ['A distinctive mark that works small and large', 'A flexible system of colour, type and pattern', 'Guidelines simple enough for a small team'],
    audience: ['locals and regulars who value craft', 'retail buyers and partners', 'a younger audience discovering us online'],
    success: ['An identity people remember after one encounter', 'Consistent results without the designer in the room'],
    process: 'Discovery and moodboards, two identity routes, one refined system, then guidelines and roll-out.',
  },
  uiux: {
    noun: 'UI/UX design',
    verb: 'design a clearer, friendlier product experience',
    goals: ['Reduce friction in the key flow', 'Reuse our design system where possible', 'Specs engineering can build without guesswork'],
    audience: ['first-time users on mobile', 'busy professionals who need answers fast', 'existing customers who expect continuity'],
    success: ['Measurably better completion in the key flow', 'A prototype validated with real users'],
    process: 'Flow mapping and wireframes, hi-fi screens, an interactive prototype, a quick usability test and handoff.',
  },
  '3d': {
    noun: '3D & CGI',
    verb: 'produce photoreal renders that sell the materials and details',
    goals: ['Images indistinguishable from photography', 'Accurate materials and colourways', 'Source scenes we can re-light for future campaigns'],
    audience: ['online shoppers comparing products side by side', 'retail partners who need clean packshots', 'tech press and launch ads'],
    success: ['Renders that outperform our photography', 'Assets delivered before samples arrive'],
    process: 'Model check and clay renders, lighting and look-dev, then final renders and animation.',
  },
}

const OPENERS: Record<AiTone, ((title: string, noun: string) => string)[]> = {
  balanced: [(t, n) => `We are looking for a ${n} partner for “${t}”.`, (t, n) => `“${t}” needs a ${n} specialist with a sharp eye for detail.`],
  concise: [(t) => `Project: ${t}.`],
  detailed: [(t, n) => `This brief describes “${t}”, a ${n} project we want to get exactly right — here is everything we know so far.`],
  friendly: [(t) => `Hi! We are so excited to work with you on “${t}” 👋`, (t) => `Hello there — thanks for taking a look at “${t}”!`],
}

/** Builds the description. `seed` lets "Regenerate" produce a variation. */
export function generateDescription(d: BriefDraft, designer: Designer | undefined, tone: AiTone = 'balanced', seed = 0): string {
  const disc = d.discipline ?? designer?.primary ?? 'visual'
  const k = DISC[disc]
  const r = prng(`${d.title}|${disc}|${tone}|${seed}`)
  const title = d.title.trim() || 'our new project'
  const out: string[] = []

  // Overview
  const opener = r.pick(OPENERS[tone])(title, k.noun)
  const summary = d.summary.trim() ? ` ${d.summary.trim().replace(/\.?$/, '.')}` : ''
  out.push(`${opener}${summary} We want to ${k.verb}.`)

  // Goals
  const goals = r.shuffle(k.goals).slice(0, tone === 'concise' ? 2 : 3)
  out.push(['Goals', ...goals.map((g) => `• ${g}`)].join('\n'))

  if (tone !== 'concise') out.push(`Audience\nThe work is for ${r.pick(k.audience)}.`)

  // Deliverables
  if (d.deliverables.length) {
    const items = d.deliverables.map((x) => `• ${x.label}`)
    out.push(['What we need', ...(tone === 'concise' ? items.slice(0, 5) : items)].join('\n') + (tone === 'concise' && items.length > 5 ? `\n• …and ${items.length - 5} more` : ''))
  }

  // Style
  const s = d.style
  const styleBits: string[] = []
  if (s.mood.length) styleBits.push(`The mood is ${listJoin(s.mood.map((m) => m.toLowerCase()))}.`)
  if (s.palette.length) styleBits.push(`Palette: ${s.palette.slice(0, 6).join(', ')}.`)
  if (s.fonts.length) styleBits.push(`Typography: ${listJoin(s.fonts)}.`)
  if (s.dos.length) styleBits.push(`Please ${s.dos.slice(0, 2).map(lowerFirst).join(' and ')}.`)
  if (s.donts.length) styleBits.push(`Avoid: ${s.donts.slice(0, 2).map(lowerFirst).join('; ')}.`)
  if (styleBits.length) out.push(`Look & feel\n${styleBits.join(' ')}`)

  // Process & timeline
  if (tone !== 'concise') out.push(`Process\n${k.process}`)
  const tl: string[] = []
  if (d.dueAt) {
    const days = differenceInCalendarDays(new Date(d.dueAt), new Date())
    tl.push(`Final delivery by ${format(new Date(d.dueAt), 'EEEE, d MMMM')} (${days} day${days === 1 ? '' : 's'} from today).`)
  }
  tl.push(`The budget includes up to ${d.revisionLimit} revision round${d.revisionLimit === 1 ? '' : 's'}.`)
  if (d.priority === 'urgent') tl.push('This one is urgent — quick check-ins help a lot.')
  if (d.priority === 'high') tl.push('It is a high priority for us this month.')
  out.push(`Timeline\n${tl.join(' ')}`)

  if (tone === 'detailed') {
    out.push(['Success looks like', ...k.success.map((x) => `• ${x}`)].join('\n'))
    if (d.assets.length) out.push(`Assets\n${d.assets.length} file${d.assets.length === 1 ? '' : 's'} attached to this brief (${d.assets.slice(0, 3).map((a) => a.name).join(', ')}${d.assets.length > 3 ? ', …' : ''}).`)
  } else if (tone !== 'concise') {
    out.push(`Success looks like\n${r.pick(k.success)}.`)
  }

  if (tone === 'friendly') out.push(designer ? `Can’t wait to see what you come up with, ${designer.name.split(' ')[0]}! 🙌` : 'Can’t wait to see what you come up with! 🙌')
  return out.join('\n\n')
}

function listJoin(xs: string[]) {
  if (xs.length <= 1) return xs.join('')
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
}
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** Suggests a one-line summary when the client left it empty. */
export function generateSummary(d: BriefDraft): string {
  const disc = d.discipline ?? 'visual'
  const first = d.deliverables.slice(0, 2).map((x) => x.label.replace(/ ×\d+.*$/, '').toLowerCase())
  const what = first.length ? listJoin(first) : DISC[disc].noun
  return `${capitalize(what)} for ${d.title.trim() || 'our next launch'}.`.slice(0, 140)
}
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

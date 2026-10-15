/**
 * Work records — the common currency of Payments and Reports.
 *
 * Real records are derived from the jobs in the store. Before the first real
 * job/invoice of the workspace we add a deterministic "imported history"
 * (seeded PRNG, stable per role and day) so 90-day and 12-month views look
 * like a real, lived-in studio rather than an empty chart. Synthetic records
 * never overlap with real data, so money totals stay consistent everywhere.
 */
import { prng } from '@/lib/random'
import {
  ME_CLIENT_ID,
  ME_DESIGNER_ID,
  type Client,
  type Designer,
  type DisciplineId,
  type Invoice,
  type Job,
  type JobStatus,
  type Role,
} from '@/store/types'

export const DAY = 864e5
export const HOUR = 36e5

export const ts = (iso?: string) => (iso ? new Date(iso).getTime() : NaN)

export function startOfDayMs(t = Date.now()) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export interface WorkRecord {
  id: string
  /** Real job from the store (false = imported history). */
  real: boolean
  jobId?: string
  title: string
  discipline: DisciplineId
  counterpartId: string
  status: JobStatus
  createdAt: number
  startedAt: number
  /** First delivered version. */
  firstDeliveryAt?: number
  /** Final hand-off (approval for real jobs). */
  doneAt?: number
  dueAt: number
  revisions: number
  rating?: number
  amount: number
  /** Hours from request to acceptance. */
  responseHrs?: number
}

const CLOSED: JobStatus[] = ['declined', 'cancelled']

/** Real records for the active role (all disciplines). */
export function realRecords(jobs: Job[], role: Role): WorkRecord[] {
  const me = role === 'client' ? ME_CLIENT_ID : ME_DESIGNER_ID
  return jobs
    .filter((j) => (role === 'client' ? j.clientId === me : j.designerId === me) && !CLOSED.includes(j.status))
    .map((j) => {
      const versions = j.versions.map((v) => ts(v.submittedAt)).filter(Number.isFinite)
      const created = ts(j.createdAt)
      const accepted = j.timeline
        .filter((e) => e.kind === 'accepted' || e.kind === 'counter')
        .map((e) => ts(e.at))
        .filter((t) => Number.isFinite(t) && t >= created)
        .sort((a, b) => a - b)[0]
      return {
        id: j.id,
        real: true,
        jobId: j.id,
        title: j.title,
        discipline: j.discipline,
        counterpartId: role === 'client' ? j.designerId : j.clientId,
        status: j.status,
        createdAt: created,
        startedAt: ts(j.startedAt) || created,
        firstDeliveryAt: versions.length ? Math.min(...versions) : undefined,
        doneAt: j.approvedAt ? ts(j.approvedAt) : undefined,
        dueAt: ts(j.dueAt),
        revisions: j.revisions.length,
        rating: j.rating,
        amount: j.budget,
        responseHrs: accepted ? Math.max(0.2, (accepted - created) / HOUR) : undefined,
      } satisfies WorkRecord
    })
}

/** Day before the first real activity of the role — imported history ends here. */
export function historyCutoff(jobs: Job[], invoices: Invoice[], role: Role, now = Date.now()): number {
  const me = role === 'client' ? ME_CLIENT_ID : ME_DESIGNER_ID
  let min = now
  for (const j of jobs) {
    if ((role === 'client' ? j.clientId : j.designerId) !== me) continue
    const c = ts(j.createdAt)
    if (c < min) min = c
  }
  for (const i of invoices) {
    if ((role === 'client' ? i.clientId : i.designerId) !== me) continue
    for (const t of [ts(i.issuedAt), ts(i.paidAt)]) if (Number.isFinite(t) && t < min) min = t
  }
  return startOfDayMs(min) - DAY
}

const TURNAROUND: Record<DisciplineId, number> = { visual: 6, video: 9, motion: 12, illustration: 8, brand: 11, uiux: 13, '3d': 14 }

const TITLES: Record<DisciplineId, string[]> = {
  visual: ['Campaign key visual', 'Social media kit', 'Spring promo set', 'Event poster series', 'Newsletter headers', 'Retail window graphics'],
  video: ['Product launch edit', 'Customer story cut-downs', 'Podcast video edit', 'Event highlight reel', 'Recruiting film', 'YouTube series edit'],
  motion: ['Logo animation', 'Explainer animation', 'Social motion pack', 'UI micro-interactions', 'Title sequence', 'Animated infographics'],
  illustration: ['Editorial spot illustrations', 'Packaging illustration', 'Mascot exploration', 'Icon illustration set', 'Book cover art', 'Map illustration'],
  brand: ['Brand refresh', 'Packaging system', 'Stationery suite', 'Brand guidelines', 'Trade fair booth', 'Annual report layout'],
  uiux: ['Checkout redesign', 'Onboarding flow', 'Design system tokens', 'Settings screens', 'Marketing site pages', 'Dashboard UI'],
  '3d': ['Product renders', 'CGI hero loop', 'Packaging mock-ups', '3D icon set', 'Interior visualisation', 'AR-ready model'],
}

/**
 * Deterministic imported history: ~3 completed projects a month for the
 * 13 months before `cutoff`, with collaborators drawn from the directory.
 */
export function syntheticRecords(role: Role, designers: Designer[], clients: Client[], cutoff: number, now = Date.now()): WorkRecord[] {
  const r = prng(`designtab-history-${role}`)
  const me = designers.find((d) => d.id === ME_DESIGNER_ID)
  const pool =
    role === 'client'
      ? designers.filter((d) => d.id !== ME_DESIGNER_ID && !d.registeredInApp).slice(0, 12)
      : clients.filter((c) => c.id !== ME_CLIENT_ID).slice(0, 10)
  if (!pool.length) return []
  const myDisc: DisciplineId[] = me?.disciplines.length ? me.disciplines : ['visual', 'brand', 'illustration']
  const out: WorkRecord[] = []
  const earliest = startOfDayMs(now) - 400 * DAY
  let t = cutoff - r.range(1, 6) * DAY
  let n = 0
  while (t > earliest && n < 160) {
    // favour the first few collaborators (repeat business)
    const idx = Math.min(pool.length - 1, Math.floor(Math.pow(r.next(), 1.7) * pool.length))
    const cp = pool[idx]
    let discipline: DisciplineId
    let onTimeRate = 0.9
    let responseBase = 4
    let amount: number
    if ('primary' in cp) {
      discipline = r.bool(0.65) ? cp.primary : r.pick(cp.disciplines)
      onTimeRate = cp.onTimeRate
      responseBase = cp.responseTimeHrs
    } else {
      const overlap = cp.disciplinesNeeded.filter((d) => myDisc.includes(d))
      discipline = overlap.length ? r.pick(overlap) : r.pick(myDisc)
      onTimeRate = me?.onTimeRate ?? 0.92
      responseBase = me?.responseTimeHrs ?? 3
    }
    const turnaround = TURNAROUND[discipline] * r.range(0.65, 1.4)
    const doneAt = t + r.range(9, 18) * HOUR
    const startedAt = doneAt - turnaround * DAY
    const createdAt = startedAt - r.range(0.4, 3.2) * DAY
    const late = r.next() > onTimeRate
    const dueAt = late ? doneAt - r.range(0.6, 3.5) * DAY : doneAt + r.range(0.2, 3) * DAY
    if ('primary' in cp) {
      amount = Math.round((cp.hourlyRate * turnaround * r.range(2.6, 4.8)) / 50) * 50
    } else {
      const [lo, hi] = cp.budgetRange
      amount = Math.round(r.range(lo, Math.max(lo + 200, hi * 0.8)) / 50) * 50
    }
    const rv = r.next()
    const revisions = rv < 0.3 ? 0 : rv < 0.7 ? 1 : rv < 0.92 ? 2 : 3
    const rt = r.next()
    const rating = rt < 0.66 ? 5 : rt < 0.95 ? 4 : 3
    out.push({
      id: `H-${role[0]}${(n + 1).toString().padStart(3, '0')}`,
      real: false,
      title: r.pick(TITLES[discipline]),
      discipline,
      counterpartId: cp.id,
      status: 'approved',
      createdAt,
      startedAt,
      firstDeliveryAt: startedAt + turnaround * DAY * r.range(0.5, 0.82),
      doneAt,
      dueAt,
      revisions,
      rating,
      amount: Math.max(350, amount),
      responseHrs: Math.max(0.3, responseBase * r.range(0.45, 1.7)),
    })
    n++
    t -= r.range(5, 15) * DAY
  }
  return out
}

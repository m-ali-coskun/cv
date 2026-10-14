import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { uid, nextInvoiceId, nextJobId } from '@/lib/ids'
import { clearFiles } from '@/lib/files'
import { createSeed } from './seed'
import { sim } from './simulation'
import { toast } from './toasts'
import { useUI } from './ui'
import {
  ME_CLIENT_ID,
  ME_DESIGNER_ID,
  type AppNotification,
  type Asset,
  type CalendarEvent,
  type Client,
  type Conversation,
  type DeliveryVersion,
  type Designer,
  type DisciplineFilter,
  type Invoice,
  type Job,
  type JobStatus,
  type Lang,
  type Match,
  type MediaRef,
  type Message,
  type MessageKind,
  type NewJobInput,
  type PortfolioItem,
  type Role,
  type Settings,
  type StyleGuide,
  type SwipeDecision,
  type TimelineEvent,
} from './types'

export * from './types'

const STORE_VERSION = 4
const LAST_ACTIVE_KEY = 'designtab-last-active'
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

/**
 * Demo data is time-relative ("due in 2 days"). When a visitor comes back
 * after a while, shift every timestamp forward by the time they were away so
 * the workspace looks exactly as alive as when they left.
 */
function shiftDates<T>(value: T, deltaMs: number): T {
  if (typeof value === 'string') {
    return (ISO_RE.test(value) ? new Date(new Date(value).getTime() + deltaMs).toISOString() : value) as T
  }
  if (Array.isArray(value)) return value.map((v) => shiftDates(v, deltaMs)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = shiftDates(v, deltaMs)
    return out as T
  }
  return value
}

function touchLastActive() {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, new Date().toISOString())
  } catch {
    /* storage unavailable */
  }
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'en',
  role: 'client',
  discipline: 'all',
  theme: 'light',
  accentMode: 'discipline',
  fixedAccent: 'all',
  motion: 'expressive',
  glass: 'frosted',
  animatedBackground: true,
  refraction: true,
  sound: false,
  aiAssistant: true,
  compact: false,
  onboardingDone: false,
  sidebarCollapsed: false,
  notificationsEmail: true,
  notificationsPush: true,
  weekStartsOn: 1,
  currency: 'EUR',
}

export interface AppData {
  settings: Settings
  designers: Designer[]
  clients: Client[]
  /** Swipe decisions, per role, keyed by the profile id that was swiped. */
  decisions: Record<Role, Record<string, SwipeDecision>>
  matches: Match[]
  superLikesLeft: number
  jobs: Job[]
  conversations: Conversation[]
  messages: Message[]
  notifications: AppNotification[]
  invoices: Invoice[]
  events: CalendarEvent[]
  seededAt: string
}

export interface SendMessageInput {
  text: string
  kind?: MessageKind
  attachments?: MediaRef[]
  jobId?: string
  replyToId?: string
  duration?: number
}

export interface AppActions {
  // settings
  setSettings: (patch: Partial<Settings>) => void
  setLang: (lang: Lang) => void
  setRole: (role: Role) => void
  setDiscipline: (d: DisciplineFilter) => void
  completeOnboarding: () => void
  resetDemo: () => Promise<void>

  // matching
  swipe: (profileId: string, decision: SwipeDecision) => { matched: boolean; match?: Match }
  undoSwipe: (profileId: string) => void
  unmatch: (matchId: string) => void
  toggleFavoriteMatch: (matchId: string) => void
  setMatchNote: (matchId: string, note: string) => void
  /** Directly create a match (used by simulation). */
  createMatch: (clientId: string, designerId: string, initiatedBy: Role, superLike?: boolean) => Match

  // jobs — client side
  createJob: (input: NewJobInput) => Job
  respondCounterOffer: (jobId: string, accept: boolean) => void
  requestRevision: (jobId: string, input: { summary: string; items: string[]; versionId?: string }) => void
  approveJob: (jobId: string, input?: { rating?: number; review?: string }) => void
  cancelJob: (jobId: string) => void
  releaseMilestone: (jobId: string, milestoneId: string) => void
  // jobs — designer side
  acceptJob: (jobId: string, opts?: { counterDueAt?: string; note?: string }) => void
  declineJob: (jobId: string, reason?: string) => void
  setJobStatus: (jobId: string, status: JobStatus, opts?: { silent?: boolean }) => void
  setJobProgress: (jobId: string, progress: number) => void
  submitVersion: (jobId: string, input: { note: string; media: MediaRef[] }) => void
  startTimer: (jobId: string) => void
  stopTimer: (jobId: string) => void
  logTime: (jobId: string, minutes: number) => void
  toggleRevisionItem: (jobId: string, revisionId: string, itemId: string) => void
  resolveRevision: (jobId: string, revisionId: string) => void
  /** Simulation helper: a client sends designer-Ali a fresh job request. */
  spawnIncomingRequest: () => Job | undefined
  // jobs — both sides
  updateJob: (jobId: string, patch: Partial<Job>) => void
  toggleStar: (jobId: string) => void
  toggleDeliverable: (jobId: string, deliverableId: string) => void
  addDeliverable: (jobId: string, label: string) => void
  removeDeliverable: (jobId: string, deliverableId: string) => void
  addAssets: (jobId: string, assets: Asset[]) => void
  removeAsset: (jobId: string, assetId: string) => void
  updateStyleGuide: (jobId: string, patch: Partial<StyleGuide>) => void
  addAnnotation: (
    jobId: string,
    versionId: string,
    a: { x: number; y: number; mediaIndex: number; text: string },
  ) => void
  toggleAnnotation: (jobId: string, versionId: string, annotationId: string) => void
  removeAnnotation: (jobId: string, versionId: string, annotationId: string) => void
  addComment: (jobId: string, text: string) => void

  // chat
  ensureConversation: (clientId: string, designerId: string) => string
  sendMessage: (conversationId: string, input: SendMessageInput) => Message
  /** Post a message as an arbitrary sender (used by simulation / system). */
  postMessage: (conversationId: string, senderId: string, input: SendMessageInput) => Message
  editMessage: (messageId: string, text: string) => void
  deleteMessage: (messageId: string) => void
  toggleReaction: (messageId: string, emoji: string, by?: string) => void
  markConversationRead: (conversationId: string, readerId?: string) => void
  togglePinConversation: (conversationId: string) => void
  toggleMuteConversation: (conversationId: string) => void
  toggleArchiveConversation: (conversationId: string) => void
  setDraft: (conversationId: string, text: string) => void

  // notifications
  notify: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>, opts?: { toast?: boolean }) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  clearNotifications: () => void

  // profile / registration
  updateMyProfile: (patch: Partial<Designer>) => void
  addPortfolioItem: (item: Omit<PortfolioItem, 'id' | 'likes' | 'views'>) => PortfolioItem
  updatePortfolioItem: (id: string, patch: Partial<PortfolioItem>) => void
  removePortfolioItem: (id: string) => void
  reorderPortfolio: (ids: string[]) => void
  registerDesigner: (
    input: Omit<
      Designer,
      | 'id'
      | 'rating'
      | 'reviewsCount'
      | 'completedJobs'
      | 'joinedAt'
      | 'isNew'
      | 'verified'
      | 'topRated'
      | 'reviews'
      | 'interestedInYou'
      | 'registeredInApp'
      | 'onTimeRate'
      | 'repeatClientRate'
      | 'responseTimeHrs'
    > &
      Partial<Pick<Designer, 'responseTimeHrs'>>,
  ) => Designer
  removeDesigner: (id: string) => void
  updateClientProfile: (patch: Partial<Client>) => void

  // money
  payInvoice: (invoiceId: string) => void
  sendInvoiceReminder: (invoiceId: string) => void
  createInvoice: (jobId: string) => Invoice | undefined
  requestPayout: (amount: number) => void

  // calendar
  addEvent: (e: Omit<CalendarEvent, 'id' | 'role'> & { role?: Role }) => CalendarEvent
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void
  removeEvent: (id: string) => void
}

export type AppState = AppData & AppActions

// ─────────────────────────── helpers ───────────────────────────

const nowIso = () => new Date().toISOString()
export const meIdFor = (role: Role) => (role === 'client' ? ME_CLIENT_ID : ME_DESIGNER_ID)

function freshData(): AppData {
  const seed = createSeed()
  return {
    settings: { ...DEFAULT_SETTINGS },
    superLikesLeft: 3,
    ...seed,
    seededAt: nowIso(),
  }
}

function event(kind: TimelineEvent['kind'], actorId: string, text: string, meta?: TimelineEvent['meta']): TimelineEvent {
  return { id: uid('ev_'), kind, at: nowIso(), actorId, text, meta }
}

const STATUS_TEXT: Record<JobStatus, string> = {
  requested: 'Requested',
  queued: 'Queued',
  in_progress: 'In progress',
  final_touches: 'Final touches',
  in_review: 'In review',
  revisions: 'Revisions',
  approved: 'Approved',
  declined: 'Declined',
  cancelled: 'Cancelled',
}
export const statusText = (s: JobStatus) => STATUS_TEXT[s]

const PROGRESS_FLOOR: Partial<Record<JobStatus, number>> = {
  queued: 0,
  in_progress: 15,
  final_touches: 80,
  in_review: 95,
  approved: 100,
}

// ─────────────────────────── store ───────────────────────────

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      const nameOf = (id: string) =>
        get().designers.find((d) => d.id === id)?.name ?? get().clients.find((c) => c.id === id)?.name ?? 'Someone'
      const seedOf = (id: string) =>
        get().designers.find((d) => d.id === id)?.avatarSeed ?? get().clients.find((c) => c.id === id)?.avatarSeed

      const patchJob = (jobId: string, fn: (j: Job) => Job) =>
        set((s) => ({ jobs: s.jobs.map((j) => (j.id === jobId ? { ...fn(j), updatedAt: nowIso() } : j)) }))

      const jobById = (jobId: string) => get().jobs.find((j) => j.id === jobId)

      const convForJob = (job: Job) => job.conversationId ?? get().ensureConversation(job.clientId, job.designerId)

      const postSystem = (job: Job, senderId: string, kind: MessageKind, text: string, extra?: Partial<SendMessageInput>) =>
        get().postMessage(convForJob(job), senderId, { kind, text, jobId: job.id, ...extra })

      return {
        ...freshData(),

        // ───────── settings ─────────
        setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        setLang: (lang) => set((s) => ({ settings: { ...s.settings, lang } })),
        setRole: (role) => {
          set((s) => ({ settings: { ...s.settings, role } }))
          if (role === 'designer') sim.onEnterDesignerRole()
        },
        setDiscipline: (discipline) => set((s) => ({ settings: { ...s.settings, discipline } })),
        completeOnboarding: () => set((s) => ({ settings: { ...s.settings, onboardingDone: true } })),
        resetDemo: async () => {
          sim.cancelAll()
          await clearFiles().catch(() => undefined)
          const keep = get().settings
          set({ ...freshData(), settings: { ...DEFAULT_SETTINGS, lang: keep.lang, theme: keep.theme, onboardingDone: true } })
        },

        // ───────── matching ─────────
        createMatch: (clientId, designerId, initiatedBy, superLike = false) => {
          const existing = get().matches.find((m) => m.clientId === clientId && m.designerId === designerId)
          if (existing) return existing
          const match: Match = {
            id: uid('mt_'),
            clientId,
            designerId,
            createdAt: nowIso(),
            initiatedBy,
            superLike,
            favorite: false,
          }
          set((s) => ({ matches: [match, ...s.matches] }))
          get().ensureConversation(clientId, designerId)
          return match
        },
        swipe: (profileId, decision) => {
          const role = get().settings.role
          if (decision === 'super') {
            if (get().superLikesLeft <= 0) decision = 'like'
            else set((s) => ({ superLikesLeft: s.superLikesLeft - 1 }))
          }
          set((s) => ({ decisions: { ...s.decisions, [role]: { ...s.decisions[role], [profileId]: decision } } }))
          if (decision === 'pass') return { matched: false }

          const profile =
            role === 'client'
              ? get().designers.find((d) => d.id === profileId)
              : get().clients.find((c) => c.id === profileId)
          if (!profile) return { matched: false }

          const clientId = role === 'client' ? ME_CLIENT_ID : profileId
          const designerId = role === 'client' ? profileId : ME_DESIGNER_ID
          // Super likes always land; regular likes depend on the profile's interest.
          if (profile.interestedInYou || decision === 'super') {
            const match = get().createMatch(clientId, designerId, role, decision === 'super')
            get().notify({
              role,
              kind: 'match',
              title: `It's a match with ${profile.name}!`,
              body: 'You both liked each other. Say hi and send a first brief.',
              link: role === 'client' ? `/network/${profileId}` : `/network/${profileId}`,
              actorAvatarSeed: profile.avatarSeed,
            })
            sim.onMatched(match)
            return { matched: true, match }
          }
          sim.onLikedWithoutMatch(profileId, role)
          return { matched: false }
        },
        undoSwipe: (profileId) => {
          const role = get().settings.role
          set((s) => {
            const next = { ...s.decisions[role] }
            delete next[profileId]
            return { decisions: { ...s.decisions, [role]: next } }
          })
        },
        unmatch: (matchId) => set((s) => ({ matches: s.matches.filter((m) => m.id !== matchId) })),
        toggleFavoriteMatch: (matchId) =>
          set((s) => ({ matches: s.matches.map((m) => (m.id === matchId ? { ...m, favorite: !m.favorite } : m)) })),
        setMatchNote: (matchId, note) =>
          set((s) => ({ matches: s.matches.map((m) => (m.id === matchId ? { ...m, note } : m)) })),

        // ───────── jobs: client ─────────
        createJob: (input) => {
          const clientId = input.clientId ?? ME_CLIENT_ID
          const id = nextJobId(get().jobs.map((j) => j.id))
          const conversationId = get().ensureConversation(clientId, input.designerId)
          const created = nowIso()
          const job: Job = {
            id,
            title: input.title,
            summary: input.summary,
            description: input.description,
            clientId,
            designerId: input.designerId,
            discipline: input.discipline,
            status: 'requested',
            priority: input.priority,
            createdAt: created,
            updatedAt: created,
            dueAt: input.dueAt,
            budget: input.budget,
            currency: get().settings.currency,
            progress: 0,
            deliverables: input.deliverables.map((label) => ({ id: uid('dl_'), label, done: false })),
            styleGuide: input.styleGuide,
            assets: input.assets,
            versions: [],
            revisions: [],
            revisionLimit: input.revisionLimit,
            timeline: [event('created', clientId, `Brief sent to ${nameOf(input.designerId)}`)],
            milestones: [
              { id: uid('ms_'), label: 'Kick-off (30%)', amount: Math.round(input.budget * 0.3), dueAt: created, status: 'escrow' },
              { id: uid('ms_'), label: 'Final delivery (70%)', amount: Math.round(input.budget * 0.7), dueAt: input.dueAt, status: 'escrow' },
            ],
            tags: input.tags,
            cover: { kind: 'art', seed: id, variant: 'poster', discipline: input.discipline },
            timeTrackedMin: 0,
            conversationId,
            starred: false,
          }
          const invoice: Invoice = {
            id: nextInvoiceId(get().invoices.map((i) => i.id)),
            jobId: id,
            clientId,
            designerId: input.designerId,
            amount: input.budget,
            currency: job.currency,
            status: 'escrow',
            issuedAt: created,
            dueAt: input.dueAt,
            lineItems: [{ label: input.title, amount: input.budget }],
          }
          set((s) => ({
            jobs: [job, ...s.jobs],
            invoices: [invoice, ...s.invoices],
            conversations: s.conversations.map((c) =>
              c.id === conversationId && !c.jobIds.includes(id) ? { ...c, jobIds: [id, ...c.jobIds] } : c,
            ),
          }))
          get().postMessage(conversationId, clientId, {
            kind: 'brief',
            text: `New brief: ${input.title}\n${input.summary}`,
            jobId: id,
          })
          if (clientId === ME_CLIENT_ID) sim.onBriefSent(id)
          return job
        },
        respondCounterOffer: (jobId, accept) => {
          const job = jobById(jobId)
          if (!job?.counterOffer) return
          patchJob(jobId, (j) => ({
            ...j,
            dueAt: accept ? j.counterOffer!.dueAt : j.dueAt,
            status: accept ? 'queued' : j.status,
            counterOffer: { ...j.counterOffer!, status: accept ? 'accepted' : 'rejected' },
            timeline: [
              event('counter', j.clientId, accept ? 'New deadline accepted' : 'Counter-offer declined'),
              ...j.timeline,
            ],
          }))
          postSystem(
            job,
            job.clientId,
            'text',
            accept
              ? 'The new deadline works for us — let’s go! 🙌'
              : 'We really need the original deadline, could you make it work?',
          )
          if (job.clientId === ME_CLIENT_ID) sim.onCounterAnswered(jobId, accept)
        },
        requestRevision: (jobId, { summary, items, versionId }) => {
          const job = jobById(jobId)
          if (!job) return
          const vId = versionId ?? job.versions[job.versions.length - 1]?.id
          patchJob(jobId, (j) => ({
            ...j,
            status: 'revisions',
            progress: Math.min(j.progress, 75),
            versions: j.versions.map((v) => (v.id === vId ? { ...v, status: 'changes_requested' } : v)),
            revisions: [
              ...j.revisions,
              {
                id: uid('rv_'),
                versionId: vId,
                requestedAt: nowIso(),
                requestedBy: j.clientId,
                summary,
                items: items.filter(Boolean).map((text) => ({ id: uid('ri_'), text, done: false })),
                status: 'open',
              },
            ],
            timeline: [event('revision', j.clientId, `Revision requested: ${summary}`), ...j.timeline],
          }))
          postSystem(job, job.clientId, 'revision', `${summary}${items.length ? '\n• ' + items.filter(Boolean).join('\n• ') : ''}`)
          if (job.clientId === ME_CLIENT_ID) sim.onRevisionRequested(jobId)
        },
        approveJob: (jobId, input) => {
          const job = jobById(jobId)
          if (!job) return
          patchJob(jobId, (j) => ({
            ...j,
            status: 'approved',
            progress: 100,
            approvedAt: nowIso(),
            rating: input?.rating ?? j.rating,
            review: input?.review ?? j.review,
            blocker: undefined,
            versions: j.versions.map((v, i) => (i === j.versions.length - 1 ? { ...v, status: 'approved' } : v)),
            revisions: j.revisions.map((r) => ({ ...r, status: 'resolved' })),
            milestones: j.milestones.map((m) => ({ ...m, status: 'released' })),
            timeline: [
              event('payment', j.clientId, 'Escrow released to designer'),
              event('approved', j.clientId, `Final delivery approved${input?.rating ? ` · ${input.rating}★` : ''}`),
              ...j.timeline,
            ],
          }))
          set((s) => ({
            invoices: s.invoices.map((inv) =>
              inv.jobId === jobId && inv.status !== 'paid' ? { ...inv, status: 'paid', paidAt: nowIso() } : inv,
            ),
          }))
          postSystem(
            job,
            job.clientId,
            'approval',
            input?.review ? `Approved ✅ — “${input.review}”` : 'Approved ✅ — fantastic work, thank you!',
          )
          if (job.designerId === ME_DESIGNER_ID) {
            get().notify(
              {
                role: 'designer',
                kind: 'approved',
                title: `${nameOf(job.clientId)} approved ${job.id}`,
                body: `Payment of ${job.budget} ${job.currency} released.`,
                link: `/jobs/${job.id}`,
                actorAvatarSeed: seedOf(job.clientId),
              },
              { toast: get().settings.role === 'designer' },
            )
          }
          if (job.clientId === ME_CLIENT_ID) sim.onApproved(jobId)
        },
        cancelJob: (jobId) => {
          const job = jobById(jobId)
          if (!job) return
          patchJob(jobId, (j) => ({
            ...j,
            status: 'cancelled',
            timerStartedAt: undefined,
            timeline: [event('status', get().settings.role === 'client' ? j.clientId : j.designerId, 'Job cancelled'), ...j.timeline],
          }))
          set((s) => ({ invoices: s.invoices.map((inv) => (inv.jobId === jobId && inv.status !== 'paid' ? { ...inv, status: 'draft' } : inv)) }))
        },
        releaseMilestone: (jobId, milestoneId) => {
          const job = jobById(jobId)
          const ms = job?.milestones.find((m) => m.id === milestoneId)
          if (!job || !ms) return
          patchJob(jobId, (j) => ({
            ...j,
            milestones: j.milestones.map((m) => (m.id === milestoneId ? { ...m, status: 'released' } : m)),
            timeline: [event('payment', j.clientId, `Milestone released: ${ms.label}`), ...j.timeline],
          }))
        },

        // ───────── jobs: designer ─────────
        acceptJob: (jobId, opts) => {
          const job = jobById(jobId)
          if (!job) return
          const counter = opts?.counterDueAt
          patchJob(jobId, (j) => ({
            ...j,
            status: counter ? 'requested' : 'queued',
            counterOffer: counter ? { dueAt: counter, note: opts?.note ?? '', status: 'pending' } : j.counterOffer,
            timeline: [
              event(
                counter ? 'counter' : 'accepted',
                j.designerId,
                counter ? 'Accepted with a new deadline proposal' : 'Job accepted and added to the queue',
              ),
              ...j.timeline,
            ],
          }))
          postSystem(
            job,
            job.designerId,
            counter ? 'text' : 'status',
            counter
              ? `I'd love to take this on! Could we move the deadline to ${new Date(counter).toDateString()}? ${opts?.note ?? ''}`.trim()
              : opts?.note || 'Accepted ✅ — your job is in my queue. I’ll keep you posted here.',
          )
          if (job.clientId === ME_CLIENT_ID && job.designerId !== ME_DESIGNER_ID) {
            get().notify(
              {
                role: 'client',
                kind: counter ? 'job_request' : 'job_accepted',
                title: counter ? `${nameOf(job.designerId)} proposed a new deadline` : `${nameOf(job.designerId)} accepted ${job.id}`,
                body: job.title,
                link: `/jobs/${job.id}`,
                actorAvatarSeed: seedOf(job.designerId),
              },
              { toast: get().settings.role === 'client' },
            )
          }
          if (job.designerId === ME_DESIGNER_ID) sim.onDesignerAccepted(jobId, !!counter)
        },
        declineJob: (jobId, reason) => {
          const job = jobById(jobId)
          if (!job) return
          patchJob(jobId, (j) => ({
            ...j,
            status: 'declined',
            timeline: [event('declined', j.designerId, reason ? `Declined: ${reason}` : 'Declined'), ...j.timeline],
          }))
          set((s) => ({ invoices: s.invoices.map((inv) => (inv.jobId === jobId && inv.status !== 'paid' ? { ...inv, status: 'draft' } : inv)) }))
          postSystem(job, job.designerId, 'status', reason ? `I have to pass on this one — ${reason}` : 'I have to pass on this one, sorry!')
          if (job.designerId === ME_DESIGNER_ID) sim.onDesignerDeclined(jobId)
        },
        setJobStatus: (jobId, status, opts) => {
          const job = jobById(jobId)
          if (!job || job.status === status) return
          const actor = get().settings.role === 'client' ? job.clientId : job.designerId
          patchJob(jobId, (j) => ({
            ...j,
            status,
            progress: Math.max(j.progress, PROGRESS_FLOOR[status] ?? j.progress),
            startedAt: status === 'in_progress' && !j.startedAt ? nowIso() : j.startedAt,
            timeline: [event('status', actor, `Status changed to ${STATUS_TEXT[status]}`, { from: j.status, to: status }), ...j.timeline],
          }))
          if (!opts?.silent) {
            postSystem(job, actor, 'status', `Status update: ${STATUS_TEXT[job.status]} → ${STATUS_TEXT[status]}`)
          }
          if (job.designerId === ME_DESIGNER_ID && actor === ME_DESIGNER_ID) sim.onDesignerStatusChanged(jobId, status)
        },
        setJobProgress: (jobId, progress) =>
          patchJob(jobId, (j) => ({ ...j, progress: Math.max(0, Math.min(100, Math.round(progress))) })),
        submitVersion: (jobId, { note, media }) => {
          const job = jobById(jobId)
          if (!job) return
          const version: DeliveryVersion = {
            id: uid('v_'),
            version: job.versions.length + 1,
            note,
            media: media.length ? media : [{ kind: 'art', seed: `${jobId}-v${job.versions.length + 1}`, variant: 'poster', discipline: job.discipline }],
            submittedAt: nowIso(),
            status: 'pending',
            annotations: [],
          }
          patchJob(jobId, (j) => ({
            ...j,
            status: 'in_review',
            progress: Math.max(j.progress, 95),
            deliveredAt: nowIso(),
            versions: [...j.versions, version],
            revisions: j.revisions.map((r) => (r.status !== 'resolved' ? { ...r, status: 'resolved' } : r)),
            timeline: [event('delivery', j.designerId, `Version ${version.version} delivered`), ...j.timeline],
          }))
          postSystem(job, job.designerId, 'delivery', `v${version.version} is ready for review 🎉\n${note}`, {
            attachments: version.media,
          })
          if (job.designerId === ME_DESIGNER_ID) sim.onDesignerDelivered(jobId)
          else if (job.clientId === ME_CLIENT_ID)
            get().notify(
              {
                role: 'client',
                kind: 'delivery',
                title: `${nameOf(job.designerId)} delivered v${version.version}`,
                body: job.title,
                link: `/jobs/${job.id}`,
                actorAvatarSeed: seedOf(job.designerId),
              },
              { toast: get().settings.role === 'client' },
            )
        },
        startTimer: (jobId) => {
          // only one running timer at a time
          set((s) => ({
            jobs: s.jobs.map((j) => {
              if (j.id === jobId) return { ...j, timerStartedAt: nowIso() }
              if (j.timerStartedAt) {
                const mins = (Date.now() - new Date(j.timerStartedAt).getTime()) / 60000
                return { ...j, timerStartedAt: undefined, timeTrackedMin: j.timeTrackedMin + mins }
              }
              return j
            }),
          }))
        },
        stopTimer: (jobId) =>
          patchJob(jobId, (j) => {
            if (!j.timerStartedAt) return j
            const mins = (Date.now() - new Date(j.timerStartedAt).getTime()) / 60000
            return { ...j, timerStartedAt: undefined, timeTrackedMin: j.timeTrackedMin + mins }
          }),
        logTime: (jobId, minutes) =>
          patchJob(jobId, (j) => ({ ...j, timeTrackedMin: Math.max(0, j.timeTrackedMin + minutes) })),
        toggleRevisionItem: (jobId, revisionId, itemId) =>
          patchJob(jobId, (j) => ({
            ...j,
            revisions: j.revisions.map((r) =>
              r.id === revisionId
                ? {
                    ...r,
                    status: r.status === 'open' ? 'in_progress' : r.status,
                    items: r.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
                  }
                : r,
            ),
          })),
        resolveRevision: (jobId, revisionId) =>
          patchJob(jobId, (j) => ({
            ...j,
            revisions: j.revisions.map((r) =>
              r.id === revisionId ? { ...r, status: 'resolved', items: r.items.map((i) => ({ ...i, done: true })) } : r,
            ),
          })),
        spawnIncomingRequest: () => sim.spawnIncomingRequest(),

        // ───────── jobs: shared ─────────
        updateJob: (jobId, patch) => patchJob(jobId, (j) => ({ ...j, ...patch })),
        toggleStar: (jobId) => patchJob(jobId, (j) => ({ ...j, starred: !j.starred })),
        toggleDeliverable: (jobId, deliverableId) =>
          patchJob(jobId, (j) => {
            const deliverables = j.deliverables.map((d) => (d.id === deliverableId ? { ...d, done: !d.done } : d))
            return { ...j, deliverables }
          }),
        addDeliverable: (jobId, label) =>
          patchJob(jobId, (j) => ({ ...j, deliverables: [...j.deliverables, { id: uid('dl_'), label, done: false }] })),
        removeDeliverable: (jobId, deliverableId) =>
          patchJob(jobId, (j) => ({ ...j, deliverables: j.deliverables.filter((d) => d.id !== deliverableId) })),
        addAssets: (jobId, assets) => {
          const job = jobById(jobId)
          if (!job || !assets.length) return
          const actor = meIdFor(get().settings.role)
          patchJob(jobId, (j) => ({
            ...j,
            assets: [...assets, ...j.assets],
            timeline: [
              event('asset', actor, assets.length === 1 ? `Added ${assets[0].name}` : `Added ${assets.length} assets`),
              ...j.timeline,
            ],
          }))
          postSystem(job, actor, 'attachment', assets.length === 1 ? `Shared ${assets[0].name}` : `Shared ${assets.length} files`, {
            attachments: assets.map((a) => a.media),
          })
        },
        removeAsset: (jobId, assetId) =>
          patchJob(jobId, (j) => ({ ...j, assets: j.assets.filter((a) => a.id !== assetId) })),
        updateStyleGuide: (jobId, patch) =>
          patchJob(jobId, (j) => ({ ...j, styleGuide: { ...j.styleGuide, ...patch } })),
        addAnnotation: (jobId, versionId, a) =>
          patchJob(jobId, (j) => ({
            ...j,
            versions: j.versions.map((v) =>
              v.id === versionId
                ? {
                    ...v,
                    annotations: [
                      ...v.annotations,
                      { id: uid('an_'), ...a, authorId: meIdFor(get().settings.role), createdAt: nowIso(), resolved: false },
                    ],
                  }
                : v,
            ),
          })),
        toggleAnnotation: (jobId, versionId, annotationId) =>
          patchJob(jobId, (j) => ({
            ...j,
            versions: j.versions.map((v) =>
              v.id === versionId
                ? { ...v, annotations: v.annotations.map((an) => (an.id === annotationId ? { ...an, resolved: !an.resolved } : an)) }
                : v,
            ),
          })),
        removeAnnotation: (jobId, versionId, annotationId) =>
          patchJob(jobId, (j) => ({
            ...j,
            versions: j.versions.map((v) =>
              v.id === versionId ? { ...v, annotations: v.annotations.filter((an) => an.id !== annotationId) } : v,
            ),
          })),
        addComment: (jobId, text) =>
          patchJob(jobId, (j) => ({
            ...j,
            timeline: [event('comment', meIdFor(get().settings.role), text), ...j.timeline],
          })),

        // ───────── chat ─────────
        ensureConversation: (clientId, designerId) => {
          const existing = get().conversations.find((c) => c.clientId === clientId && c.designerId === designerId)
          if (existing) {
            if (existing.archived)
              set((s) => ({ conversations: s.conversations.map((c) => (c.id === existing.id ? { ...c, archived: false } : c)) }))
            return existing.id
          }
          const conv: Conversation = {
            id: uid('cv_'),
            clientId,
            designerId,
            jobIds: get().jobs.filter((j) => j.clientId === clientId && j.designerId === designerId).map((j) => j.id),
            pinned: false,
            muted: false,
            archived: false,
            lastReadAt: { [clientId]: nowIso(), [designerId]: nowIso() },
            createdAt: nowIso(),
          }
          set((s) => ({ conversations: [conv, ...s.conversations] }))
          return conv.id
        },
        postMessage: (conversationId, senderId, input) => {
          const msg: Message = {
            id: uid('m_'),
            conversationId,
            senderId,
            kind: input.kind ?? (input.attachments?.length ? 'attachment' : 'text'),
            text: input.text,
            attachments: input.attachments,
            jobId: input.jobId,
            replyToId: input.replyToId,
            duration: input.duration,
            createdAt: nowIso(),
            reactions: [],
          }
          set((s) => ({
            messages: [...s.messages, msg],
            conversations: s.conversations.map((c) =>
              c.id === conversationId
                ? { ...c, archived: false, lastReadAt: { ...c.lastReadAt, [senderId]: msg.createdAt } }
                : c,
            ),
          }))
          return msg
        },
        sendMessage: (conversationId, input) => {
          const me = meIdFor(get().settings.role)
          const msg = get().postMessage(conversationId, me, input)
          set((s) => ({ conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, draft: '' } : c)) }))
          sim.onMessageSent(conversationId, msg)
          return msg
        },
        editMessage: (messageId, text) =>
          set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, text, edited: true } : m)) })),
        deleteMessage: (messageId) => set((s) => ({ messages: s.messages.filter((m) => m.id !== messageId) })),
        toggleReaction: (messageId, emoji, by) => {
          const who = by ?? meIdFor(get().settings.role)
          set((s) => ({
            messages: s.messages.map((m) => {
              if (m.id !== messageId) return m
              const r = m.reactions.find((x) => x.emoji === emoji)
              let reactions = m.reactions
              if (!r) reactions = [...reactions, { emoji, by: [who] }]
              else if (r.by.includes(who))
                reactions = reactions
                  .map((x) => (x.emoji === emoji ? { ...x, by: x.by.filter((b) => b !== who) } : x))
                  .filter((x) => x.by.length)
              else reactions = reactions.map((x) => (x.emoji === emoji ? { ...x, by: [...x.by, who] } : x))
              return { ...m, reactions }
            }),
          }))
        },
        markConversationRead: (conversationId, readerId) => {
          const who = readerId ?? meIdFor(get().settings.role)
          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === conversationId ? { ...c, lastReadAt: { ...c.lastReadAt, [who]: nowIso() } } : c,
            ),
          }))
        },
        togglePinConversation: (id) =>
          set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)) })),
        toggleMuteConversation: (id) =>
          set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, muted: !c.muted } : c)) })),
        toggleArchiveConversation: (id) =>
          set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, archived: !c.archived } : c)) })),
        setDraft: (id, text) =>
          set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, draft: text } : c)) })),

        // ───────── notifications ─────────
        notify: (n, opts) => {
          const full: AppNotification = { ...n, id: uid('n_'), createdAt: nowIso(), read: false }
          set((s) => ({ notifications: [full, ...s.notifications].slice(0, 120) }))
          if (opts?.toast && get().settings.notificationsPush) {
            toast({
              title: n.title,
              description: n.body,
              tone: n.kind === 'match' ? 'match' : n.kind === 'message' ? 'message' : 'info',
              avatarSeed: n.actorAvatarSeed,
              link: n.link,
            })
          }
        },
        markNotificationRead: (id) =>
          set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
        markAllNotificationsRead: () => {
          const role = get().settings.role
          set((s) => ({ notifications: s.notifications.map((n) => (n.role === role ? { ...n, read: true } : n)) }))
        },
        clearNotifications: () => {
          const role = get().settings.role
          set((s) => ({ notifications: s.notifications.filter((n) => n.role !== role) }))
        },

        // ───────── profile ─────────
        updateMyProfile: (patch) =>
          set((s) => ({ designers: s.designers.map((d) => (d.id === ME_DESIGNER_ID ? { ...d, ...patch } : d)) })),
        addPortfolioItem: (item) => {
          const full: PortfolioItem = { ...item, id: uid('pf_'), likes: 0, views: 0 }
          set((s) => ({
            designers: s.designers.map((d) => (d.id === ME_DESIGNER_ID ? { ...d, portfolio: [full, ...d.portfolio] } : d)),
          }))
          return full
        },
        updatePortfolioItem: (id, patch) =>
          set((s) => ({
            designers: s.designers.map((d) =>
              d.id === ME_DESIGNER_ID ? { ...d, portfolio: d.portfolio.map((p) => (p.id === id ? { ...p, ...patch } : p)) } : d,
            ),
          })),
        removePortfolioItem: (id) =>
          set((s) => ({
            designers: s.designers.map((d) =>
              d.id === ME_DESIGNER_ID ? { ...d, portfolio: d.portfolio.filter((p) => p.id !== id) } : d,
            ),
          })),
        reorderPortfolio: (ids) =>
          set((s) => ({
            designers: s.designers.map((d) => {
              if (d.id !== ME_DESIGNER_ID) return d
              const byId = new Map(d.portfolio.map((p) => [p.id, p]))
              const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as PortfolioItem[]
              const rest = d.portfolio.filter((p) => !ids.includes(p.id))
              return { ...d, portfolio: [...ordered, ...rest] }
            }),
          })),
        registerDesigner: (input) => {
          const designer: Designer = {
            responseTimeHrs: 2,
            ...input,
            id: uid('d_'),
            rating: 0,
            reviewsCount: 0,
            completedJobs: 0,
            onTimeRate: 1,
            repeatClientRate: 0,
            joinedAt: nowIso(),
            isNew: true,
            verified: false,
            topRated: false,
            reviews: [],
            interestedInYou: true,
            registeredInApp: true,
          }
          set((s) => ({ designers: [designer, ...s.designers] }))
          get().notify(
            {
              role: 'client',
              kind: 'system',
              title: `${designer.name} just joined designTab`,
              body: `${designer.headline} — now visible in Discover › New designers.`,
              link: '/discover',
              actorAvatarSeed: designer.avatarSeed,
            },
            { toast: true },
          )
          return designer
        },
        removeDesigner: (id) =>
          set((s) => ({
            designers: s.designers.filter((d) => d.id !== id || d.id === ME_DESIGNER_ID),
            matches: s.matches.filter((m) => m.designerId !== id),
          })),
        updateClientProfile: (patch) =>
          set((s) => ({ clients: s.clients.map((c) => (c.id === ME_CLIENT_ID ? { ...c, ...patch } : c)) })),

        // ───────── money ─────────
        payInvoice: (invoiceId) => {
          const inv = get().invoices.find((i) => i.id === invoiceId)
          if (!inv) return
          set((s) => ({
            invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, status: 'paid', paidAt: nowIso() } : i)),
          }))
          const job = jobById(inv.jobId)
          if (job)
            patchJob(job.id, (j) => ({
              ...j,
              timeline: [event('payment', j.clientId, `Invoice ${inv.id} paid`), ...j.timeline],
            }))
        },
        sendInvoiceReminder: (invoiceId) => {
          const inv = get().invoices.find((i) => i.id === invoiceId)
          if (!inv) return
          const job = jobById(inv.jobId)
          if (job)
            postSystem(job, job.designerId, 'text', `Friendly reminder: invoice ${inv.id} (${inv.amount} ${inv.currency}) is due. Thanks! 🙏`)
          if (job && job.designerId === ME_DESIGNER_ID) sim.onInvoiceReminder(inv.id)
        },
        createInvoice: (jobId) => {
          const job = jobById(jobId)
          if (!job) return undefined
          const inv: Invoice = {
            id: nextInvoiceId(get().invoices.map((i) => i.id)),
            jobId,
            clientId: job.clientId,
            designerId: job.designerId,
            amount: job.budget,
            currency: job.currency,
            status: 'pending',
            issuedAt: nowIso(),
            dueAt: new Date(Date.now() + 14 * 864e5).toISOString(),
            lineItems: [{ label: job.title, amount: job.budget }],
          }
          set((s) => ({ invoices: [inv, ...s.invoices] }))
          return inv
        },
        requestPayout: (amount) => {
          get().notify(
            {
              role: 'designer',
              kind: 'payment',
              title: 'Payout on its way',
              body: `${amount.toFixed(2)} ${get().settings.currency} will reach your bank in 1–2 business days.`,
              link: '/payments',
            },
            { toast: true },
          )
        },

        // ───────── calendar ─────────
        addEvent: (e) => {
          const full: CalendarEvent = { ...e, role: e.role ?? get().settings.role, id: uid('ce_') }
          set((s) => ({ events: [...s.events, full] }))
          return full
        },
        updateEvent: (id, patch) =>
          set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
        removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      }
    },
    {
      name: 'designtab-state',
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // Persist data only (functions are recreated)
        const data: Partial<AppData> = {
          settings: s.settings,
          designers: s.designers,
          clients: s.clients,
          decisions: s.decisions,
          matches: s.matches,
          superLikesLeft: s.superLikesLeft,
          jobs: s.jobs,
          conversations: s.conversations,
          messages: s.messages,
          notifications: s.notifications,
          invoices: s.invoices,
          events: s.events,
          seededAt: s.seededAt,
        }
        return data as AppState
      },
      // Older snapshots are discarded and re-seeded, keeping only preferences.
      migrate: (persisted, version) => {
        const old = persisted as Partial<AppData> | undefined
        const fresh = freshData()
        if (version !== STORE_VERSION) {
          touchLastActive() // fresh seed is already relative to now — don't time-shift it
          return { ...fresh, settings: { ...fresh.settings, ...(old?.settings ?? {}) } } as AppState
        }
        return persisted as AppState
      },
      merge: (persisted, current) => {
        let p = (persisted ?? {}) as Partial<AppData>
        try {
          const last = localStorage.getItem(LAST_ACTIVE_KEY)
          const delta = last ? Date.now() - new Date(last).getTime() : 0
          if (delta > 60 * 60_000) {
            const { settings, ...data } = p
            p = { ...shiftDates(data, delta), settings }
          }
        } catch {
          /* ignore */
        }
        touchLastActive()
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } }
      },
    },
  ),
)

// Remember when the app was last open (see shiftDates).
if (typeof window !== 'undefined') {
  touchLastActive()
  setInterval(touchLastActive, 60_000)
  document.addEventListener('visibilitychange', touchLastActive)
}

// Expose for debugging & e2e tests.
if (typeof window !== 'undefined') {
  ;(window as unknown as { __designTab: typeof useApp }).__designTab = useApp
}

/** Close any running UI overlays when role changes (avoids stale views). */
useApp.subscribe((s, prev) => {
  if (s.settings.role !== prev.settings.role) {
    useUI.getState().set({ notificationsOpen: false, paletteOpen: false, mobileNavOpen: false })
  }
})

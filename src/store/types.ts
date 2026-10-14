/**
 * designTab domain model.
 *
 * The signed-in user ("Ali") has two identities so the whole client ↔ designer
 * loop can be demonstrated in one browser:
 *   - as a CLIENT  → `ME_CLIENT_ID`   (hires designers, sends briefs, reviews work)
 *   - as a DESIGNER → `ME_DESIGNER_ID` (accepts jobs, updates status, delivers)
 * The active identity is `settings.role`.
 */

export type Role = 'client' | 'designer'
export type Lang = 'en' | 'de' | 'tr'

export const DISCIPLINE_IDS = ['visual', 'video', 'motion', 'illustration', 'brand', 'uiux', '3d'] as const
export type DisciplineId = (typeof DISCIPLINE_IDS)[number]
/** 'all' is the neutral brand tab; every other tab re-themes the whole app. */
export type DisciplineFilter = DisciplineId | 'all'

export const ME_CLIENT_ID = 'c-ali'
export const ME_DESIGNER_ID = 'd-ali'
export const ME_NAME = 'Ali'

/** ISO-8601 timestamp string. */
export type ISODate = string

// ───────────────────────────── Media ─────────────────────────────

/** Procedurally generated artwork (see components/art/GenerativeArt). */
export type ArtVariant =
  | 'poster'
  | 'mesh'
  | 'blob3d'
  | 'ui'
  | 'video'
  | 'type'
  | 'pattern'
  | 'logo'
  | 'illustration'
  | 'photo'

export type MediaRef =
  | { kind: 'art'; seed: string; variant: ArtVariant; discipline?: DisciplineId }
  /** User-uploaded file stored in IndexedDB (lib/files.ts). */
  | { kind: 'file'; fileId: string; mime: string; name: string; size: number }
  | { kind: 'url'; url: string; mime?: string; name?: string }

export type AssetKind = 'image' | 'video' | 'audio' | 'doc' | 'font' | 'link' | 'archive'

export interface Asset {
  id: string
  name: string
  kind: AssetKind
  size: number // bytes (0 for links)
  media: MediaRef
  addedBy: string // client or designer id
  addedAt: ISODate
  note?: string
}

// ───────────────────────────── People ─────────────────────────────

export interface Review {
  id: string
  authorName: string
  authorCompany?: string
  authorAvatarSeed: string
  rating: number // 1..5
  text: string
  createdAt: ISODate
}

export interface PortfolioItem {
  id: string
  title: string
  description: string
  discipline: DisciplineId
  year: number
  tags: string[]
  client?: string
  cover: MediaRef
  media: MediaRef[]
  likes: number
  views: number
}

export type Availability = 'available' | 'limited' | 'booked'

export interface Designer {
  id: string
  name: string
  handle: string
  avatarSeed: string
  avatar?: MediaRef
  headline: string
  bio: string
  location: string
  timezone: string
  languages: string[]
  primary: DisciplineId
  disciplines: DisciplineId[]
  skills: string[]
  tools: string[]
  hourlyRate: number
  currency: 'EUR' | 'USD'
  rating: number
  reviewsCount: number
  completedJobs: number
  responseTimeHrs: number
  onTimeRate: number // 0..1
  repeatClientRate: number // 0..1
  availability: Availability
  joinedAt: ISODate
  /** Joined within the last ~30 days — shown in the "New designers" lane. */
  isNew: boolean
  verified: boolean
  topRated: boolean
  portfolio: PortfolioItem[]
  reviews: Review[]
  /** Simulation: will this designer like the client back? */
  interestedInYou: boolean
  socials: { label: string; url: string }[]
  /** Created through the in-app "Join as designer" flow. */
  registeredInApp?: boolean
}

export interface Client {
  id: string
  name: string // company / brand
  contactName: string
  contactRole: string
  avatarSeed: string
  logoColor: string
  industry: string
  location: string
  bio: string
  website: string
  budgetRange: [number, number]
  currency: 'EUR' | 'USD'
  hiresCount: number
  rating: number
  disciplinesNeeded: DisciplineId[]
  verified: boolean
  paymentVerified: boolean
  joinedAt: ISODate
  isNew: boolean
  /** Simulation: will this client like the designer back? */
  interestedInYou: boolean
  /** Teaser of open work shown on the discover card. */
  openBriefs: { title: string; discipline: DisciplineId; budget: number }[]
}

// ───────────────────────────── Matching ─────────────────────────────

export type SwipeDecision = 'like' | 'pass' | 'super'

export interface Match {
  id: string
  clientId: string
  designerId: string
  createdAt: ISODate
  /** Who initiated (the side that liked first). */
  initiatedBy: Role
  superLike: boolean
  favorite: boolean
  note?: string
}

// ───────────────────────────── Jobs ─────────────────────────────

/**
 * Lifecycle:
 * requested → queued → in_progress → final_touches → in_review → (revisions ↺ in_progress…) → approved
 *                      ↘ declined / cancelled
 */
export const JOB_STATUSES = [
  'requested',
  'queued',
  'in_progress',
  'final_touches',
  'in_review',
  'revisions',
  'approved',
  'declined',
  'cancelled',
] as const
export type JobStatus = (typeof JOB_STATUSES)[number]
/** Statuses shown as kanban columns, in order. */
export const BOARD_STATUSES: JobStatus[] = [
  'requested',
  'queued',
  'in_progress',
  'final_touches',
  'in_review',
  'revisions',
  'approved',
]

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface StyleGuide {
  palette: string[] // hex colours
  fonts: string[]
  mood: string[] // e.g. "Playful", "Minimal"
  references: { id: string; label: string; url: string }[]
  dos: string[]
  donts: string[]
  notes: string
}

export interface Annotation {
  id: string
  /** Position on the media, in percent (0..100). */
  x: number
  y: number
  mediaIndex: number
  text: string
  authorId: string
  createdAt: ISODate
  resolved: boolean
}

export interface DeliveryVersion {
  id: string
  version: number
  note: string
  media: MediaRef[]
  submittedAt: ISODate
  status: 'pending' | 'approved' | 'changes_requested'
  annotations: Annotation[]
}

export interface RevisionRequest {
  id: string
  versionId?: string
  requestedAt: ISODate
  requestedBy: string
  summary: string
  items: { id: string; text: string; done: boolean }[]
  status: 'open' | 'in_progress' | 'resolved'
}

export type TimelineKind =
  | 'created'
  | 'accepted'
  | 'declined'
  | 'status'
  | 'asset'
  | 'delivery'
  | 'revision'
  | 'approved'
  | 'deadline'
  | 'comment'
  | 'payment'
  | 'counter'

export interface TimelineEvent {
  id: string
  kind: TimelineKind
  at: ISODate
  actorId: string
  /** English, human readable. May contain {status} etc. already resolved. */
  text: string
  meta?: Record<string, string | number>
}

export interface Milestone {
  id: string
  label: string
  amount: number
  dueAt: ISODate
  status: 'locked' | 'escrow' | 'released'
}

export interface Job {
  id: string // "DT-2841"
  title: string
  summary: string
  description: string
  clientId: string
  designerId: string
  discipline: DisciplineId
  status: JobStatus
  priority: Priority
  createdAt: ISODate
  updatedAt: ISODate
  dueAt: ISODate
  startedAt?: ISODate
  deliveredAt?: ISODate
  approvedAt?: ISODate
  budget: number
  currency: 'EUR' | 'USD'
  progress: number // 0..100
  deliverables: { id: string; label: string; done: boolean }[]
  styleGuide: StyleGuide
  assets: Asset[]
  versions: DeliveryVersion[]
  revisions: RevisionRequest[]
  revisionLimit: number
  timeline: TimelineEvent[]
  milestones: Milestone[]
  blocker?: string
  tags: string[]
  cover: MediaRef
  /** Minutes logged by the designer. */
  timeTrackedMin: number
  timerStartedAt?: ISODate
  rating?: number
  review?: string
  /** Designer proposed a different deadline when accepting. */
  counterOffer?: { dueAt: ISODate; note: string; status: 'pending' | 'accepted' | 'rejected' }
  conversationId?: string
  starred: boolean
}

/** Input for creating a job from the brief wizard. */
export interface NewJobInput {
  title: string
  summary: string
  description: string
  designerId: string
  clientId?: string
  discipline: DisciplineId
  priority: Priority
  dueAt: ISODate
  budget: number
  deliverables: string[]
  styleGuide: StyleGuide
  assets: Asset[]
  revisionLimit: number
  tags: string[]
}

// ───────────────────────────── Chat ─────────────────────────────

export type MessageKind =
  | 'text'
  | 'attachment'
  | 'brief'
  | 'status'
  | 'revision'
  | 'delivery'
  | 'approval'
  | 'system'
  | 'voice'

export interface Message {
  id: string
  conversationId: string
  senderId: string // client id, designer id or 'system'
  kind: MessageKind
  text: string
  attachments?: MediaRef[]
  jobId?: string
  createdAt: ISODate
  reactions: { emoji: string; by: string[] }[]
  replyToId?: string
  edited?: boolean
  /** For 'voice' messages: seconds. */
  duration?: number
}

export interface Conversation {
  id: string
  clientId: string
  designerId: string
  jobIds: string[]
  pinned: boolean
  muted: boolean
  archived: boolean
  /** Last time each side read the thread. Keyed by participant id. */
  lastReadAt: Record<string, ISODate>
  draft?: string
  createdAt: ISODate
}

// ───────────────────────────── Notifications & money ─────────────────────────────

export type NotificationKind =
  | 'match'
  | 'like'
  | 'message'
  | 'job_request'
  | 'job_accepted'
  | 'job_declined'
  | 'status'
  | 'delivery'
  | 'revision'
  | 'approved'
  | 'deadline'
  | 'payment'
  | 'system'
  | 'ai'

export interface AppNotification {
  id: string
  role: Role
  kind: NotificationKind
  title: string // English
  body: string // English
  createdAt: ISODate
  read: boolean
  /** In-app route, e.g. "/jobs/DT-2841". */
  link?: string
  actorAvatarSeed?: string
}

export type InvoiceStatus = 'draft' | 'pending' | 'escrow' | 'paid' | 'overdue'

export interface Invoice {
  id: string // "INV-1042"
  jobId: string
  clientId: string
  designerId: string
  amount: number
  currency: 'EUR' | 'USD'
  status: InvoiceStatus
  issuedAt: ISODate
  dueAt: ISODate
  paidAt?: ISODate
  lineItems: { label: string; amount: number }[]
}

export interface CalendarEvent {
  id: string
  role: Role
  title: string
  at: ISODate
  durationMin: number
  kind: 'call' | 'review' | 'deadline' | 'focus' | 'milestone'
  jobId?: string
  withId?: string
}

// ───────────────────────────── Settings ─────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system'
export type MotionLevel = 'expressive' | 'subtle' | 'off'
export type GlassLevel = 'clear' | 'frosted' | 'solid'
export type AccentMode = 'discipline' | 'fixed'

export interface Settings {
  lang: Lang
  role: Role
  discipline: DisciplineFilter
  theme: ThemeMode
  accentMode: AccentMode
  /** Discipline whose palette is used when accentMode === 'fixed' ('all' = brand lime). */
  fixedAccent: DisciplineFilter
  motion: MotionLevel
  glass: GlassLevel
  animatedBackground: boolean
  refraction: boolean
  sound: boolean
  aiAssistant: boolean
  compact: boolean
  onboardingDone: boolean
  sidebarCollapsed: boolean
  notificationsEmail: boolean
  notificationsPush: boolean
  weekStartsOn: 0 | 1
  currency: 'EUR' | 'USD'
}

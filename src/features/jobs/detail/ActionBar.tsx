import { useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  BellRing,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCheck,
  Download,
  Eye,
  Hourglass,
  Inbox,
  Palette,
  PenTool,
  Play,
  Repeat2,
  Search,
  Send,
  Undo2,
  UploadCloud,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { dueLabel, fmt, shortDate, timeAgo } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { fireConfetti, fireEmoji } from '@/lib/confetti'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useDesigner } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { JobStatus } from '@/store/types'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Badge'
import { Segmented } from '@/components/ui/Segmented'
import { Slider } from '@/components/ui/Slider'
import { ProgressBar } from '@/components/ui/Progress'
import { RatingStars } from '@/components/ui/RatingStars'
import { Tooltip } from '@/components/ui/Tooltip'
import { useJobCtx } from './context'
import { useDebouncedCommit, useDuration } from './hooks'
import { WORK_STATUSES, downloadMedia, isActiveWork, isClosed, trackedSeconds } from './model'
import { RevisionCard, RevisionMeter } from './RevisionCard'
import { TimeTracker } from './TimeTracker'
import { Card, StatTile } from './ui'

type Tone = 'accent' | 'night' | 'warning' | 'success' | 'info' | 'neutral'
const TONE: Record<Tone, string> = {
  accent: 'bg-accent text-accent-ink',
  night: 'bg-ink text-[var(--surface)]',
  warning: 'bg-warning-soft text-[color-mix(in_oklab,var(--warning)_55%,var(--ink))]',
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  neutral: 'bg-[var(--surface-2)] text-ink-2',
}

/** Header of the action card: animated icon tile + "what now" copy. */
function Head({ icon, tone, title, body, right }: { icon: ReactNode; tone: Tone; title: ReactNode; body?: ReactNode; right?: ReactNode }) {
  const t = useT()
  return (
    <div className="relative z-[1] flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <motion.span
          className={cn('flex size-11 shrink-0 items-center justify-center rounded-[15px] [&_svg]:size-5', TONE[tone])}
          initial={{ scale: 0.5, rotate: -18, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={spring.bouncy}
        >
          {icon}
        </motion.span>
        <div className="min-w-0">
          <div className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-3">{t('job.act.nextStep')}</div>
          <h3 className="text-[18px] font-medium leading-tight tracking-[-0.02em] text-ink sm:text-[20px]">{title}</h3>
          {body && <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">{body}</p>}
        </div>
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

/** Shared "send a friendly nudge in the job chat" action. */
export function useNudge() {
  const t = useT()
  const { job, side, counterpart } = useJobCtx()
  const ensure = useApp((s) => s.ensureConversation)
  const send = useApp((s) => s.sendMessage)
  return useCallback(() => {
    const conv = job.conversationId ?? ensure(job.clientId, job.designerId)
    const first = counterpart?.name.split(' ')[0] ?? ''
    const latest = job.versions[job.versions.length - 1]
    const text =
      side === 'client'
        ? `Hi ${first}! Quick check-in on “${job.title}” — how is it going? 🙂`
        : job.status === 'in_review' && latest
          ? `Hi! Just checking whether you had a chance to look at v${latest.version} of “${job.title}” 🙂`
          : `Quick update on “${job.title}”: making good progress — ${job.progress}% done so far.`
    send(conv, { text, jobId: job.id })
    toast({ title: t('job.act.nudged', { name: counterpart?.name ?? '' }), description: text, tone: 'success', link: `/messages/${conv}` })
  }, [job, side, counterpart, ensure, send, t])
}

export function ActionBar() {
  const { side, canAct } = useJobCtx()
  if (!canAct) return null
  return (
    <Card className="overflow-hidden">
      {side === 'designer' ? <DesignerActions /> : <ClientActions />}
    </Card>
  )
}

// ─────────────────────────── designer ───────────────────────────

function DesignerActions() {
  const { job } = useJobCtx()
  if (job.status === 'requested') return job.counterOffer?.status === 'pending' ? <DesignerCounterPending /> : <DesignerOffer />
  if (isActiveWork(job.status)) return <Workbench />
  if (job.status === 'revisions') return <DesignerRevisions />
  if (job.status === 'in_review') return <DesignerInReview />
  if (job.status === 'approved') return <Approved />
  return <Closed />
}

function DesignerOffer() {
  const t = useT()
  const lang = useLang()
  const { job, counterpart, openModal } = useJobCtx()
  const accept = useApp((s) => s.acceptJob)
  return (
    <>
      <Head icon={<Inbox />} tone="info" title={t('job.act.d.offerTitle', { name: counterpart?.name ?? '' })} body={t('job.act.d.offerBody')} />
      <div className="relative z-[1] mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={t('core.common.budget')} value={formatMoney(job.budget, job.currency, lang)} />
        <StatTile label={t('core.common.deadline')} value={shortDate(job.dueAt, lang)} sub={dueLabel(job.dueAt, lang)} />
        <StatTile label={t('job.facts.revisions')} value={job.revisionLimit} sub={t('job.act.d.included')} />
        <StatTile label={t('job.facts.deliverables')} value={job.deliverables.length} sub={t('job.facts.assets', { count: job.assets.length })} />
      </div>
      <div className="relative z-[1] mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          size="lg"
          icon={<Check className="size-4.5" />}
          onClick={(e) => {
            accept(job.id)
            fireConfetti({ from: e.currentTarget, particleCount: 120 })
            toast({ title: t('job.act.d.accepted'), description: job.title, tone: 'success' })
          }}
        >
          {t('job.act.d.accept')}
        </Button>
        <Button size="lg" variant="glass" icon={<CalendarClock className="size-4.5" />} onClick={() => openModal('counter')}>
          {t('job.act.d.propose')}
        </Button>
        <Button size="lg" variant="outline" icon={<X className="size-4.5" />} onClick={() => openModal('decline')}>
          {t('job.act.d.decline')}
        </Button>
      </div>
    </>
  )
}

function DateCompare({ from, to }: { from: string; to: string }) {
  const lang = useLang()
  return (
    <div className="relative z-[1] mt-4 flex flex-wrap items-center gap-3">
      <div className="tile px-4 py-3">
        <div className="font-mono text-[15px] text-ink-3 line-through decoration-[var(--danger)] decoration-2">{fmt(from, 'EEE d MMM', lang)}</div>
      </div>
      <motion.span animate={{ x: [0, 6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
        <ArrowRight className="size-5 text-ink-3" />
      </motion.span>
      <motion.div className="rounded-[16px] bg-accent px-4 py-3 text-accent-ink" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy}>
        <div className="font-mono text-[15px] font-semibold">{fmt(to, 'EEE d MMM', lang)}</div>
      </motion.div>
    </div>
  )
}

function DesignerCounterPending() {
  const t = useT()
  const lang = useLang()
  const { job, counterpart } = useJobCtx()
  const update = useApp((s) => s.updateJob)
  const accept = useApp((s) => s.acceptJob)
  const co = job.counterOffer!
  return (
    <>
      <Head
        icon={<Hourglass />}
        tone="warning"
        title={t('job.act.d.counterWaitTitle', { name: counterpart?.name ?? '' })}
        body={t('job.act.d.counterWaitBody', { date: shortDate(co.dueAt, lang) })}
      />
      <DateCompare from={job.dueAt} to={co.dueAt} />
      <div className="relative z-[1] mt-4">
        <Button
          variant="outline"
          icon={<Undo2 className="size-4" />}
          onClick={() => {
            update(job.id, { counterOffer: { ...co, status: 'rejected' } })
            accept(job.id)
            toast({ title: t('job.act.d.keptOriginal'), description: job.title, tone: 'success' })
          }}
        >
          {t('job.act.d.keepOriginal')}
        </Button>
      </div>
    </>
  )
}

function Workbench() {
  const t = useT()
  const { job, openModal, setTab } = useJobCtx()
  const setStatus = useApp((s) => s.setJobStatus)
  const setProgress = useApp((s) => s.setJobProgress)
  const commit = useCallback((v: number) => setProgress(job.id, v), [setProgress, job.id])
  const [progress, onProgress] = useDebouncedCommit(job.progress, commit)
  const done = job.deliverables.filter((d) => d.done).length
  const next = job.versions.length + 1

  return (
    <>
      <Head
        icon={<PenTool />}
        tone="accent"
        title={t('job.act.d.workTitle')}
        body={t('job.act.d.workBody')}
        right={
          <Button className="hidden sm:inline-flex" icon={<Send className="size-4" />} onClick={() => openModal('deliver')}>
            {t('job.act.d.deliver', { n: next })}
          </Button>
        }
      />
      <div className="relative z-[1] mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <div className="min-w-0 space-y-5">
          <div>
            <div className="mb-2 text-[12.5px] font-medium text-ink-2">{t('core.common.status')}</div>
            <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
              <Segmented<JobStatus>
                value={job.status}
                onChange={(s) => {
                  setStatus(job.id, s)
                  toast({ title: t('job.act.d.statusChanged', { status: t(`core.status.${s}`) }), description: job.title, tone: 'success', duration: 2400 })
                }}
                options={WORK_STATUSES.map((s) => ({ value: s, label: t(`core.status.${s}`) }))}
                pill="night"
                size="sm"
                layoutId="job-work-status"
              />
            </div>
          </div>
          <Slider
            label={t('core.common.progress')}
            value={progress}
            onChange={onProgress}
            min={0}
            max={100}
            step={1}
            format={(v) => `${v}%`}
            marks={[0, 25, 50, 75, 100].map((v) => ({ value: v, label: `${v}` }))}
          />
          <button type="button" onClick={() => setTab('overview')} className="group/dl flex w-full items-center gap-3 rounded-[16px] bg-[var(--surface-2)] px-3.5 py-3 text-left transition-colors hover:bg-[var(--surface-3)]">
            <CheckCheck className="size-4 shrink-0 text-ink-2" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-ink">{t('job.act.d.deliverables', { done, total: job.deliverables.length })}</span>
              <ProgressBar value={job.deliverables.length ? (done / job.deliverables.length) * 100 : 0} height={5} className="mt-1.5" tone="accent" />
            </span>
            <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover/dl:translate-x-1" />
          </button>
        </div>
        <TimeTracker />
      </div>
      <Button className="relative z-[1] mt-4 sm:hidden" block size="lg" icon={<Send className="size-4" />} onClick={() => openModal('deliver')}>
        {t('job.act.d.deliver', { n: next })}
      </Button>
    </>
  )
}

function DesignerRevisions() {
  const t = useT()
  const { job, counterpart, openModal } = useJobCtx()
  const setStatus = useApp((s) => s.setJobStatus)
  const open = job.revisions.map((r, i) => ({ r, i })).filter(({ r }) => r.status !== 'resolved')
  const next = job.versions.length + 1
  return (
    <>
      <Head
        icon={<Repeat2 />}
        tone="warning"
        title={t('job.act.d.revTitle', { name: counterpart?.name ?? '' })}
        body={t('job.act.d.revBody', { n: next })}
        right={
          <>
            <Button
              variant="glass"
              size="sm"
              icon={<Play className="size-3.5" />}
              onClick={() => {
                setStatus(job.id, 'in_progress')
                toast({ title: t('job.act.d.statusChanged', { status: t('core.status.in_progress') }), tone: 'success', duration: 2400 })
              }}
            >
              {t('job.act.d.resume')}
            </Button>
            <Button size="sm" icon={<Send className="size-3.5" />} onClick={() => openModal('deliver')}>
              {t('job.act.d.deliver', { n: next })}
            </Button>
          </>
        }
      />
      <div className="relative z-[1] mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <div className="min-w-0 space-y-3">
          {open.length ? (
            open.map(({ r, i }) => <RevisionCard key={r.id} revision={r} index={i + 1} />)
          ) : (
            <div className="tile px-4 py-5 text-center text-[13.5px] text-ink-3">{t('job.act.d.revAllResolved')}</div>
          )}
        </div>
        <TimeTracker compact />
      </div>
    </>
  )
}

function DesignerInReview() {
  const t = useT()
  const lang = useLang()
  const { job, counterpart, openModal, showVersion } = useJobCtx()
  const nudge = useNudge()
  const latest = job.versions[job.versions.length - 1]
  const openPins = latest?.annotations.filter((a) => !a.resolved).length ?? 0
  return (
    <>
      <Head
        icon={<Eye />}
        tone="warning"
        title={t('job.act.d.reviewTitle', { n: latest?.version ?? 1, name: counterpart?.name ?? '' })}
        body={t('job.act.d.reviewBody', { time: job.deliveredAt ? timeAgo(job.deliveredAt, lang) : '—' })}
      />
      <div className="relative z-[1] mt-4 flex flex-wrap items-center gap-2">
        <Button icon={<Eye className="size-4" />} onClick={() => showVersion(latest?.id)}>
          {t('job.act.viewDelivery')}
        </Button>
        <Button variant="glass" icon={<BellRing className="size-4" />} onClick={nudge}>
          {t('job.act.d.nudgeClient')}
        </Button>
        <Button variant="ghost" icon={<Send className="size-4" />} onClick={() => openModal('deliver')}>
          {t('job.act.d.deliverAnother')}
        </Button>
        {openPins > 0 && (
          <Pill tone="warning" dot>
            {t('job.act.openPins', { count: openPins })}
          </Pill>
        )}
      </div>
    </>
  )
}

// ─────────────────────────── client ───────────────────────────

function ClientActions() {
  const { job } = useJobCtx()
  let body: ReactNode
  if (job.status === 'requested') body = job.counterOffer?.status === 'pending' ? <ClientCounter /> : <ClientWaiting />
  else if (isActiveWork(job.status)) body = <ClientInProgress />
  else if (job.status === 'in_review') body = <ClientReview />
  else if (job.status === 'revisions') body = <ClientRevisions />
  else if (job.status === 'approved') body = <Approved />
  else body = <Closed />
  return (
    <>
      {body}
      {!isClosed(job.status) && <ClientTools />}
    </>
  )
}

function ClientCounter() {
  const t = useT()
  const { job, counterpart } = useJobCtx()
  const respond = useApp((s) => s.respondCounterOffer)
  const co = job.counterOffer!
  return (
    <>
      <Head icon={<CalendarClock />} tone="warning" title={t('job.act.c.counterTitle', { name: counterpart?.name ?? '' })} body={t('job.act.c.counterBody')} />
      <DateCompare from={job.dueAt} to={co.dueAt} />
      {co.note && <blockquote className="relative z-[1] mt-3 border-l-2 border-[var(--accent)] pl-3 text-[13.5px] italic text-ink-2">“{co.note}”</blockquote>}
      <div className="relative z-[1] mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          icon={<Check className="size-4" />}
          onClick={(e) => {
            respond(job.id, true)
            fireConfetti({ from: e.currentTarget, particleCount: 80 })
            toast({ title: t('job.act.c.counterAccepted'), description: job.title, tone: 'success' })
          }}
        >
          {t('job.act.c.acceptDate')}
        </Button>
        <Button
          variant="outline"
          icon={<Undo2 className="size-4" />}
          onClick={() => {
            respond(job.id, false)
            toast({ title: t('job.act.c.counterRejected'), description: job.title, tone: 'info' })
          }}
        >
          {t('job.act.c.keepDate')}
        </Button>
      </div>
    </>
  )
}

function ClientWaiting() {
  const t = useT()
  const lang = useLang()
  const { job, counterpart } = useJobCtx()
  const designer = useDesigner(job.designerId)
  return (
    <Head
      icon={<Hourglass />}
      tone="info"
      title={t('job.act.c.waitTitle', { name: counterpart?.name ?? '' })}
      body={t('job.act.c.waitBody', { time: timeAgo(job.createdAt, lang), hours: designer?.responseTimeHrs ?? 4 })}
    />
  )
}

function ClientInProgress() {
  const t = useT()
  const lang = useLang()
  const dur = useDuration()
  const { job, counterpart } = useJobCtx()
  const done = job.deliverables.filter((d) => d.done).length
  return (
    <>
      <Head
        icon={<PenTool />}
        tone="accent"
        title={t('job.act.c.workTitle', { name: counterpart?.name ?? '' })}
        body={t('job.act.c.workBody', { status: t(`core.status.${job.status}`), time: timeAgo(job.updatedAt, lang) })}
      />
      <div className="relative z-[1] mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={t('core.common.progress')} value={`${job.progress}%`} tone="accent" />
        <StatTile label={t('job.timer.title')} value={dur(trackedSeconds(job) / 60)} />
        <StatTile label={t('job.facts.deliverables')} value={`${done}/${job.deliverables.length}`} />
        <StatTile label={t('core.common.due')} value={shortDate(job.dueAt, lang)} sub={dueLabel(job.dueAt, lang)} />
      </div>
    </>
  )
}

function ClientReview() {
  const t = useT()
  const lang = useLang()
  const { job, counterpart, openModal, showVersion } = useJobCtx()
  const latest = job.versions[job.versions.length - 1]
  const used = job.revisions.length
  const atLimit = used >= job.revisionLimit
  const escrow = job.milestones.filter((m) => m.status !== 'released').reduce((n, m) => n + m.amount, 0)
  const reqBtn = (
    <Button size="lg" variant="glass" icon={<Repeat2 className="size-4.5" />} disabled={atLimit} onClick={() => openModal('revision')}>
      {t('job.act.c.requestRevision')}
    </Button>
  )
  return (
    <>
      <Head
        icon={<Eye />}
        tone="warning"
        title={t('job.act.c.reviewTitle', { n: latest?.version ?? 1, name: counterpart?.name ?? '' })}
        body={t('job.act.c.reviewBody', { amount: formatMoney(escrow || job.budget, job.currency, lang) })}
      />
      <div className="relative z-[1] mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <motion.div className="relative" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
            <span aria-hidden className="pointer-events-none absolute -inset-1 animate-pulse rounded-full bg-accent-soft blur-md" />
            <Button size="lg" block icon={<Wallet className="size-4.5" />} onClick={() => openModal('approve')} className="relative">
              {t('job.act.c.approve')}
            </Button>
          </motion.div>
          {atLimit ? <Tooltip content={t('job.act.c.limitReached')}>{reqBtn}</Tooltip> : reqBtn}
          <Button size="lg" variant="ghost" icon={<Eye className="size-4.5" />} onClick={() => showVersion(latest?.id)}>
            {t('job.act.c.reviewDelivery')}
          </Button>
        </div>
        <RevisionMeter used={used} limit={job.revisionLimit} />
      </div>
    </>
  )
}

function ClientRevisions() {
  const t = useT()
  const { job, counterpart } = useJobCtx()
  const open = job.revisions.map((r, i) => ({ r, i })).filter(({ r }) => r.status !== 'resolved')
  const items = open.flatMap(({ r }) => r.items)
  const done = items.filter((i) => i.done).length
  return (
    <>
      <Head
        icon={<Repeat2 />}
        tone="info"
        title={t('job.act.c.revTitle', { name: counterpart?.name ?? '' })}
        body={t('job.act.c.revBody', { done, total: items.length })}
      />
      {open.length > 0 && (
        <div className="relative z-[1] mt-4 space-y-3">
          {open.slice(-1).map(({ r, i }) => (
            <RevisionCard key={r.id} revision={r} index={i + 1} compact />
          ))}
        </div>
      )}
    </>
  )
}

function ClientTools() {
  const t = useT()
  const { openModal, setTab, setStyleEdit } = useJobCtx()
  const nudge = useNudge()
  const tools = [
    { icon: <UploadCloud />, label: t('job.act.c.addAssets'), onClick: () => openModal('assets') },
    {
      icon: <Palette />,
      label: t('job.act.c.editStyle'),
      onClick: () => {
        setStyleEdit(true)
        setTab('design')
      },
    },
    { icon: <BellRing />, label: t('job.act.c.nudge'), onClick: nudge },
    { icon: <CalendarPlus />, label: t('job.act.schedule'), onClick: () => openModal('schedule') },
  ]
  return (
    <div className="relative z-[1] mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 sm:flex sm:flex-wrap">
      {tools.map((tool, i) => (
        <motion.button
          key={i}
          type="button"
          onClick={tool.onClick}
          className="inline-flex h-10 min-w-0 items-center gap-2 rounded-full bg-[var(--surface-2)] px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-[var(--surface-3)] [&_svg]:size-4 [&_svg]:shrink-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05, duration: 0.4, ease: EASE_OUT }}
          whileTap={{ scale: 0.95 }}
        >
          {tool.icon}
          <span className="truncate">{tool.label}</span>
        </motion.button>
      ))}
    </div>
  )
}

// ─────────────────────────── both ───────────────────────────

function Approved() {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const { job, side, counterpart } = useJobCtx()
  const invoices = useApp((s) => s.invoices)
  const createInvoice = useApp((s) => s.createInvoice)
  const remind = useApp((s) => s.sendInvoiceReminder)
  const pay = useApp((s) => s.payInvoice)
  const inv = invoices.find((i) => i.jobId === job.id)
  const latest = job.versions[job.versions.length - 1]
  const unpaid = inv && inv.status !== 'paid'

  const downloadAll = async () => {
    if (!latest) return
    for (const [i, m] of latest.media.entries()) await downloadMedia(m, `${job.id}-v${latest.version}-${i + 1}`)
    toast({ title: t('job.act.downloaded', { count: latest.media.length }), tone: 'success' })
  }

  return (
    <>
      <Head
        icon={<BadgeCheck />}
        tone="success"
        title={t(side === 'designer' ? 'job.act.d.approvedTitle' : 'job.act.c.approvedTitle')}
        body={t('job.act.approvedBody', { date: shortDate(job.approvedAt ?? job.updatedAt, lang), name: counterpart?.name ?? '' })}
      />
      <div className="relative z-[1] mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="tile min-w-0 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <RatingStars value={job.rating ?? 0} size={18} showValue={!!job.rating} />
            {!job.rating && <span className="text-[12.5px] text-ink-3">{t('job.act.noRating')}</span>}
          </div>
          {job.review && <p className="mt-2 text-[14px] italic leading-relaxed text-ink-2">“{job.review}”</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {side === 'client' ? (
            <>
              <Button icon={<Repeat2 className="size-4" />} onClick={() => navigate(`/brief/new?designer=${job.designerId}`)}>
                {t('job.act.c.hireAgain')}
              </Button>
              {latest && (
                <Button variant="glass" icon={<Download className="size-4" />} onClick={downloadAll}>
                  {t('job.act.downloadFinal')}
                </Button>
              )}
              {unpaid && inv && (
                <Button
                  variant="accent"
                  icon={<Wallet className="size-4" />}
                  onClick={(e) => {
                    pay(inv.id)
                    fireEmoji('💸', { from: e.currentTarget })
                    toast({ title: t('job.pay.paid', { id: inv.id }), tone: 'success' })
                  }}
                >
                  {t('job.pay.payNow')}
                </Button>
              )}
            </>
          ) : (
            <>
              {!inv && (
                <Button
                  icon={<Wallet className="size-4" />}
                  onClick={() => {
                    const created = createInvoice(job.id)
                    if (created) toast({ title: t('job.hero.invoiceCreated', { id: created.id }), tone: 'success', link: '/payments' })
                  }}
                >
                  {t('job.hero.createInvoice')}
                </Button>
              )}
              {unpaid && inv && (
                <Button
                  variant="glass"
                  icon={<BellRing className="size-4" />}
                  onClick={() => {
                    remind(inv.id)
                    toast({ title: t('job.pay.reminded', { id: inv.id }), tone: 'success' })
                  }}
                >
                  {t('job.pay.remind')}
                </Button>
              )}
              <Button variant="ghost" iconRight={<ArrowRight className="size-4" />} onClick={() => navigate('/payments')}>
                {t('job.act.d.earnings')}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function Closed() {
  const t = useT()
  const navigate = useNavigate()
  const { job, side } = useJobCtx()
  const reason = job.timeline.find((e) => e.kind === 'declined' || (e.kind === 'status' && /cancel/i.test(e.text)))?.text
  return (
    <>
      <Head icon={<Ban />} tone="neutral" title={t(`job.act.closed.${job.status}`)} body={reason} />
      <div className="relative z-[1] mt-4 flex flex-wrap gap-2">
        {side === 'client' ? (
          <>
            <Button icon={<Search className="size-4" />} onClick={() => navigate('/discover')}>
              {t('job.act.c.findAnother')}
            </Button>
            <Button variant="glass" icon={<Send className="size-4" />} onClick={() => navigate('/brief/new')}>
              {t('job.act.c.newBrief')}
            </Button>
          </>
        ) : (
          <Button icon={<Inbox className="size-4" />} onClick={() => navigate('/requests')}>
            {t('job.act.d.toRequests')}
          </Button>
        )}
      </div>
    </>
  )
}

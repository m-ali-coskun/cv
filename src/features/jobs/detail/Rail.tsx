import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  CalendarPlus,
  Clock3,
  MapPin,
  MessageCircle,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { chatTime, daysUntil, fmt, timeAgo } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { jobRisk, useClient, useDesigner } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { useUI } from '@/store/ui'
import type { CalendarEvent, Message } from '@/store/types'
import { MediaView } from '@/components/art/MediaView'
import { Button, IconButton } from '@/components/ui/Button'
import { RatingStars } from '@/components/ui/RatingStars'
import { useNudge } from './ActionBar'
import { useJobCtx } from './context'
import { isActiveWork, isClosed } from './model'
import { TimeTracker } from './TimeTracker'
import { Card, LiveDot, PersonAvatar, SectionTitle } from './ui'

export function Rail() {
  const { job, side, canAct } = useJobCtx()
  const aiOn = useApp((s) => s.settings.aiAssistant)
  // the action bar already hosts the tracker while the designer is working
  const trackerInActionBar = canAct && side === 'designer' && (isActiveWork(job.status) || job.status === 'revisions')
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
      <Discussion />
      {aiOn && <Insights />}
      <Counterpart />
      {!trackerInActionBar && (
        <Card pad={false} className="p-1.5">
          <TimeTracker />
        </Card>
      )}
      <Upcoming />
    </div>
  )
}

// ─────────────────────────── discussion ───────────────────────────

function Discussion() {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const { job, canAct, side, meId, counterpart, person } = useJobCtx()
  const messages = useApp((s) => s.messages)
  const send = useApp((s) => s.sendMessage)
  const ensure = useApp((s) => s.ensureConversation)
  const convId = job.conversationId
  const typing = useUI((s) => (convId ? !!s.typing[convId] : false))
  const [text, setText] = useState('')
  const [jobOnly, setJobOnly] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  const thread = useMemo(
    () =>
      messages
        .filter((m) => m.conversationId === convId && (!jobOnly || m.jobId === job.id))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(-6),
    [messages, convId, jobOnly, job.id],
  )
  const lastId = thread[thread.length - 1]?.id

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [lastId, typing])

  const submit = (value = text) => {
    const v = value.trim()
    if (!v || !canAct) return
    const id = convId ?? ensure(job.clientId, job.designerId)
    send(id, { text: v, jobId: job.id })
    setText('')
  }

  const quick =
    side === 'client'
      ? [
          { key: 'great', text: 'Looks great! 🙌' },
          { key: 'call', text: 'Can we hop on a quick call today?' },
          { key: 'update', text: 'Any update on this one?' },
        ]
      : [
          { key: 'onit', text: 'On it! 💪' },
          { key: 'wip', text: 'Sharing a WIP shortly.' },
          { key: 'thanks', text: 'Thanks for the feedback!' },
        ]

  const openChat = () => navigate(`/messages/${convId ?? ensure(job.clientId, job.designerId)}`)

  return (
    <Card className="flex flex-col overflow-hidden" pad={false}>
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <PersonAvatar person={counterpart} size={36} status={typing ? 'online' : 'away'} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-medium tracking-[-0.01em] text-ink">{t('job.chat.title')}</div>
            <div className="flex items-center gap-1.5 truncate text-[12px] text-ink-3">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={typing ? 'typing' : 'name'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="truncate">
                  {typing ? t('core.common.typing') : counterpart?.name}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>
        <Button size="xs" variant="glass" iconRight={<ArrowUpRight className="size-3.5" />} onClick={openChat}>
          {t('job.chat.open')}
        </Button>
      </div>
      <div className="flex items-center gap-1 px-4 pb-2">
        {(['all', 'job'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setJobOnly(k === 'job')}
            className={cn('relative h-7 rounded-full px-2.5 text-[11.5px] font-medium transition-colors', (k === 'job') === jobOnly ? 'text-ink' : 'text-ink-3 hover:text-ink-2')}
          >
            {(k === 'job') === jobOnly && <motion.span layoutId="chat-scope" className="absolute inset-0 rounded-full bg-[var(--surface-2)]" transition={spring.pill} />}
            <span className="relative">{k === 'job' ? t('job.chat.thisJob', { id: job.id }) : t('job.chat.thread')}</span>
          </button>
        ))}
      </div>

      <div
        ref={scroller}
        className="max-h-[360px] min-h-[180px] space-y-2 overflow-y-auto px-3 py-2"
        style={{ maskImage: 'linear-gradient(to bottom, transparent, #000 14px, #000 calc(100% - 10px), transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 14px, #000 calc(100% - 10px), transparent)' }}
      >
        <AnimatePresence initial={false}>
          {thread.map((m) => (
            <Bubble key={m.id} message={m} mine={m.senderId === meId} sender={person(m.senderId)} lang={lang} />
          ))}
          {typing && (
            <motion.div key="typing" className="flex justify-start" initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring.snappy}>
              <span className="inline-flex items-center gap-1 rounded-[18px] rounded-bl-[6px] bg-[var(--surface-2)] px-3.5 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} className="size-1.5 rounded-full bg-[var(--ink-3)]" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }} />
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {!thread.length && !typing && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <MessageCircle className="size-6 text-ink-4" />
            <p className="text-[12.5px] text-ink-3">{t('job.chat.empty')}</p>
          </div>
        )}
      </div>

      {canAct ? (
        <div className="border-t border-line p-3">
          <div className="no-scrollbar -mx-0.5 mb-2 flex gap-1.5 overflow-x-auto px-0.5">
            {quick.map((q) => (
              <motion.button
                key={q.key}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => submit(q.text)}
                className="h-7 shrink-0 rounded-full border border-line-2 px-2.5 text-[11.5px] font-medium text-ink-2 transition-colors hover:border-[var(--ink-4)] hover:text-ink"
              >
                {t(`job.chat.q.${q.key}`)}
              </motion.button>
            ))}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('job.chat.ph', { name: counterpart?.name.split(' ')[0] ?? '' })}
              className="h-10 min-w-0 flex-1 rounded-full border border-line bg-[var(--surface)]/70 px-4 text-[13.5px] text-ink outline-none transition-[border-color,box-shadow] focus:border-[var(--accent-line)] focus:shadow-[0_0_0_4px_var(--accent-softer)]"
            />
            <motion.button
              type="submit"
              aria-label={t('core.action.send')}
              disabled={!text.trim()}
              whileTap={{ scale: 0.9 }}
              animate={{ scale: text.trim() ? 1 : 0.9, rotate: text.trim() ? 0 : -20 }}
              transition={spring.bouncy}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-[var(--surface)] transition-opacity disabled:opacity-40 dark:bg-accent dark:text-accent-ink"
            >
              <Send className="size-4" />
            </motion.button>
          </form>
        </div>
      ) : (
        <div className="border-t border-line px-4 py-3 text-[12px] text-ink-3">{t('job.chat.readOnly')}</div>
      )}
    </Card>
  )
}

const EVENT_KINDS = new Set(['status', 'revision', 'delivery', 'approval', 'system', 'brief'])

function Bubble({ message: m, mine, sender, lang }: { message: Message; mine: boolean; sender?: ReturnType<ReturnType<typeof useJobCtx>['person']>; lang: 'en' | 'de' | 'tr' }) {
  const t = useT()
  const event = EVENT_KINDS.has(m.kind) || m.senderId === 'system'
  const anim = { initial: { opacity: 0, y: 14, scale: 0.92, filter: 'blur(4px)' }, animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }, exit: { opacity: 0, scale: 0.9 }, transition: spring.snappy }
  if (event)
    return (
      <motion.div layout {...anim} className="flex justify-center">
        <div className="max-w-[92%] rounded-[16px] border border-line bg-[var(--surface)]/70 px-3 py-2 text-center">
          <div className="line-clamp-2 whitespace-pre-line text-[12px] leading-snug text-ink-2">{m.text}</div>
          {m.attachments && m.attachments.length > 0 && (
            <div className="mt-1.5 flex justify-center gap-1">
              {m.attachments.slice(0, 3).map((a, i) => (
                <span key={i} className="size-9 overflow-hidden rounded-lg">
                  <MediaView media={a} playBadge={false} />
                </span>
              ))}
            </div>
          )}
          <div className="mt-0.5 font-mono text-[10px] text-ink-3">
            {sender?.name ?? ''} · {chatTime(m.createdAt, lang)}
          </div>
        </div>
      </motion.div>
    )
  return (
    <motion.div layout {...anim} style={{ originX: mine ? 1 : 0 }} className={cn('flex items-end gap-1.5', mine ? 'justify-end' : 'justify-start')}>
      {!mine && <PersonAvatar person={sender} size={22} className="mb-0.5 shrink-0" />}
      <div className={cn('max-w-[82%] min-w-0')}>
        <div
          className={cn(
            'rounded-[18px] px-3 py-2 text-[13px] leading-snug',
            mine ? 'rounded-br-[6px] bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'rounded-bl-[6px] bg-[var(--surface-2)] text-ink',
          )}
        >
          {m.kind === 'voice' ? (
            <span className="inline-flex items-center gap-1.5">
              <Mic className="size-3.5" />
              {t('job.chat.voice', { s: m.duration ?? 0 })}
            </span>
          ) : (
            <span className="whitespace-pre-line break-words">{m.text}</span>
          )}
          {m.attachments && m.attachments.length > 0 && (
            <span className="mt-1.5 flex gap-1">
              {m.attachments.slice(0, 3).map((a, i) => (
                <span key={i} className="size-10 overflow-hidden rounded-lg ring-1 ring-black/10">
                  <MediaView media={a} playBadge={false} />
                </span>
              ))}
              {m.attachments.length > 3 && (
                <span className="flex size-10 items-center justify-center rounded-lg bg-black/10 text-[11px]">
                  <Paperclip className="mr-0.5 size-3" />
                  {m.attachments.length - 3}
                </span>
              )}
            </span>
          )}
        </div>
        <div className={cn('mt-0.5 flex items-center gap-1 px-1 font-mono text-[10px] text-ink-3', mine && 'justify-end')}>
          {m.reactions.length > 0 && <span className="mr-1 not-italic">{m.reactions.map((r) => r.emoji).join('')}</span>}
          {chatTime(m.createdAt, lang)}
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────── AI insights ───────────────────────────

function Insights() {
  const t = useT()
  const lang = useLang()
  const { job, side, canAct, showVersion, openModal, setTab } = useJobCtx()
  const invoices = useApp((s) => s.invoices)
  const nudge = useNudge()

  const items = useMemo(() => {
    const out: { tone: 'danger' | 'warning' | 'accent' | 'success'; text: string }[] = []
    const closed = isClosed(job.status)
    const risk = jobRisk(job)
    if (!closed) {
      const total = new Date(job.dueAt).getTime() - new Date(job.createdAt).getTime()
      const expected = Math.round(Math.max(0, Math.min(1, (Date.now() - new Date(job.createdAt).getTime()) / (total || 1))) * 100)
      const days = daysUntil(job.dueAt)
      if (job.status === 'requested')
        out.push(
          job.counterOffer?.status === 'pending'
            ? { tone: 'warning', text: t(side === 'client' ? 'job.ai.counterClient' : 'job.ai.counterDesigner') }
            : { tone: 'accent', text: t(side === 'client' ? 'job.ai.awaitingDesigner' : 'job.ai.awaitingYou', { time: timeAgo(job.createdAt, lang) }) },
        )
      else if (days < 0) out.push({ tone: 'danger', text: t('job.ai.overdue', { n: Math.abs(days) }) })
      else if (job.progress + 10 < expected) out.push({ tone: 'warning', text: t('job.ai.behind', { progress: job.progress, expected }) })
      else out.push({ tone: 'success', text: t('job.ai.onPace', { progress: job.progress, expected }) })
      if (risk.level !== 'low' && job.blocker) out.push({ tone: 'danger', text: t('job.ai.blocker', { text: job.blocker }) })
    }
    const latest = job.versions[job.versions.length - 1]
    const pins = latest?.annotations.filter((a) => !a.resolved).length ?? 0
    if (pins) out.push({ tone: 'warning', text: t('job.ai.pins', { count: pins, n: latest!.version }) })
    const openItems = job.revisions.filter((r) => r.status !== 'resolved').flatMap((r) => r.items.filter((i) => !i.done)).length
    if (openItems) out.push({ tone: 'warning', text: t('job.ai.revItems', { count: openItems }) })
    const left = job.deliverables.filter((d) => !d.done).length
    if (!closed && left) out.push({ tone: 'accent', text: t('job.ai.deliverables', { count: left }) })
    if (job.revisions.length >= job.revisionLimit && !closed) out.push({ tone: 'warning', text: t('job.ai.limit') })
    const unpaid = invoices.find((i) => i.jobId === job.id && (i.status === 'pending' || i.status === 'overdue'))
    if (unpaid) out.push({ tone: unpaid.status === 'overdue' ? 'danger' : 'accent', text: t('job.ai.invoice', { id: unpaid.id, amount: formatMoney(unpaid.amount, unpaid.currency, lang) }) })
    if (job.status === 'approved') out.push({ tone: 'success', text: t('job.ai.done') })
    return out.slice(0, 4)
  }, [job, invoices, t, lang, side])

  const action =
    side === 'designer' && job.status === 'requested'
      ? job.counterOffer?.status === 'pending'
        ? { label: t('job.ai.cta.timeline'), run: () => setTab('timeline') }
        : { label: t('job.act.d.propose'), run: () => openModal('counter') }
      : side === 'client' && job.status === 'in_review'
      ? { label: t('job.ai.cta.review'), run: () => showVersion() }
      : side === 'designer' && job.status === 'revisions'
        ? { label: t('job.ai.cta.revisions'), run: () => setTab('revisions') }
        : side === 'designer' && isActiveWork(job.status)
          ? { label: t('job.ai.cta.deliver'), run: () => openModal('deliver') }
          : !isClosed(job.status)
            ? { label: t('job.ai.cta.nudge'), run: nudge }
            : { label: t('job.ai.cta.timeline'), run: () => setTab('timeline') }

  const dot = { danger: 'bg-danger', warning: 'bg-[var(--warning)]', accent: 'bg-accent', success: 'bg-success' }

  return (
    <Card variant="night" className="overflow-hidden">
      <motion.div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[var(--accent)] opacity-20 blur-3xl" animate={{ scale: [1, 1.2, 1], opacity: [0.14, 0.24, 0.14] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <div className="relative z-[1]">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-[14px] font-medium text-on-night">
            <motion.span className="flex size-7 items-center justify-center rounded-full bg-accent text-accent-ink" animate={{ rotate: [0, 12, -8, 0] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}>
              <Sparkles className="size-3.5" />
            </motion.span>
            {t('core.ai.name')}
          </span>
          <span className="font-mono text-[11px] text-on-night/50">{timeAgo(job.updatedAt, lang)}</span>
        </div>
        <h3 className="mt-3 text-[19px] font-medium leading-tight tracking-[-0.02em] text-on-night">{t('job.ai.title', { count: items.length })}</h3>
        <ul className="mt-3 space-y-2">
          <AnimatePresence initial={false}>
            {items.map((it, i) => (
              <motion.li
                key={it.text}
                layout
                className="flex items-start gap-2.5 text-[13px] leading-snug text-on-night/80"
                initial={{ opacity: 0, x: -10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: EASE_OUT }}
              >
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', dot[it.tone])} />
                <span>{it.text}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {canAct && (
          <Button variant="accent" size="md" className="mt-4" onClick={action.run}>
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  )
}

// ─────────────────────────── counterpart ───────────────────────────

function Counterpart() {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const { job, side, counterpart } = useJobCtx()
  const designer = useDesigner(side === 'client' ? job.designerId : undefined)
  const client = useClient(side === 'designer' ? job.clientId : undefined)
  const ensure = useApp((s) => s.ensureConversation)
  const jobs = useApp((s) => s.jobs)
  const together = useMemo(() => jobs.filter((j) => j.clientId === job.clientId && j.designerId === job.designerId).length, [jobs, job.clientId, job.designerId])
  if (!counterpart) return null

  const stats: { label: string; value: string }[] = designer
    ? [
        { label: t('core.common.responseTime'), value: `~${designer.responseTimeHrs}h` },
        { label: t('core.common.onTime'), value: `${Math.round(designer.onTimeRate * 100)}%` },
        { label: t('job.cp.together'), value: String(together) },
      ]
    : client
      ? [
          { label: t('job.cp.hires'), value: String(client.hiresCount) },
          { label: t('job.cp.budget'), value: `${formatMoney(client.budgetRange[0], client.currency, lang, true)}–${formatMoney(client.budgetRange[1], client.currency, lang, true)}` },
          { label: t('job.cp.together'), value: String(together) },
        ]
      : []

  return (
    <Card spotlight>
      <SectionTitle icon={<UserRound />} title={t(side === 'client' ? 'job.cp.designer' : 'job.cp.client')} />
      <div className="relative z-[1] mt-4 flex items-center gap-3">
        <motion.span whileHover={{ rotate: -6, scale: 1.06 }} transition={spring.bouncy}>
          <PersonAvatar person={counterpart} size={56} ring />
        </motion.span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[16px] font-medium tracking-[-0.01em] text-ink">{counterpart.name}</span>
            {(designer?.verified || client?.verified) && <BadgeCheck className="size-4 shrink-0 text-info" />}
          </div>
          <div className="line-clamp-2 text-[12.5px] leading-snug text-ink-3">{designer ? designer.headline : client ? `${client.contactName} · ${client.contactRole}` : counterpart.sub}</div>
          <div className="mt-1 flex items-center gap-2">
            <RatingStars value={designer?.rating ?? client?.rating ?? 0} size={13} showValue count={designer?.reviewsCount} />
          </div>
        </div>
      </div>
      <div className="relative z-[1] mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-3">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" />
          {designer?.location ?? client?.location}
        </span>
        {designer && (
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" />
            {designer.timezone}
          </span>
        )}
        {client?.paymentVerified && (
          <span className="inline-flex items-center gap-1 text-success">
            <BadgeCheck className="size-3.5" />
            {t('job.cp.paymentVerified')}
          </span>
        )}
      </div>
      <div className="relative z-[1] mt-3 grid grid-cols-3 gap-1.5">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0 rounded-[14px] bg-[var(--surface-2)] px-2.5 py-2">
            <div className="truncate text-[10.5px] text-ink-3">{s.label}</div>
            <div className="truncate font-mono text-[13px] font-medium text-ink">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="relative z-[1] mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" variant="glass" icon={<UserRound className="size-3.5" />} onClick={() => navigate(`/network/${counterpart.id}`)}>
          {t('core.action.seeProfile')}
        </Button>
        <Button size="sm" icon={<MessageCircle className="size-3.5" />} onClick={() => navigate(`/messages/${job.conversationId ?? ensure(job.clientId, job.designerId)}`)}>
          {t('core.action.message')}
        </Button>
      </div>
    </Card>
  )
}

// ─────────────────────────── upcoming events ───────────────────────────

const EVENT_ICON: Record<CalendarEvent['kind'], typeof Video> = {
  call: Video,
  review: Sparkles,
  deadline: CalendarClock,
  focus: Clock3,
  milestone: BadgeCheck,
}

function Upcoming() {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const { job, side, canAct, openModal } = useJobCtx()
  const events = useApp((s) => s.events)
  const removeEvent = useApp((s) => s.removeEvent)
  const list = useMemo(() => {
    const from = Date.now() - 60 * 60_000
    return events
      .filter((e) => e.jobId === job.id && e.role === side && new Date(e.at).getTime() >= from)
      .sort((a, b) => a.at.localeCompare(b.at))
  }, [events, job.id, side])
  const past = events.filter((e) => e.jobId === job.id && e.role === side).length - list.length
  const shown = list.slice(0, 4)

  return (
    <Card>
      <SectionTitle
        icon={<CalendarClock />}
        title={t('job.events.title')}
        sub={past > 0 ? t('job.events.past', { count: past }) : undefined}
        right={
          canAct && (
            <IconButton label={t('job.hero.schedule')} size="sm" variant="soft" onClick={() => openModal('schedule')}>
              <CalendarPlus className="size-4" />
            </IconButton>
          )
        }
      />
      <ul className="relative z-[1] mt-3 space-y-1.5">
        <AnimatePresence initial={false}>
          {shown.map((e, i) => {
            const Icon = EVENT_ICON[e.kind] ?? CalendarClock
            const d = new Date(e.at)
            const soon = d.getTime() - Date.now() < 24 * 3600_000
            return (
              <motion.li
                key={e.id}
                layout
                className="group/ev flex items-center gap-3 rounded-[16px] p-1.5 transition-colors hover:bg-[var(--surface-2)]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05, ...spring.smooth } }}
                exit={{ opacity: 0, x: 16 }}
              >
                <button type="button" onClick={() => navigate('/calendar')} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className={cn('flex w-12 shrink-0 flex-col items-center rounded-[12px] py-1.5', soon ? 'bg-accent text-accent-ink' : 'bg-[var(--surface-2)] text-ink')}>
                    <span className="font-mono text-[10px] uppercase opacity-70">{fmt(d, 'MMM', lang)}</span>
                    <span className="text-[18px] font-medium leading-none tracking-[-0.02em]">{fmt(d, 'd', lang)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium text-ink">{e.title}</span>
                    <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-3">
                      <Icon className="size-3" />
                      {fmt(d, 'EEE HH:mm', lang)} · {e.durationMin}m
                      {soon && <LiveDot className="ml-1" color="var(--accent)" />}
                    </span>
                  </span>
                </button>
                {canAct && (
                  <button
                    type="button"
                    aria-label={t('core.action.remove')}
                    onClick={() => {
                      removeEvent(e.id)
                      toast({ title: t('job.events.removed'), description: e.title, tone: 'info', duration: 2200 })
                    }}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3 opacity-100 transition-all hover:bg-danger-soft hover:text-danger sm:opacity-0 sm:group-hover/ev:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </motion.li>
            )
          })}
        </AnimatePresence>
        {!shown.length && (
          <li className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-line-2 px-3 py-5 text-center">
            <span className="text-[12.5px] text-ink-3">{t('job.events.empty')}</span>
            {canAct && (
              <Button size="xs" variant="soft" icon={<CalendarPlus className="size-3" />} onClick={() => openModal('schedule')}>
                {t('job.hero.schedule')}
              </Button>
            )}
          </li>
        )}
      </ul>
      {list.length > shown.length && (
        <button type="button" onClick={() => navigate('/calendar')} className="relative z-[1] mt-2 text-[12px] font-medium text-ink-2 hover:text-ink">
          {t('job.events.more', { count: list.length - shown.length })}
        </button>
      )}
    </Card>
  )
}

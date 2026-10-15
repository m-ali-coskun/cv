import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { differenceInCalendarDays } from 'date-fns'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  BellRing,
  CalendarCheck,
  CalendarX,
  Clock3,
  Compass,
  MessageCircle,
  Quote,
  RefreshCw,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLang, useT } from '@/i18n'
import { useApp, ME_CLIENT_ID } from '@/store'
import { useDesigner } from '@/store/selectors'
import type { Job } from '@/store/types'
import { toast } from '@/store/toasts'
import { shortDate, timeAgo } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { spring } from '@/lib/motion'
import { fireEmoji } from '@/lib/confetti'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { DisciplineBadge } from '@/components/ui/Badge'
import { MediaView } from '@/components/art/MediaView'
import { useJobCommands, useStartFlow } from './flows'
import { declineReason, useNow } from './model'

const NUDGE_MARK = 'Just checking in on'
const NUDGE_COOLDOWN = 10 * 60_000

/** A designer proposed a different deadline — the client decides. */
export function CounterReviewCard({ job }: { job: Job }) {
  const t = useT()
  const lang = useLang()
  const designer = useDesigner(job.designerId)
  const cmd = useJobCommands()
  const offer = job.counterOffer
  if (!offer) return null
  const diff = differenceInCalendarDays(new Date(offer.dueAt), new Date(job.dueAt))
  return (
    <motion.article className="card relative overflow-hidden p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-[var(--info)] opacity-[0.08] blur-2xl" />
      <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3 lg:min-w-[340px]">
          <Avatar seed={designer?.avatarSeed ?? job.designerId} media={designer?.avatar} size={46} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-3">
              <span className="font-medium text-ink">{designer?.name}</span>
              {designer?.verified && <BadgeCheck className="size-3.5 text-info" />}
              <span>· {t('jobs.creq.proposed', { ago: timeAgo(job.updatedAt, lang) })}</span>
            </p>
            <p className="mt-0.5 truncate text-[16px] font-medium tracking-[-0.01em]">{job.title}</p>
            {offer.note && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-ink-2">
                <Quote className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
                <span className="line-clamp-2">{offer.note}</span>
              </p>
            )}
          </div>
        </div>
        <div className="tile flex items-center gap-3 px-4 py-3">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-3">{t('jobs.counter.original')}</p>
            <p className="font-mono text-[14px] text-ink-3 line-through">{shortDate(job.dueAt, lang)}</p>
          </div>
          <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
            <ArrowRight className="size-4 text-ink-3" />
          </motion.span>
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-3">{t('jobs.counter.proposed')}</p>
            <p className="font-mono text-[15px] font-medium">{shortDate(offer.dueAt, lang)}</p>
          </div>
          <span className="ml-1 inline-flex h-7 items-center rounded-full bg-warning-soft px-2.5 font-mono text-[12px] font-medium">
            {diff > 0 ? '+' : ''}
            {t('core.common.daysShort', { count: diff })}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <Button icon={<CalendarCheck className="size-4" />} onClick={() => cmd.answerCounter(job, true)} className="flex-1 lg:flex-none">
            {t('jobs.menu.acceptDate')}
          </Button>
          <Button variant="outline" icon={<CalendarX className="size-4" />} onClick={() => cmd.answerCounter(job, false)} className="flex-1 lg:flex-none">
            {t('jobs.menu.keepDate')}
          </Button>
          <Button variant="ghost" size="md" icon={<MessageCircle className="size-4" />} onClick={() => cmd.message(job)} aria-label={t('core.action.message')}>
            <span className="lg:sr-only">{t('core.action.message')}</span>
          </Button>
        </div>
      </div>
    </motion.article>
  )
}

/** Brief sent, designer hasn't answered yet: waiting meter, nudge, cancel. */
export function AwaitingBriefCard({ job }: { job: Job }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const designer = useDesigner(job.designerId)
  const messages = useApp((s) => s.messages)
  const sendMessage = useApp((s) => s.sendMessage)
  const cmd = useJobCommands()
  const flow = useStartFlow()
  const now = useNow(15_000)
  const nudgeBtn = useRef<HTMLButtonElement>(null)

  const lastNudge = useMemo(() => {
    const conv = job.conversationId
    let at: string | undefined
    for (const m of messages) if (m.conversationId === conv && m.senderId === ME_CLIENT_ID && m.jobId === job.id && m.text.includes(NUDGE_MARK) && (!at || m.createdAt > at)) at = m.createdAt
    return at
  }, [messages, job.conversationId, job.id])
  const cooling = !!lastNudge && now - new Date(lastNudge).getTime() < NUDGE_COOLDOWN

  const waitedH = (now - new Date(job.createdAt).getTime()) / 36e5
  const expected = Math.max(1, designer?.responseTimeHrs ?? 6)
  const ratio = Math.min(1, waitedH / (expected * 2))
  const late = waitedH > expected
  const rejectedCounter = job.counterOffer?.status === 'rejected'

  const nudge = () => {
    const conv = job.conversationId ?? useApp.getState().ensureConversation(job.clientId, job.designerId)
    const first = (designer?.name ?? '').split(' ')[0] || 'there'
    sendMessage(conv, { text: `Hi ${first}! ${NUDGE_MARK} “${job.title}” — happy to answer any questions about the brief. 🙏`, jobId: job.id })
    fireEmoji('👋', { from: nudgeBtn.current, particleCount: 10 })
    toast({ title: t('jobs.creq.nudged', { name: designer?.name ?? '' }), tone: 'success', link: `/messages/${conv}` })
  }

  return (
    <motion.article whileHover={{ y: -3 }} transition={spring.snappy} className="card relative flex flex-col overflow-hidden">
      <div className="relative h-24 overflow-hidden">
        <MediaView media={job.cover} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,rgba(0,0,0,.45))]" />
        <span className="absolute left-3 top-3 inline-flex h-6 items-center rounded-full bg-white/80 px-2 font-mono text-[11px] font-medium text-[#0b0b0c] backdrop-blur-md">{job.id}</span>
        <span className="absolute bottom-3 left-3 right-3 truncate text-[15px] font-medium text-white">{job.title}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar seed={designer?.avatarSeed ?? job.designerId} media={designer?.avatar} size={40} status={designer?.availability === 'available' ? 'online' : 'away'} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-[14px] font-medium">
              {designer?.name}
              {designer?.verified && <BadgeCheck className="size-3.5 shrink-0 text-info" />}
            </p>
            <p className="truncate text-[12px] text-ink-3">{designer?.headline}</p>
          </div>
          {designer && (
            <span className="inline-flex items-center gap-1 text-[12.5px] font-medium">
              <Star className="size-3.5 fill-[#FFB21E] text-[#FFB21E]" />
              {designer.rating.toFixed(1)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <DisciplineBadge id={job.discipline} />
          <span className="inline-flex h-7 items-center rounded-full bg-[var(--surface-2)] px-2.5 font-mono text-[12px]">{formatMoney(job.budget, job.currency, lang)}</span>
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 text-[12px] text-ink-2">
            <Clock3 className="size-3.5" /> {shortDate(job.dueAt, lang)}
          </span>
        </div>

        {rejectedCounter && (
          <p className="rounded-2xl bg-info-soft px-3 py-2 text-[12px] text-[color-mix(in_oklab,var(--info)_70%,var(--ink))]">{t('jobs.creq.keptDate')}</p>
        )}

        {/* waiting meter */}
        <div className="tile p-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-ink-2">{t('jobs.creq.sent', { ago: timeAgo(job.createdAt, lang) })}</span>
            <span className={cn('font-medium', late ? 'text-[color-mix(in_oklab,var(--warning)_70%,var(--ink))]' : 'text-ink-3')}>
              {late ? t('jobs.creq.late') : t('jobs.creq.usually', { n: expected })}
            </span>
          </div>
          <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: late ? 'var(--warning)' : 'var(--accent)' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(4, ratio * 100)}%` }}
              transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
            />
            <span className="absolute inset-y-0 left-1/2 w-px bg-ink-3/50" title={t('jobs.creq.usually', { n: expected })} />
          </div>
          {lastNudge && <p className="mt-1.5 text-[11.5px] text-ink-3">{t('jobs.creq.lastNudge', { ago: timeAgo(lastNudge, lang) })}</p>}
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <Button ref={nudgeBtn} size="sm" icon={<BellRing className="size-4" />} onClick={nudge} disabled={cooling} className="flex-1">
            {cooling ? t('jobs.creq.nudgedShort') : t('jobs.creq.nudge')}
          </Button>
          <Button size="sm" variant="glass" icon={<MessageCircle className="size-4" />} onClick={() => cmd.message(job)} className="flex-1">
            {t('core.action.message')}
          </Button>
          <Button size="sm" variant="ghost" icon={<ArrowUpRight className="size-4" />} onClick={() => navigate(`/jobs/${job.id}`)} aria-label={t('jobs.req.openBrief')} />
          <Button size="sm" variant="ghost" icon={<Ban className="size-4" />} onClick={() => flow('cancel', job)} className="text-danger" aria-label={t('jobs.menu.cancel')} />
        </div>
      </div>
    </motion.article>
  )
}

/** A designer passed on Ali's brief — offer the obvious next steps. */
export function DeclinedBriefRow({ job }: { job: Job }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const designer = useDesigner(job.designerId)
  const reason = declineReason(job)
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar seed={designer?.avatarSeed ?? job.designerId} media={designer?.avatar} size={38} />
        <div className="min-w-0">
          <p className="text-[12px] text-ink-3">
            <span className="font-mono">{job.id}</span> · {designer?.name} · {timeAgo(job.updatedAt, lang)}
          </p>
          <p className="truncate text-[14px] font-medium">{job.title}</p>
          {reason && (
            <p className="mt-0.5 flex items-start gap-1 text-[12px] text-ink-3">
              <Quote className="mt-0.5 size-3 shrink-0" /> <span className="line-clamp-2">{reason}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="soft" icon={<Compass className="size-4" />} onClick={() => navigate(`/discover`)}>
          {t('jobs.creq.findAnother')}
        </Button>
        <Button size="sm" variant="ghost" icon={<RefreshCw className="size-4" />} onClick={() => navigate('/brief/new')}>
          {t('jobs.creq.rebrief')}
        </Button>
      </div>
    </div>
  )
}

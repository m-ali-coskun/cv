import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Hourglass,
  ListChecks,
  MessageCircle,
  Quote,
  Star,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { matchScore, useClient } from '@/store/selectors'
import type { Job } from '@/store/types'
import { shortDate, timeAgo } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { EASE_OUT, spring } from '@/lib/motion'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { DisciplineBadge, PriorityBadge } from '@/components/ui/Badge'
import { Countdown } from './Countdown'
import { StyleGuidePreview } from './StyleGuidePreview'
import { useJobCommands, useStartFlow } from './flows'
import { StarButton } from './JobCard'

export type RequestOutcome = 'accepted' | 'declined' | 'countered'

/**
 * Designer inbox card for an incoming brief: client identity + trust badges,
 * budget, live deadline countdown, deliverables, description, style guide and
 * assets, and the three decisions (accept · propose new date · decline).
 */
export function RequestCard({ job, isNew, onOutcome }: { job: Job; isNew?: boolean; onOutcome?: (o: RequestOutcome) => void }) {
  const t = useT()
  const lang = useLang()
  const client = useClient(job.clientId)
  const discipline = useApp((s) => s.settings.discipline)
  const toggleStar = useApp((s) => s.toggleStar)
  const cmd = useJobCommands()
  const flow = useStartFlow()
  const acceptRef = useRef<HTMLButtonElement>(null)
  const [more, setMore] = useState(false)
  const waiting = job.counterOffer?.status === 'pending'
  const rejected = job.counterOffer?.status === 'rejected'
  const score = client ? matchScore(client, 'designer', discipline) : 0
  const doneCount = job.deliverables.length

  return (
    <motion.article
      className={cn(
        'card relative overflow-hidden',
        isNew && 'shadow-[0_0_0_2px_var(--accent),0_30px_60px_-30px_var(--accent)]',
      )}
    >
      {isNew && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2.4, ease: EASE_OUT }}
          style={{ background: 'radial-gradient(120% 80% at 0% 0%, var(--accent-soft), transparent 60%)' }}
        />
      )}

      {/* header: client */}
      <header className="relative z-[1] flex flex-wrap items-start gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        {client ? (
          <Avatar kind="brand" name={client.name} color={client.logoColor} seed={client.avatarSeed} size={46} />
        ) : (
          <Avatar seed={job.clientId} size={46} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[15.5px] font-medium tracking-[-0.01em]">{client?.name ?? '—'}</span>
            {client?.verified && (
              <span className="inline-flex h-5.5 items-center gap-1 rounded-full bg-info-soft px-2 text-[11px] font-medium text-[color-mix(in_oklab,var(--info)_70%,var(--ink))]">
                <BadgeCheck className="size-3.5" /> {t('core.common.verified')}
              </span>
            )}
            {client?.paymentVerified && (
              <span className="inline-flex h-5.5 items-center gap-1 rounded-full bg-success-soft px-2 text-[11px] font-medium text-[color-mix(in_oklab,var(--success)_75%,var(--ink))]">
                <CreditCard className="size-3.5" /> {t('jobs.req.paymentVerified')}
              </span>
            )}
            {isNew && (
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={spring.wobbly}
                className="inline-flex h-5.5 items-center rounded-full bg-accent px-2 text-[11px] font-semibold text-accent-ink"
              >
                {t('core.common.new')}
              </motion.span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
            {client ? `${client.contactName} · ${client.industry} · ${client.location}` : ''}
          </p>
          {client && (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-2">
              <span className="inline-flex items-center gap-1">
                <Star className="size-3.5 fill-[#FFB21E] text-[#FFB21E]" />
                {client.rating.toFixed(1)}
              </span>
              <span>{t('jobs.req.hires', { count: client.hiresCount })}</span>
              <span className="inline-flex items-center gap-1 font-medium text-accent-text">{t('core.common.matchScore', { score })}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="hidden text-right sm:block">
            <span className="block font-mono text-[11.5px] text-ink-3">{job.id}</span>
            <span className="block text-[11.5px] text-ink-3">{timeAgo(job.createdAt, lang)}</span>
          </span>
          <StarButton starred={job.starred} onToggle={() => toggleStar(job.id)} glass={false} />
        </div>
      </header>

      <div className="relative z-[1] grid gap-5 px-4 pb-4 pt-4 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        {/* left: the brief */}
        <div className="min-w-0">
          <h3 className="text-[20px] font-medium leading-tight tracking-[-0.02em] sm:text-[22px]">{job.title}</h3>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <DisciplineBadge id={job.discipline} />
            <PriorityBadge priority={job.priority} />
            {job.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="inline-flex h-7 items-center rounded-full border border-line-2 px-2.5 text-[12px] text-ink-2">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
            <div className="tile flex flex-col justify-between gap-2 p-3">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
                <CircleDollarSign className="size-3.5" /> {t('core.common.budget')}
              </span>
              <span className="font-mono text-[20px] font-medium leading-none tabular-nums">{formatMoney(job.budget, job.currency, lang)}</span>
            </div>
            <div className="tile order-3 col-span-2 flex flex-col justify-between gap-2 p-3 sm:order-none sm:col-span-1">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
                <CalendarClock className="size-3.5" /> {t('core.common.deadline')} · <span className="font-mono">{shortDate(job.dueAt, lang)}</span>
              </span>
              <Countdown due={job.dueAt} from={job.createdAt} />
            </div>
            <div className="tile flex flex-col justify-between gap-2 p-3">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
                <ListChecks className="size-3.5" /> {t('jobs.req.deliverables')}
              </span>
              <span className="font-mono text-[20px] font-medium leading-none tabular-nums">{doneCount}</span>
            </div>
          </div>

          {/* description */}
          <div className="mt-4">
            <motion.p
              layout
              className={cn('whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2', !more && 'line-clamp-3')}
            >
              {job.description || job.summary}
            </motion.p>
            {(job.description || '').length > 180 && (
              <button
                type="button"
                onClick={() => setMore((m) => !m)}
                className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink hover:underline"
              >
                {t(more ? 'jobs.req.less' : 'jobs.req.more')}
                <ChevronDown className={cn('size-3.5 transition-transform', more && 'rotate-180')} />
              </button>
            )}
          </div>

          {/* deliverables */}
          <ul className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {job.deliverables.map((d, i) => (
              <motion.li
                key={d.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.1 + i * 0.04 } }}
                className="flex items-start gap-2 text-[13px]"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-text" />
                <span className="min-w-0">{d.label}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* right: style guide */}
        <div className="tile min-w-0 p-4">
          <StyleGuidePreview job={job} />
        </div>
      </div>

      {/* decision bar */}
      <footer className="relative z-[1] border-t border-line px-4 py-3 sm:px-5">
        {rejected && !waiting && (
          <div className="mb-3 flex items-start gap-2 rounded-2xl bg-warning-soft px-3 py-2 text-[12.5px]">
            <Hourglass className="mt-0.5 size-3.5 shrink-0" />
            <span>{t('jobs.req.counterRejected', { date: shortDate(job.dueAt, lang) })}</span>
          </div>
        )}
        {waiting && job.counterOffer ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-info-soft">
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-[var(--info)]"
                  animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                />
                <Hourglass className="size-4 text-[var(--info)]" />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium">{t('jobs.req.waitingClient', { name: client?.name ?? '' })}</p>
                <p className="flex flex-wrap items-center gap-1.5 font-mono text-[12px] text-ink-3">
                  <span className="line-through">{shortDate(job.dueAt, lang)}</span>
                  <ArrowRight className="size-3" />
                  <span className="text-ink">{shortDate(job.counterOffer.dueAt, lang)}</span>
                  {job.counterOffer.note && <span className="truncate font-sans">· “{job.counterOffer.note}”</span>}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="glass" size="sm" icon={<MessageCircle className="size-4" />} onClick={() => cmd.message(job)}>
                {t('core.action.message')}
              </Button>
              <Button variant="ghost" size="sm" iconRight={<ArrowUpRight className="size-4" />} onClick={() => cmd.open(job)}>
                {t('jobs.req.openBrief')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              ref={acceptRef}
              icon={<Check className="size-4" />}
              onClick={() => {
                onOutcome?.('accepted')
                cmd.accept(job, acceptRef.current)
              }}
              className="flex-1 sm:flex-none"
            >
              {t('jobs.req.accept')}
            </Button>
            <Button
              variant="accent"
              icon={<CalendarClock className="size-4" />}
              onClick={() => flow('counter', job, () => onOutcome?.('countered'))}
              className="flex-1 sm:flex-none"
            >
              {t('jobs.req.counter')}
            </Button>
            <Button variant="outline" icon={<X className="size-4" />} onClick={() => flow('decline', job, () => onOutcome?.('declined'))} className="flex-1 sm:flex-none">
              {t('core.action.decline')}
            </Button>
            <div className="ml-auto flex w-full justify-end gap-1 sm:w-auto">
              <Button variant="ghost" size="sm" icon={<MessageCircle className="size-4" />} onClick={() => cmd.message(job)}>
                {t('jobs.req.ask')}
              </Button>
              <Button variant="ghost" size="sm" iconRight={<ArrowUpRight className="size-4" />} onClick={() => cmd.open(job)}>
                {t('jobs.req.openBrief')}
              </Button>
            </div>
          </div>
        )}
      </footer>
    </motion.article>
  )
}

/** Compact row for history lists (declined requests, resolved counter-offers). */
export function RequestHistoryRow({ job, reason, outcome }: { job: Job; reason?: string; outcome: 'declined' | 'counterAccepted' | 'counterRejected' }) {
  const t = useT()
  const lang = useLang()
  const client = useClient(job.clientId)
  const cmd = useJobCommands()
  const tone =
    outcome === 'declined'
      ? 'bg-[var(--surface-3)] text-ink-2'
      : outcome === 'counterAccepted'
        ? 'bg-success-soft text-[color-mix(in_oklab,var(--success)_75%,var(--ink))]'
        : 'bg-warning-soft text-[color-mix(in_oklab,var(--warning)_65%,var(--ink))]'
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={spring.snappy}
      className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {client && <Avatar kind="brand" name={client.name} color={client.logoColor} seed={client.avatarSeed} size={38} />}
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[12px] text-ink-3">
            <span className="font-mono">{job.id}</span>· <span className="truncate">{client?.name}</span>
          </p>
          <p className="truncate text-[14px] font-medium">{job.title}</p>
          {reason && (
            <p className="mt-0.5 flex items-start gap-1 text-[12px] text-ink-3">
              <Quote className="mt-0.5 size-3 shrink-0" />
              <span className="line-clamp-2">{reason}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[12.5px] tabular-nums text-ink-2">{formatMoney(job.budget, job.currency, lang)}</span>
        <span className={cn('inline-flex h-7 items-center rounded-full px-2.5 text-[12px] font-medium', tone)}>
          {t(`jobs.req.outcome.${outcome}`)}
        </span>
        <span className="text-[12px] text-ink-3">{timeAgo(job.updatedAt, lang)}</span>
        <Button variant="ghost" size="sm" icon={<MessageCircle className="size-4" />} onClick={() => cmd.message(job)}>
          <span className="sr-only sm:not-sr-only">{t('core.action.message')}</span>
        </Button>
        <Button variant="ghost" size="sm" iconRight={<ArrowUpRight className="size-4" />} onClick={() => cmd.open(job)}>
          {t('core.action.open')}
        </Button>
      </div>
    </motion.div>
  )
}

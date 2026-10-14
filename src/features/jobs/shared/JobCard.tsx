import { forwardRef, type HTMLAttributes, type KeyboardEvent, type MouseEvent } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, BadgeCheck, CalendarClock, Clock3, ListChecks, MessageCircle, RotateCcw, Star, Timer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import type { Client, Designer, Role } from '@/store/types'
import { dueLabel } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { Avatar } from '@/components/ui/Avatar'
import { DisciplineBadge, PriorityBadge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/Progress'
import { MediaView } from '@/components/art/MediaView'
import { JobMenu } from './JobMenu'
import { URGENCY_BG, URGENCY_TEXT, type JobRow } from './model'

/** Avatar for whoever is on the other side of a job. */
export function CounterpartAvatar({ person, isClient, size = 22, seed }: { person?: Designer | Client; isClient: boolean; size?: number; seed: string }) {
  if (isClient && person && 'logoColor' in person)
    return <Avatar kind="brand" name={person.name} color={person.logoColor} seed={person.avatarSeed} size={size} />
  return <Avatar seed={person?.avatarSeed ?? seed} media={person && 'avatar' in person ? person.avatar : undefined} size={size} />
}

/** Star toggle with a springy pop. */
export function StarButton({ starred, onToggle, className, glass = true }: { starred: boolean; onToggle: () => void; className?: string; glass?: boolean }) {
  const t = useT()
  return (
    <motion.button
      type="button"
      aria-pressed={starred}
      aria-label={t(starred ? 'jobs.menu.unstar' : 'jobs.menu.star')}
      title={t(starred ? 'jobs.menu.unstar' : 'jobs.menu.star')}
      whileTap={{ scale: 0.8 }}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
        glass ? 'bg-white/75 text-[#0b0b0c] shadow-[0_2px_8px_-2px_rgba(0,0,0,.25)] backdrop-blur-md hover:bg-white' : 'text-ink-3 hover:bg-[var(--surface-2)] hover:text-ink',
        className,
      )}
    >
      <motion.span
        key={String(starred)}
        initial={{ scale: starred ? 0.3 : 1, rotate: starred ? -45 : 0 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 14 }}
        className="inline-flex"
      >
        <Star className={cn('size-4', starred && 'fill-[#FFB21E] text-[#FFB21E]')} />
      </motion.span>
    </motion.button>
  )
}

export interface JobCardProps extends HTMLAttributes<HTMLDivElement> {
  row: JobRow
  role: Role
  /** placeholder = the slot left behind while dragging; overlay = the lifted card. */
  state?: 'idle' | 'placeholder' | 'overlay'
  showCover?: boolean
  /** Briefly glow (e.g. just moved here). */
  highlight?: boolean
}

/**
 * Kanban job card: cover strip, mono ID, title, counterpart, discipline +
 * priority, due label coloured by urgency, progress, deliverables, unread
 * messages, star + quick menu.
 */
export const JobCard = forwardRef<HTMLDivElement, JobCardProps>(function JobCard(
  { row, role, state = 'idle', showCover = true, highlight, className, onClick, onKeyDown, ...rest },
  ref,
) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const toggleStar = useApp((s) => s.toggleStar)
  const { job } = row
  const open = () => navigate(`/jobs/${job.id}`)
  const openRevisions = job.revisions.filter((r) => r.status !== 'resolved').length
  const counterPending = job.counterOffer?.status === 'pending'

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    onClick?.(e)
    if (!e.defaultPrevented) open()
  }
  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e)
    if (e.key === 'Enter' && e.target === e.currentTarget) open()
  }

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={`${job.id} · ${job.title}`}
      onClick={handleClick}
      onKeyDown={handleKey}
      className={cn(
        'card group/card relative block w-full cursor-pointer select-none rounded-[22px] p-2 text-left outline-none transition-[box-shadow,opacity,filter] duration-200',
        'hover:shadow-[0_18px_40px_-18px_rgba(16,16,24,.35)] focus-visible:shadow-[0_0_0_3px_var(--accent-line)]',
        state === 'placeholder' && 'opacity-35 saturate-0 [box-shadow:none] outline-2 outline-dashed outline-[var(--line-2)]',
        state === 'overlay' && 'cursor-grabbing shadow-[0_40px_80px_-24px_rgba(16,16,24,.55),0_0_0_2px_var(--accent-line)]',
        highlight && 'shadow-[0_0_0_2px_var(--accent),0_18px_40px_-18px_var(--accent)]',
        className,
      )}
      {...rest}
    >
      {showCover && (
        <div className="relative h-[84px] overflow-hidden rounded-[16px]">
          <div className="absolute inset-0 transition-transform duration-500 ease-[var(--ease-out)] group-hover/card:scale-[1.06]">
            <MediaView media={job.cover} />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.18),transparent_45%,rgba(0,0,0,.28))]" />
          <span className="absolute left-2 top-2 inline-flex h-6 items-center rounded-full bg-white/80 px-2 font-mono text-[11px] font-medium text-[#0b0b0c] backdrop-blur-md">
            {job.id}
          </span>
          <div className="absolute right-1.5 top-1.5 flex gap-1">
            <StarButton starred={job.starred} onToggle={() => toggleStar(job.id)} className="size-7" />
            <JobMenu job={job} role={role} name={row.name} className="size-7" />
          </div>
          {row.version > 0 && (
            <span className="absolute bottom-2 left-2 inline-flex h-5 items-center rounded-md bg-black/50 px-1.5 font-mono text-[10.5px] text-white backdrop-blur-sm">
              v{row.version}
            </span>
          )}
          {row.unread > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (row.conversationId) navigate(`/messages/${row.conversationId}`)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              title={t('jobs.card.unread', { count: row.unread })}
              className="absolute bottom-2 right-2 inline-flex h-6 items-center gap-1 rounded-full bg-accent px-2 text-[11px] font-semibold text-accent-ink shadow-[0_4px_12px_-4px_var(--accent)]"
            >
              <MessageCircle className="size-3" />
              {row.unread}
            </button>
          )}
        </div>
      )}

      <div className={cn('px-1.5 pb-1', showCover ? 'pt-2.5' : 'pt-1')}>
        {!showCover && (
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-ink-3">{job.id}</span>
            <div className="flex items-center gap-0.5">
              {row.unread > 0 && (
                <span className="inline-flex h-5 items-center gap-1 rounded-full bg-accent px-1.5 text-[10.5px] font-semibold text-accent-ink">
                  <MessageCircle className="size-3" />
                  {row.unread}
                </span>
              )}
              <StarButton starred={job.starred} onToggle={() => toggleStar(job.id)} glass={false} className="size-7" />
              <JobMenu job={job} role={role} name={row.name} tone="ghost" className="size-7" />
            </div>
          </div>
        )}
        <h4 className="line-clamp-2 text-[14.5px] font-medium leading-snug tracking-[-0.01em] text-ink">{job.title}</h4>

        <div className="mt-2 flex items-center gap-2">
          <CounterpartAvatar person={row.counterpart} isClient={row.counterpartIsClient} seed={row.counterpartId} size={22} />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">{row.name}</span>
          <span className="font-mono text-[11.5px] tabular-nums text-ink-3">{formatMoney(job.budget, job.currency, lang, true)}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <DisciplineBadge id={job.discipline} className="h-6 pr-2 text-[11px]" />
          <PriorityBadge priority={job.priority} className="h-6 px-2 text-[11px]" />
        </div>

        {(job.blocker || counterPending || job.timerStartedAt || openRevisions > 0) && (
          <div className="mt-2 flex flex-col gap-1">
            {job.blocker && (
              <p className="flex items-start gap-1.5 rounded-xl bg-danger-soft px-2 py-1.5 text-[11.5px] leading-snug text-danger">
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                <span className="line-clamp-2">{job.blocker}</span>
              </p>
            )}
            {counterPending && (
              <p className="flex items-center gap-1.5 rounded-xl bg-info-soft px-2 py-1.5 text-[11.5px] text-[color-mix(in_oklab,var(--info)_70%,var(--ink))]">
                <CalendarClock className="size-3.5 shrink-0" />
                <span className="truncate">{t(role === 'client' ? 'jobs.card.counterForYou' : 'jobs.card.counterWaiting')}</span>
              </p>
            )}
            {openRevisions > 0 && job.status !== 'approved' && (
              <p className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
                <RotateCcw className="size-3.5 shrink-0 text-[#f97316]" />
                {t('jobs.card.revisionsOpen', { count: openRevisions })}
              </p>
            )}
            {job.timerStartedAt && (
              <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-accent-text">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-accent" />
                </span>
                <Timer className="size-3.5" /> {t('jobs.card.tracking')}
              </p>
            )}
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-2">
          <ProgressBar value={job.progress} height={6} tone={job.status === 'approved' ? 'success' : row.urgency === 'overdue' ? 'danger' : 'ink'} className="flex-1" />
          <span className="w-8 text-right font-mono text-[11px] tabular-nums text-ink-2">{job.progress}%</span>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          {job.status === 'approved' ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success-soft px-2 text-[11px] font-medium text-[color-mix(in_oklab,var(--success)_75%,var(--ink))]">
              <BadgeCheck className="size-3.5" />
              {job.rating ? `${job.rating}★` : t('core.status.approved')}
            </span>
          ) : (
            <span className={cn('inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium', URGENCY_BG[row.urgency], URGENCY_TEXT[row.urgency])}>
              <Clock3 className="size-3.5" />
              {dueLabel(job.dueAt, lang)}
            </span>
          )}
          <span
            className={cn('inline-flex items-center gap-1 font-mono text-[11px] tabular-nums', row.total && row.done === row.total ? 'text-[var(--success)]' : 'text-ink-3')}
            title={t('jobs.card.deliverables', { done: row.done, total: row.total })}
          >
            <ListChecks className="size-3.5" />
            {row.done}/{row.total}
          </span>
        </div>
      </div>
    </div>
  )
})

import { useMemo, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { AlarmClock, ArrowUpRight, Briefcase, CalendarClock, Hand, Wallet } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import type { Role } from '@/store/types'
import { item, stagger } from '@/lib/motion'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { isClosed, type JobRow } from '../shared/model'

export type QuickFilter = 'waiting' | 'week' | 'overdue' | 'starred' | null

/** KPI tiles over the board; each one is also a one-tap filter. */
export function SummaryStrip({ rows, role, active, onPick }: { rows: JobRow[]; role: Role; active: QuickFilter; onPick: (q: QuickFilter) => void }) {
  const t = useT()
  const s = useMemo(() => {
    const open = rows.filter((r) => !isClosed(r.job.status))
    const waiting = open.filter((r) =>
      role === 'client' ? r.job.status === 'in_review' || r.job.counterOffer?.status === 'pending' : r.job.status === 'requested' || r.job.status === 'revisions',
    )
    return {
      active: open.length,
      starred: rows.filter((r) => r.job.starred).length,
      waiting: waiting.length,
      week: open.filter((r) => r.days >= 0 && r.days <= 7).length,
      overdue: open.filter((r) => r.urgency === 'overdue').length,
      budget: open.reduce((n, r) => n + r.job.budget, 0),
      currency: rows[0]?.job.currency ?? 'EUR',
      approved: rows.filter((r) => r.job.status === 'approved').length,
    }
  }, [rows, role])

  return (
    <motion.div variants={stagger(0.05)} initial="hidden" animate="show" className="no-scrollbar -mx-2.5 flex snap-x snap-mandatory scroll-px-2.5 gap-2.5 overflow-x-auto px-2.5 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
      <Tile
        night
        icon={<Briefcase />}
        label={t('jobs.kpi.active')}
        value={<AnimatedCounter value={s.active} />}
        sub={t('jobs.kpi.activeSub', { starred: s.starred, approved: s.approved })}
        on={active === 'starred'}
        onClick={() => onPick(active === 'starred' ? null : 'starred')}
      />
      <Tile
        icon={<Hand />}
        label={t(role === 'client' ? 'jobs.kpi.yourMove' : 'jobs.kpi.toAnswer')}
        value={<AnimatedCounter value={s.waiting} />}
        sub={t(role === 'client' ? 'jobs.kpi.yourMoveSub' : 'jobs.kpi.toAnswerSub')}
        accent={s.waiting > 0}
        on={active === 'waiting'}
        onClick={() => onPick(active === 'waiting' ? null : 'waiting')}
      />
      <Tile
        icon={<CalendarClock />}
        label={t('jobs.kpi.week')}
        value={<AnimatedCounter value={s.week} />}
        sub={t('jobs.kpi.weekSub')}
        on={active === 'week'}
        onClick={() => onPick(active === 'week' ? null : 'week')}
      />
      <Tile
        icon={<AlarmClock />}
        label={t('jobs.kpi.overdue')}
        value={<AnimatedCounter value={s.overdue} />}
        sub={s.overdue ? t('jobs.kpi.overdueSub') : t('jobs.kpi.onTrack')}
        danger={s.overdue > 0}
        on={active === 'overdue'}
        onClick={() => onPick(active === 'overdue' ? null : 'overdue')}
      />
      <Tile
        className="sm:col-span-2 lg:col-span-1"
        icon={<Wallet />}
        label={t(role === 'client' ? 'jobs.kpi.committed' : 'jobs.kpi.pipeline')}
        value={<AnimatedCounter value={s.budget} currency={s.currency} />}
        sub={t('jobs.kpi.budgetSub', { count: s.active })}
      />
    </motion.div>
  )
}

function Tile({
  icon,
  label,
  value,
  sub,
  night,
  accent,
  danger,
  on,
  onClick,
  className,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  sub: string
  night?: boolean
  accent?: boolean
  danger?: boolean
  on?: boolean
  onClick?: () => void
  className?: string
}) {
  const Comp = onClick ? motion.button : motion.div
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      variants={item}
      onClick={onClick}
      whileHover={onClick ? { y: -3 } : undefined}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      aria-pressed={onClick ? !!on : undefined}
      className={cn(
        'group relative flex min-h-[92px] w-[46vw] max-w-[220px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[24px] p-3.5 text-left transition-shadow sm:w-auto sm:max-w-none sm:min-h-[104px] sm:p-4',
        night ? 'glass-night' : accent ? 'glass-accent' : 'card',
        danger && !night && 'shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--danger)_45%,transparent)]',
        on && 'shadow-[0_0_0_2.5px_var(--ink)] dark:shadow-[0_0_0_2.5px_var(--accent)]',
        className,
      )}
    >
      <div className="relative z-[1] flex items-start justify-between gap-2">
        <span className={cn('text-[13px]', night ? 'text-white/70' : accent ? 'text-accent-ink/75' : 'text-ink-2')}>{label}</span>
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110 [&_svg]:size-4',
            night ? 'bg-white/10 text-accent' : accent ? 'bg-accent-ink/10' : danger ? 'bg-danger-soft text-danger' : 'bg-[var(--surface-2)] text-ink-2',
          )}
        >
          {onClick && on ? <ArrowUpRight /> : icon}
        </span>
      </div>
      <div className="relative z-[1] mt-2 sm:mt-3">
        <div className={cn('text-[26px] sm:text-[30px] font-medium leading-none tracking-[-0.03em]', danger && !night && 'text-danger')}>{value}</div>
        <p className={cn('mt-1.5 truncate text-[12px]', night ? 'text-white/55' : accent ? 'text-accent-ink/70' : 'text-ink-3')}>{sub}</p>
      </div>
    </Comp>
  )
}

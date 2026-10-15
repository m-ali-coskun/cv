import { motion } from 'motion/react'
import { CalendarHeart, Flag, Headphones, Target } from 'lucide-react'
import { useLang, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/dates'
import { item as itemV, stagger } from '@/lib/motion'
import { Glass } from '@/components/ui/Glass'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { ProgressBar } from '@/components/ui/Progress'
import { hhmm } from './ui'
import type { CalItem } from './model'

const FOCUS_GOAL_H = 10

export function Stats({
  stats,
  onToday,
  onDeadlines,
  onFocus,
}: {
  stats: {
    todayCount: number
    nextToday?: CalItem
    bookedH: number
    calls: number
    reviews: number
    focusH: number
    deadlines: CalItem[]
    urgent: number
  }
  onToday: () => void
  onDeadlines: () => void
  onFocus: () => void
}) {
  const t = useT()
  const lang = useLang()
  const nextDeadline = stats.deadlines[0]
  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <motion.div variants={itemV}>
        <Tile variant="night" icon={<CalendarHeart className="size-4" />} label={t('calendar.stats.today')} onClick={onToday}>
          <AnimatedCounter value={stats.todayCount} className="text-[38px] font-medium leading-none tracking-[-0.04em]" />
          <p className="mt-2 truncate text-[12.5px] text-white/60">
            {stats.nextToday ? t('calendar.stats.nextAt', { time: hhmm(stats.nextToday.start, lang) }) : t('calendar.stats.clear')}
          </p>
        </Tile>
      </motion.div>
      <motion.div variants={itemV}>
        <Tile variant="accent" icon={<Headphones className="size-4" />} label={t('calendar.stats.booked')}>
          <span className="flex items-baseline gap-1">
            <AnimatedCounter value={stats.bookedH} decimals={stats.bookedH % 1 ? 1 : 0} className="text-[38px] font-medium leading-none tracking-[-0.04em]" />
            <span className="text-[16px] font-medium opacity-70">h</span>
          </span>
          <p className="mt-2 truncate text-[12.5px] opacity-70">{t('calendar.stats.calls', { count: stats.calls })} · {t('calendar.stats.reviews', { count: stats.reviews })}</p>
        </Tile>
      </motion.div>
      <motion.div variants={itemV}>
        <Tile icon={<Flag className="size-4" />} label={t('calendar.stats.deadlines')} danger={stats.urgent > 0} onClick={onDeadlines}>
          <AnimatedCounter value={stats.deadlines.length} className={cn('text-[38px] font-medium leading-none tracking-[-0.04em]', stats.urgent > 0 && 'text-danger')} />
          <p className="mt-2 truncate text-[12.5px] text-ink-3">
            {nextDeadline ? `${fmt(nextDeadline.start, 'EEE', lang)} · ${nextDeadline.title}` : t('calendar.stats.noDeadlines')}
          </p>
        </Tile>
      </motion.div>
      <motion.div variants={itemV}>
        <Tile icon={<Target className="size-4" />} label={t('calendar.stats.focus')} onClick={onFocus}>
          <span className="flex items-baseline gap-1">
            <AnimatedCounter value={stats.focusH} decimals={stats.focusH % 1 ? 1 : 0} className="text-[38px] font-medium leading-none tracking-[-0.04em]" />
            <span className="text-[16px] font-medium text-ink-3">/ {FOCUS_GOAL_H}h</span>
          </span>
          <ProgressBar value={(stats.focusH / FOCUS_GOAL_H) * 100} height={6} tone="accent" className="mt-3" />
        </Tile>
      </motion.div>
    </motion.div>
  )
}

function Tile({
  variant = 'card',
  icon,
  label,
  children,
  onClick,
  danger,
}: {
  variant?: 'card' | 'night' | 'accent'
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  onClick?: () => void
  danger?: boolean
}) {
  return (
    <Glass
      variant={variant}
      interactive
      spotlight={variant === 'card'}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={cn('h-full min-h-[132px] overflow-hidden p-4 sm:p-5', onClick && 'cursor-pointer', danger && 'ring-1 ring-[color-mix(in_oklab,var(--danger)_45%,transparent)]')}
    >
      <div className="relative z-[1] flex items-center justify-between gap-2">
        <span className={cn('line-clamp-2 text-[13px] font-medium leading-tight', variant === 'night' ? 'text-white/75' : variant === 'accent' ? 'opacity-80' : 'text-ink-2')}>{label}</span>
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full',
            variant === 'night' ? 'bg-white/10 text-white' : variant === 'accent' ? 'bg-[color-mix(in_oklab,var(--accent-ink)_10%,transparent)]' : danger ? 'bg-danger-soft text-danger' : 'bg-[var(--surface-2)] text-ink-2',
          )}
        >
          {icon}
        </span>
      </div>
      <div className="relative z-[1] mt-4">{children}</div>
    </Glass>
  )
}

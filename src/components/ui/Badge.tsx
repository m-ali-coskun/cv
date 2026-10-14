import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { disciplineTheme } from '@/theme/disciplines'
import type { DisciplineFilter, JobStatus, Priority } from '@/store/types'
import type { RiskLevel } from '@/store/selectors'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'night' | 'outline'

const TONES: Record<Tone, string> = {
  neutral: 'bg-[var(--surface-2)] text-ink-2',
  accent: 'bg-accent text-accent-ink',
  success: 'bg-success-soft text-[color-mix(in_oklab,var(--success)_75%,var(--ink))]',
  warning: 'bg-warning-soft text-[color-mix(in_oklab,var(--warning)_60%,var(--ink))]',
  danger: 'bg-danger text-white',
  info: 'bg-info-soft text-[color-mix(in_oklab,var(--info)_70%,var(--ink))]',
  night: 'bg-night text-on-night',
  outline: 'border border-line-2 text-ink-2',
}

export function Pill({
  tone = 'neutral',
  icon,
  children,
  className,
  dot,
  size = 'sm',
}: {
  tone?: Tone
  icon?: ReactNode
  children: ReactNode
  className?: string
  dot?: string | boolean
  size?: 'xs' | 'sm' | 'md'
}) {
  const sz = size === 'xs' ? 'h-5 px-2 text-[11px] gap-1' : size === 'md' ? 'h-8 px-3.5 text-[13px] gap-1.5' : 'h-6.5 px-2.5 text-[12px] gap-1.5'
  return (
    <span className={cn('inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-medium', sz, TONES[tone], className)}>
      {dot && (
        <span
          className="size-1.5 rounded-full"
          style={{ background: typeof dot === 'string' ? dot : 'currentColor' }}
        />
      )}
      {icon}
      {children}
    </span>
  )
}

const STATUS_TONE: Record<JobStatus, Tone> = {
  requested: 'info',
  queued: 'neutral',
  in_progress: 'accent',
  final_touches: 'accent',
  in_review: 'warning',
  revisions: 'warning',
  approved: 'success',
  declined: 'outline',
  cancelled: 'outline',
}

export const STATUS_COLOR: Record<JobStatus, string> = {
  requested: 'var(--info)',
  queued: 'var(--ink-3)',
  in_progress: 'var(--accent)',
  final_touches: 'color-mix(in oklab, var(--accent) 70%, var(--ink))',
  in_review: 'var(--warning)',
  revisions: '#f97316',
  approved: 'var(--success)',
  declined: 'var(--ink-4)',
  cancelled: 'var(--ink-4)',
}

export function StatusBadge({ status, className, size }: { status: JobStatus; className?: string; size?: 'xs' | 'sm' | 'md' }) {
  const t = useT()
  return (
    <Pill tone={STATUS_TONE[status]} className={className} size={size} dot={status === 'in_progress' || status === 'final_touches' ? 'var(--accent-ink)' : true}>
      {t(`core.status.${status}`)}
    </Pill>
  )
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const t = useT()
  const tone: Tone = priority === 'urgent' || priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'neutral'
  return (
    <Pill tone={tone} className={cn('h-7 px-3', className)}>
      {t(`core.priority.${priority}`)}
    </Pill>
  )
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const t = useT()
  const map: Record<RiskLevel, { tone: Tone; key: string }> = {
    high: { tone: 'danger', key: 'core.priority.high' },
    medium: { tone: 'warning', key: 'core.priority.medium' },
    low: { tone: 'neutral', key: 'core.priority.low' },
  }
  return (
    <Pill tone={map[level].tone} className={cn('h-7 px-3', className)}>
      {t(map[level].key)}
    </Pill>
  )
}

/**
 * Creative-app style icon tile ("Ps", "Ai"…) — deep background with the
 * discipline colour as ink. Always uses the discipline's own colours.
 */
export function DisciplineIcon({ id, size = 28, className }: { id: DisciplineFilter; size?: number; className?: string }) {
  const d = disciplineTheme(id)
  return (
    <span
      className={cn('inline-flex shrink-0 select-none items-center justify-center font-semibold tracking-[-0.04em]', className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: id === 'all' ? '#0B0B0C' : d.deep,
        color: d.accent,
        fontSize: size * 0.42,
        boxShadow: `inset 0 0 0 ${Math.max(1, size / 22)}px ${d.accent}, 0 4px 14px -6px ${d.accent}`,
      }}
      aria-hidden
    >
      {d.code}
    </span>
  )
}

export function DisciplineBadge({ id, className, withIcon = true }: { id: DisciplineFilter; className?: string; withIcon?: boolean }) {
  const t = useT()
  const d = disciplineTheme(id)
  return (
    <span
      className={cn('inline-flex h-7 items-center gap-1.5 rounded-full pl-1 pr-2.5 text-[12px] font-medium', className)}
      style={{ background: `color-mix(in oklab, ${d.accent} 16%, transparent)`, color: `color-mix(in oklab, ${d.accent} 55%, var(--ink))` }}
    >
      {withIcon && <DisciplineIcon id={id} size={20} />}
      {t(d.labelKey)}
    </span>
  )
}

/** Small numeric badge like the sidebar counters (128, 47 …). */
export function CountBadge({ children, active, className }: { children: ReactNode; active?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5.5 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums',
        active ? 'bg-white/15 text-white dark:bg-black/15 dark:text-[var(--accent-ink)]' : 'bg-[var(--surface-3)] text-ink-2',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-accent px-1.5 font-mono text-[11px] font-semibold text-accent-ink',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

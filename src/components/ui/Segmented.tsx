import { useId, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
  count?: number
}

/**
 * Capsule segmented control with a sliding pill (shared layout animation),
 * like "Today · 7 days · 30 days" in the reference.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
  pill = 'night',
  layoutId,
}: {
  value: T
  onChange: (v: T) => void
  options: SegmentedOption<T>[]
  size?: 'sm' | 'md'
  className?: string
  /** Colour of the active pill. */
  pill?: 'night' | 'accent' | 'surface'
  layoutId?: string
}) {
  const auto = useId()
  const lid = layoutId ?? `seg-${auto}`
  const h = size === 'sm' ? 'h-8 text-[12.5px] px-3' : 'h-9.5 text-[13.5px] px-4'
  const pillCls =
    pill === 'night'
      ? 'bg-ink dark:bg-[var(--surface-3)]'
      : pill === 'accent'
        ? 'bg-accent shadow-[inset_0_1px_0_rgba(255,255,255,.5)]'
        : 'bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,.08),0_4px_12px_-4px_rgba(0,0,0,.12)]'
  const activeText = pill === 'night' ? 'text-[var(--surface)] dark:text-ink' : pill === 'accent' ? 'text-accent-ink' : 'text-ink'
  return (
    <div role="tablist" className={cn('inline-flex items-center gap-0.5 rounded-full bg-[var(--surface-2)] p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors duration-200',
              h,
              active ? activeText : 'text-ink-2 hover:text-ink',
            )}
          >
            {active && <motion.span layoutId={lid} className={cn('absolute inset-0 rounded-full', pillCls)} transition={spring.pill} />}
            <span className="relative z-[1] inline-flex items-center gap-1.5">
              {o.icon}
              {o.label}
              {o.count !== undefined && (
                <span className={cn('rounded-full px-1.5 text-[10.5px] tabular-nums', active ? 'bg-white/20' : 'bg-[var(--surface-3)]')}>{o.count}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'

/** Thick capsule progress bar (reference: 78% bar on the hero card). */
export function ProgressBar({
  value,
  className,
  tone = 'ink',
  height = 8,
  showLabel,
}: {
  value: number
  className?: string
  tone?: 'ink' | 'accent' | 'success' | 'danger' | 'warning'
  height?: number
  showLabel?: boolean
}) {
  const color = {
    ink: 'var(--ink)',
    accent: 'var(--accent)',
    success: 'var(--success)',
    danger: 'var(--danger)',
    warning: 'var(--warning)',
  }[tone]
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]" style={{ height }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ duration: 1.1, ease: EASE_OUT }}
        >
          <span className="absolute inset-0 animate-[shimmer_2.4s_linear_infinite] bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,.35)_50%,transparent_70%)] bg-[length:200%_100%]" />
        </motion.div>
      </div>
      {showLabel && <span className="w-10 text-right text-[13px] font-medium tabular-nums">{Math.round(value)}%</span>}
    </div>
  )
}

/** Circular progress ring. */
export function ProgressRing({
  value,
  size = 44,
  stroke = 5,
  className,
  color = 'var(--accent)',
  track = 'var(--surface-3)',
  children,
}: {
  value: number
  size?: number
  stroke?: number
  className?: string
  color?: string
  track?: string
  children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(100, value)) / 100) }}
          transition={{ duration: 1.2, ease: EASE_OUT }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}

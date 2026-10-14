import { motion } from 'motion/react'
import { cn } from '@/lib/cn'

/**
 * designTab mark: a folder tab ("Tab") holding a design dot — recoloured
 * live by the active discipline accent.
 */
export function LogoMark({ size = 34, className, animated = true }: { size?: number; className?: string; animated?: boolean }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={cn('shrink-0', className)}
      whileHover={animated ? { rotate: -8, scale: 1.06 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 14 }}
      aria-hidden
    >
      <rect width="40" height="40" rx="12" fill="#0B0B0C" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="11.5" fill="none" stroke="rgba(255,255,255,.14)" />
      <path
        d="M9 14.2c0-1.77 1.43-3.2 3.2-3.2h5.06c.86 0 1.68.35 2.28.96l1.5 1.54h6.76c1.77 0 3.2 1.43 3.2 3.2v9.1c0 1.77-1.43 3.2-3.2 3.2H12.2A3.2 3.2 0 0 1 9 25.8V14.2Z"
        fill="var(--accent)"
      />
      <motion.circle
        cx="24.5"
        cy="21"
        r="3"
        fill="#0B0B0C"
        animate={animated ? { cx: [24.5, 22.5, 24.5], r: [3, 3.4, 3] } : undefined}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <rect x="13" y="19.6" width="6" height="2.8" rx="1.4" fill="#0B0B0C" opacity=".85" />
    </motion.svg>
  )
}

export function Logo({ className, collapsed }: { className?: string; collapsed?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      {!collapsed && (
        <span className="text-[20px] font-semibold tracking-[-0.04em] text-ink">
          design<span className="relative">
            Tab
            <span className="absolute -right-2 top-0.5 size-1.5 rounded-full bg-accent" />
          </span>
        </span>
      )}
    </div>
  )
}

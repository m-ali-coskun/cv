import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { item } from '@/lib/motion'
import { Glass } from '@/components/ui/Glass'
import type { ArtVariant, DisciplineId, MediaRef } from '@/store/types'

/** Dev-only gallery chrome (English on purpose — /kit is a QA page). */
export function Section({
  id,
  kicker,
  title,
  description,
  actions,
  children,
  className,
}: {
  id: string
  kicker: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <motion.section id={`kit-${id}`} variants={item} className={cn('scroll-mt-6', className)}>
      <Glass className="p-5 sm:p-7">
        <header className="relative z-[1] mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent-text">{kicker}</p>
            <h2 className="mt-1 text-[22px] font-medium tracking-[-0.025em] text-ink sm:text-[26px]">{title}</h2>
            {description && <p className="mt-1 max-w-2xl text-[13.5px] text-ink-3">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
        <div className="relative z-[1]">{children}</div>
      </Glass>
    </motion.section>
  )
}

/** Labelled demo cell inside a section. */
export function Demo({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: ReactNode }) {
  return (
    <div className={cn('min-w-0 rounded-[22px] border border-line bg-[var(--surface)]/50 p-4 sm:p-5', className)}>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">{label}</span>
        {hint && <span className="truncate text-[11.5px] text-ink-4">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

/** Small labelled control row. */
export function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] text-ink-3">{label}</span>
      {children}
    </div>
  )
}

export const art = (seed: string, variant: ArtVariant, discipline: DisciplineId = 'visual'): MediaRef => ({ kind: 'art', seed, variant, discipline })

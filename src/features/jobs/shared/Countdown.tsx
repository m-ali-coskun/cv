import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { ProgressRing } from '@/components/ui/Progress'
import { useNow } from './model'

/** Two digits that roll vertically when they change (odometer feel). */
function Roll({ value, className }: { value: number; className?: string }) {
  const s = String(Math.max(0, value)).padStart(2, '0')
  return (
    <span className={cn('relative inline-flex overflow-hidden tabular-nums', className)}>
      {s.split('').map((ch, i) => (
        <span key={i} className="relative inline-block h-[1.1em] w-[0.62em] overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={ch}
              initial={{ y: '-100%', filter: 'blur(3px)', opacity: 0.4 }}
              animate={{ y: '0%', filter: 'blur(0px)', opacity: 1 }}
              exit={{ y: '100%', filter: 'blur(3px)', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="absolute inset-0 flex items-center justify-center leading-none"
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}

/**
 * Live deadline countdown (d · h · m · s) with a ring showing how much of
 * the window between brief and deadline is left. Turns amber < 72h, red when
 * overdue.
 */
export function Countdown({ due, from, className, size = 'md' }: { due: string; from: string; className?: string; size?: 'sm' | 'md' }) {
  const t = useT()
  const now = useNow(1000)
  const end = new Date(due).getTime()
  const start = new Date(from).getTime()
  const left = end - now
  const over = left < 0
  const abs = Math.abs(left)
  const d = Math.floor(abs / 864e5)
  const h = Math.floor((abs % 864e5) / 36e5)
  const m = Math.floor((abs % 36e5) / 6e4)
  const s = Math.floor((abs % 6e4) / 1e3)
  const frac = Math.max(0, Math.min(1, (end - now) / Math.max(1, end - start)))
  const tone = over ? 'var(--danger)' : left < 72 * 36e5 ? 'var(--warning)' : 'var(--accent)'
  const unit = 'ml-0.5 mr-1.5 text-[0.55em] font-sans font-medium text-ink-3'
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <ProgressRing value={frac * 100} size={size === 'sm' ? 34 : 44} stroke={size === 'sm' ? 4 : 5} color={tone}>
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: tone }} />
          <span className="relative inline-flex size-2 rounded-full" style={{ background: tone }} />
        </span>
      </ProgressRing>
      <div className="min-w-0">
        <div className={cn('flex items-baseline font-mono font-medium leading-none', size === 'sm' ? 'text-[15px]' : 'text-[19px]', over && 'text-danger')}>
          {over && <span className="mr-1">−</span>}
          <Roll value={d} />
          <span className={unit}>{t('jobs.cd.d')}</span>
          <Roll value={h} />
          <span className={unit}>{t('jobs.cd.h')}</span>
          <Roll value={m} />
          <span className={unit}>{t('jobs.cd.m')}</span>
          {size === 'md' && (
            <>
              <Roll value={s} className="text-ink-3" />
              <span className={unit}>{t('jobs.cd.s')}</span>
            </>
          )}
        </div>
        <p className="mt-1 text-[11.5px] text-ink-3">{over ? t('jobs.cd.overdue') : t('jobs.cd.left')}</p>
      </div>
    </div>
  )
}

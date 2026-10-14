import { useId, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { useLang } from '@/i18n'
import type { Lang } from '@/store/types'

const LABELS: Record<Lang, string[]> = {
  en: ['', 'Poor', 'Fair', 'Good', 'Great', 'Outstanding'],
  de: ['', 'Schwach', 'Okay', 'Gut', 'Sehr gut', 'Herausragend'],
  tr: ['', 'Zayıf', 'İdare eder', 'İyi', 'Çok iyi', 'Mükemmel'],
}
const RATING: Record<Lang, string> = { en: 'Rating', de: 'Bewertung', tr: 'Puan' }

const STAR = 'M12 2.6l2.83 5.73 6.33.92-4.58 4.46 1.08 6.3L12 17.03l-5.66 2.98 1.08-6.3L2.84 9.25l6.33-.92L12 2.6z'

export interface RatingStarsProps {
  /** 0..max, fractions allowed for display (4.6 → 4 full + 60% star). */
  value: number
  /** Makes it an input (click / hover preview / keyboard). */
  onChange?: (v: number) => void
  max?: number
  size?: number
  tone?: 'gold' | 'accent' | 'ink'
  /** Show the numeric value after the stars. */
  showValue?: boolean
  /** Review count shown as "(128)". */
  count?: number
  /** Show the word for the (hovered) rating — inputs only. */
  showLabel?: boolean
  className?: string
}

const TONE = { gold: '#FFB21E', accent: 'var(--accent)', ink: 'var(--ink)' }

/**
 * Star rating — read-only display with fractional fill, or an input with
 * hover preview, springy pop + sparkle on select and arrow-key support.
 */
export function RatingStars({ value, onChange, max = 5, size = 18, tone = 'gold', showValue, count, showLabel, className }: RatingStarsProps) {
  const lang = useLang()
  const uid = useId().replace(/[:«»]/g, '')
  const [hover, setHover] = useState<number | null>(null)
  const [burst, setBurst] = useState<{ n: number; key: number } | null>(null)
  const interactive = !!onChange
  const shown = hover ?? value
  const color = TONE[tone]

  const set = (n: number) => {
    onChange?.(n)
    setBurst({ n, key: Date.now() })
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      set(Math.min(max, Math.round(value) + 1))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      set(Math.max(1, Math.round(value) - 1))
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= max) set(Number(e.key))
  }

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div
        role={interactive ? 'slider' : 'img'}
        tabIndex={interactive ? 0 : undefined}
        aria-label={`${RATING[lang]}: ${Math.round(value * 10) / 10} / ${max}`}
        aria-valuemin={interactive ? 1 : undefined}
        aria-valuemax={interactive ? max : undefined}
        aria-valuenow={interactive ? value : undefined}
        aria-valuetext={interactive ? LABELS[lang][Math.round(value)] : undefined}
        onKeyDown={onKey}
        onPointerLeave={() => setHover(null)}
        className={cn('inline-flex items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]', interactive && 'gap-0.5')}
      >
        {Array.from({ length: max }, (_, k) => {
          const n = k + 1
          const fill = Math.max(0, Math.min(1, shown - k))
          const pop = burst && n <= burst.n
          return (
            <motion.span
              key={n}
              className={cn('relative inline-block', interactive && 'cursor-pointer')}
              style={{ width: size, height: size }}
              onPointerEnter={() => interactive && setHover(n)}
              onClick={() => interactive && set(n)}
              whileHover={interactive ? { scale: 1.2, rotate: -8 } : undefined}
              whileTap={interactive ? { scale: 0.85 } : undefined}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <motion.span
                key={pop ? burst.key : 0}
                className="absolute inset-0"
                initial={{ scale: 1, rotate: 0 }}
                animate={pop ? { scale: [1, 1.4, 1], rotate: [0, -14, 0] } : undefined}
                transition={{ duration: 0.5, delay: k * 0.05, ease: [0.23, 1, 0.32, 1] }}
              >
              <svg viewBox="0 0 24 24" className="absolute inset-0 size-full" aria-hidden>
                <defs>
                  <clipPath id={`${uid}-c${k}`}>
                    <motion.rect x={0} y={0} height={24} initial={false} animate={{ width: 24 * fill }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                  </clipPath>
                </defs>
                <path d={STAR} strokeLinejoin="round" strokeWidth={1.2} style={{ fill: 'var(--surface-3)', stroke: 'var(--surface-3)' }} />
                <path d={STAR} strokeLinejoin="round" strokeWidth={1.2} clipPath={`url(#${uid}-c${k})`} style={{ fill: color, stroke: color }} />
              </svg>
              </motion.span>
              <AnimatePresence>
                {burst && burst.n === n && (
                  <motion.span key={burst.key} className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7, delay: 0.25 }}>
                    {Array.from({ length: 6 }, (_, j) => {
                      const a = (j / 6) * Math.PI * 2
                      return (
                        <motion.span
                          key={j}
                          className="absolute left-1/2 top-1/2 size-1 rounded-full"
                          style={{ background: color }}
                          initial={{ x: 0, y: 0, scale: 1 }}
                          animate={{ x: Math.cos(a) * size * 0.9, y: Math.sin(a) * size * 0.9, scale: 0 }}
                          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                        />
                      )
                    })}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.span>
          )
        })}
      </div>
      {showValue && <span className="font-mono text-[13px] font-medium tabular-nums text-ink">{(Math.round(shown * 10) / 10).toFixed(1)}</span>}
      {count !== undefined && <span className="text-[12.5px] text-ink-3">({count})</span>}
      {interactive && showLabel && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={Math.round(shown)}
            initial={{ opacity: 0, y: 4, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -4, filter: 'blur(3px)' }}
            transition={{ duration: 0.16 }}
            className="text-[13px] font-medium text-ink-2"
          >
            {LABELS[lang][Math.round(shown)] ?? ''}
          </motion.span>
        </AnimatePresence>
      )}
    </div>
  )
}

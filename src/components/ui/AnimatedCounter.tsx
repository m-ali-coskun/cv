import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { cn } from '@/lib/cn'
import { useLang } from '@/i18n'
import { localeOf } from '@/lib/format'

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

/** One rolling digit column. Height is 1em; the strip slides to the digit. */
function Digit({ value, delay }: { value: number; delay: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-baseline [mask-image:linear-gradient(transparent,#000_18%,#000_82%,transparent)]">
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col items-center"
        initial={false}
        animate={{ y: `${-value}em` }}
        transition={{ type: 'spring', stiffness: 140, damping: 18, mass: 0.9, delay }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block h-[1em] leading-[1em]">
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

export interface AnimatedCounterProps {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  /** Format as currency (uses current UI language for separators). */
  currency?: 'EUR' | 'USD'
  compact?: boolean
  className?: string
  /** Start rolling when scrolled into view (default true). */
  startOnView?: boolean
}

/**
 * Odometer-style counter: each digit is a vertical strip that springs into
 * place, staggered right-to-left, with a short blur on change.
 */
export function AnimatedCounter({ value, decimals = 0, prefix, suffix, currency, compact, className, startOnView = true }: AnimatedCounterProps) {
  const lang = useLang()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20px' })
  const [shown, setShown] = useState(startOnView ? 0 : value)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    if (!startOnView || inView) {
      setShown(value)
      setPulse((p) => p + 1)
    }
  }, [value, inView, startOnView])

  const formatted = new Intl.NumberFormat(localeOf(lang), {
    style: currency ? 'currency' : 'decimal',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: compact ? 'compact' : 'standard',
  }).format(shown)

  const chars = formatted.split('')
  let digitIndex = 0
  const totalDigits = chars.filter((c) => /\d/.test(c)).length

  return (
    <motion.span
      ref={ref}
      key={pulse}
      initial={{ filter: 'blur(3px)' }}
      animate={{ filter: 'blur(0px)' }}
      transition={{ duration: 0.5 }}
      className={cn('inline-flex items-baseline tabular-nums leading-none', className)}
      aria-label={`${prefix ?? ''}${formatted}${suffix ?? ''}`}
    >
      {prefix && <span>{prefix}</span>}
      <span aria-hidden className="inline-flex items-baseline">
        {chars.map((c, i) => {
          if (/\d/.test(c)) {
            const idx = digitIndex++
            return <Digit key={`${chars.length}-${i}`} value={Number(c)} delay={(totalDigits - idx) * 0.045} />
          }
          return (
            <span key={`${chars.length}-${i}`} className="inline-block">
              {c}
            </span>
          )
        })}
      </span>
      {suffix && <span className="ml-[0.08em]">{suffix}</span>}
    </motion.span>
  )
}

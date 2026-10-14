import { useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'

interface SliderCommon {
  min?: number
  max?: number
  step?: number
  /** Value formatter for the bubble, aria-valuetext and the header readout. */
  format?: (v: number) => string
  /** Header label (left) — the formatted value is shown on the right. */
  label?: ReactNode
  /** Tick marks under the track; labelled ones are clickable. */
  marks?: (number | { value: number; label: ReactNode })[]
  /** When to show the value bubble above the thumb. */
  bubble?: 'auto' | 'always' | 'never'
  disabled?: boolean
  /** Colour of the filled track (default accent). */
  color?: string
  ariaLabel?: string
  className?: string
}

export interface SingleSliderProps extends SliderCommon {
  value: number
  onChange: (v: number) => void
}

export interface RangeSliderProps extends SliderCommon {
  value: [number, number]
  onChange: (v: [number, number]) => void
  /** Minimum distance between the two thumbs. */
  minGap?: number
}

export type SliderProps = SingleSliderProps | RangeSliderProps

const isRange = (p: SliderProps): p is RangeSliderProps => Array.isArray(p.value)

/**
 * Accent track + liquid-glass thumb(s) with a springy value bubble.
 * Pass a number for a single slider or a `[from, to]` tuple for a range.
 * Pointer (mouse/touch), keyboard (arrows, PageUp/Down, Home/End) and
 * screen readers are supported.
 */
export function Slider(props: SliderProps) {
  const { min = 0, max = 100, step = 1, format = (v) => String(v), label, marks, bubble = 'auto', disabled, color = 'var(--accent)', ariaLabel, className } = props
  const range = isRange(props)
  const vals: number[] = range ? [...(props.value as [number, number])] : [props.value as number]
  const uid = useId()
  const track = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<number | null>(null)
  const [hot, setHot] = useState<number | null>(null)
  const minGap = range ? ((props as RangeSliderProps).minGap ?? 0) : 0

  const pct = (v: number) => ((Math.min(max, Math.max(min, v)) - min) / (max - min || 1)) * 100
  const snap = (v: number) => {
    const s = Math.round((v - min) / step) * step + min
    const decimals = (String(step).split('.')[1] ?? '').length
    return Number(Math.min(max, Math.max(min, s)).toFixed(decimals))
  }

  const emit = (idx: number, raw: number) => {
    let v = snap(raw)
    if (range) {
      const [a, b] = vals
      if (idx === 0) v = Math.min(v, b - minGap)
      else v = Math.max(v, a + minGap)
      const next: [number, number] = idx === 0 ? [v, b] : [a, v]
      if (next[0] !== a || next[1] !== b) (props as RangeSliderProps).onChange(next)
    } else if (v !== vals[0]) (props as SingleSliderProps).onChange(v)
  }

  const valueAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect()
    return min + Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * (max - min)
  }

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button > 0) return
    const v = valueAt(e.clientX)
    let idx = 0
    if (range) {
      const d0 = Math.abs(v - vals[0])
      const d1 = Math.abs(v - vals[1])
      idx = d0 === d1 ? (v > vals[1] ? 1 : 0) : d0 < d1 ? 0 : 1
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag(idx)
    emit(idx, v)
    ;(e.currentTarget.querySelector(`[data-thumb="${idx}"]`) as HTMLElement | null)?.focus({ preventScroll: true })
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return
    emit(drag, valueAt(e.clientX))
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDrag(null)
  }

  const onKey = (idx: number) => (e: KeyboardEvent<HTMLSpanElement>) => {
    const big = Math.max(step, (max - min) / 10)
    const map: Record<string, number> = {
      ArrowRight: vals[idx] + step,
      ArrowUp: vals[idx] + step,
      ArrowLeft: vals[idx] - step,
      ArrowDown: vals[idx] - step,
      PageUp: vals[idx] + big,
      PageDown: vals[idx] - big,
      Home: min,
      End: max,
    }
    if (map[e.key] === undefined) return
    e.preventDefault()
    emit(idx, map[e.key])
  }

  const lo = range ? pct(vals[0]) : 0
  const hi = pct(range ? vals[1] : vals[0])
  const readout = range ? `${format(vals[0])} – ${format(vals[1])}` : format(vals[0])

  return (
    <div className={cn('w-full select-none', disabled && 'pointer-events-none opacity-50', className)}>
      {label && (
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <span id={`${uid}-l`} className="text-[13px] font-medium text-ink-2">
            {label}
          </span>
          <motion.span key={readout} initial={{ opacity: 0.4, y: -2 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-[12.5px] tabular-nums text-ink">
            {readout}
          </motion.span>
        </div>
      )}
      <div
        ref={track}
        className={cn('relative flex h-8 touch-none items-center', drag !== null ? 'cursor-grabbing' : 'cursor-pointer')}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* rail */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)] shadow-[inset_0_1px_2px_rgba(0,0,0,.08)]">
          <div
            className={cn('absolute inset-y-0 rounded-full', drag === null && 'transition-[left,right] duration-300 ease-[var(--ease-out)]')}
            style={{ left: `${lo}%`, right: `${100 - hi}%`, background: `linear-gradient(90deg, color-mix(in oklab, ${color} 75%, var(--surface)), ${color})` }}
          >
            <span className="absolute inset-0 animate-shimmer bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,.45)_50%,transparent_70%)] bg-[length:200%_100%]" />
          </div>
        </div>

        {/* marks */}
        {marks?.map((m) => {
          const v = typeof m === 'number' ? m : m.value
          const inside = range ? v >= vals[0] && v <= vals[1] : v <= vals[0]
          return (
            <span
              key={v}
              className={cn('pointer-events-none absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full', inside ? 'bg-[var(--accent-ink)]/40' : 'bg-[var(--ink-4)]')}
              style={{ left: `${pct(v)}%` }}
            />
          )
        })}

        {/* thumbs */}
        {vals.map((v, idx) => {
          const show = bubble === 'always' || (bubble === 'auto' && (drag === idx || hot === idx))
          return (
            <span
              key={idx}
              data-thumb={idx}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-valuemin={range && idx === 1 ? vals[0] : min}
              aria-valuemax={range && idx === 0 ? vals[1] : max}
              aria-valuenow={v}
              aria-valuetext={format(v)}
              aria-labelledby={label ? `${uid}-l` : undefined}
              aria-label={label ? undefined : (ariaLabel ?? (range ? (idx ? 'Maximum' : 'Minimum') : 'Value'))}
              aria-orientation="horizontal"
              onKeyDown={onKey(idx)}
              onFocus={() => setHot(idx)}
              onBlur={() => setHot((h) => (h === idx ? null : h))}
              onPointerEnter={() => setHot(idx)}
              onPointerLeave={() => setHot((h) => (h === idx && drag !== idx ? null : h))}
              className={cn('absolute top-1/2 z-[1] outline-none', drag === null && 'transition-[left] duration-300 ease-[var(--ease-out)]')}
              style={{ left: `${pct(v)}%`, zIndex: drag === idx ? 3 : range && idx === 0 && v >= max - (max - min) * 0.02 ? 2 : 1 }}
            >
              <motion.span
                className="absolute left-0 top-0 block size-[26px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white/75 shadow-[0_6px_16px_-4px_rgba(0,0,0,.3),inset_0_1px_0_#fff,inset_0_-2px_4px_rgba(0,0,0,.06)] backdrop-blur-md dark:border-white/25 dark:bg-white/85"
                animate={{ scale: drag === idx ? 1.22 : hot === idx ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 22 }}
              >
                <span className="absolute inset-[8px] rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
              </motion.span>
              <AnimatePresence>
                {show && (
                  <motion.span
                    className="pointer-events-none absolute bottom-[20px] left-0 block"
                    initial={{ opacity: 0, y: 8, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.7, transition: { duration: 0.12 } }}
                    transition={{ type: 'spring', stiffness: 560, damping: 24 }}
                  >
                    <span className="relative block -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 font-mono text-[11.5px] font-medium tabular-nums text-[var(--surface)] shadow-lg">
                      {format(v)}
                      <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-ink" />
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          )
        })}
      </div>
      {marks && marks.some((m) => typeof m !== 'number') && (
        <div className="relative mt-1 h-5">
          {marks.map((m) =>
            typeof m === 'number' ? null : (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  if (!range) return emit(0, m.value)
                  emit(Math.abs(m.value - vals[0]) <= Math.abs(m.value - vals[1]) ? 0 : 1, m.value)
                }}
                className="absolute whitespace-nowrap font-mono text-[10.5px] text-ink-3 transition-colors hover:text-ink"
                style={{ left: `${pct(m.value)}%`, transform: `translateX(${pct(m.value) <= 2 ? '0' : pct(m.value) >= 98 ? '-100%' : '-50%'})` }}
              >
                {m.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

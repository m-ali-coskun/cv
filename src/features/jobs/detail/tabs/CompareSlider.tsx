import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react'
import { ChevronsLeftRight } from 'lucide-react'
import { useApp } from '@/store'
import type { MediaRef } from '@/store/types'
import { MediaView } from '@/components/art/MediaView'

/**
 * Before/after wipe. Drag anywhere (mouse or touch, vertical scrolling still
 * works on phones), or focus the knob and use ← → / Home / End.
 * On mount the divider sweeps in from the right with a spring.
 */
export function CompareSlider({
  before,
  after,
  labelBefore,
  labelAfter,
  aspect = 4 / 3,
  ariaLabel,
}: {
  before: MediaRef
  after: MediaRef
  labelBefore: ReactNode
  labelAfter: ReactNode
  aspect?: number
  ariaLabel: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const motionLevel = useApp((s) => s.settings.motion)
  const pos = useMotionValue(motionLevel === 'off' ? 50 : 94)
  const clip = useTransform(pos, (v) => `inset(0 ${100 - v}% 0 0)`)
  const left = useTransform(pos, (v) => `${v}%`)
  const [val, setVal] = useState(50)
  useMotionValueEvent(pos, 'change', (v) => setVal(Math.round(v)))

  useEffect(() => {
    if (motionLevel === 'off') return
    const c = animate(pos, 50, { type: 'spring', stiffness: 90, damping: 14, delay: 0.25 })
    return () => c.stop()
  }, [pos, motionLevel])

  const setFrom = (clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    pos.set(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)))
  }
  const nudge = (to: number) => animate(pos, Math.max(0, Math.min(100, to)), { type: 'spring', stiffness: 420, damping: 36 })

  return (
    <div
      ref={box}
      className="relative mx-auto w-full cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-[22px] bg-[var(--surface-2)] shadow-[0_30px_60px_-30px_rgba(0,0,0,.45)]"
      style={{ aspectRatio: aspect, maxWidth: `calc(68vh * ${aspect})` }}
      onPointerDown={(e) => {
        dragging.current = true
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        setFrom(e.clientX)
      }}
      onPointerMove={(e) => dragging.current && setFrom(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <div className="absolute inset-0">
        <MediaView media={after} playBadge={false} />
      </div>
      <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
        <MediaView media={before} playBadge={false} />
      </motion.div>

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[11.5px] font-medium text-white backdrop-blur">{labelBefore}</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/85 px-2.5 py-1 font-mono text-[11.5px] font-medium text-[#0b0b0c] backdrop-blur">{labelAfter}</span>

      <motion.div className="pointer-events-none absolute inset-y-0 w-0" style={{ left }}>
        <span className="absolute inset-y-0 -left-px w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,.12),0_0_24px_rgba(0,0,0,.35)]" />
        <motion.button
          type="button"
          role="slider"
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={val}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 10 : 4
            if (e.key === 'ArrowLeft') nudge(pos.get() - step)
            else if (e.key === 'ArrowRight') nudge(pos.get() + step)
            else if (e.key === 'Home') nudge(0)
            else if (e.key === 'End') nudge(100)
            else return
            e.preventDefault()
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          className="pointer-events-auto absolute left-0 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/80 text-[#0b0b0c] shadow-[0_12px_30px_-8px_rgba(0,0,0,.5),inset_0_1px_0_#fff] outline-none backdrop-blur-xl focus-visible:ring-4 focus-visible:ring-[var(--accent)]"
        >
          <ChevronsLeftRight className="size-5" />
        </motion.button>
      </motion.div>
    </div>
  )
}

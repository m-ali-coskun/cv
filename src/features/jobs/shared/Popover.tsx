import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'

export interface PopoverTriggerProps {
  ref: RefObject<HTMLButtonElement | null>
  onClick: () => void
  open: boolean
  'aria-expanded': boolean
  'aria-haspopup': 'menu'
}

/**
 * Origin-aware popover rendered in a portal (never clipped by scrolling
 * columns). Opens below the trigger, or above when there is no room, scales
 * out of the corner it is anchored to and closes on outside click / Esc /
 * page scroll.
 */
export function Popover({
  trigger,
  children,
  width = 240,
  align = 'end',
  className,
  onOpenChange,
}: {
  trigger: (p: PopoverTriggerProps) => ReactNode
  children: (close: () => void) => ReactNode
  width?: number
  align?: 'start' | 'end'
  className?: string
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement | null>(null)
  const panel = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number; origin: string; w: number } | null>(null)

  const setOpenBoth = useCallback(
    (v: boolean) => {
      setOpen(v)
      onOpenChange?.(v)
    },
    [onOpenChange],
  )
  const close = useCallback(() => setOpenBoth(false), [setOpenBoth])

  const place = useCallback(() => {
    const el = btn.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = Math.min(width, vw - 16)
    const h = panel.current?.offsetHeight ?? 260
    const below = vh - r.bottom
    const up = below < h + 16 && r.top > below
    let left = align === 'end' ? r.right - w : r.left
    left = Math.max(8, Math.min(left, vw - w - 8))
    const top = up ? Math.max(8, r.top - h - 8) : r.bottom + 8
    const ox = r.left + r.width / 2 - left
    setPos({ top, left, w, origin: `${Math.max(0, Math.min(w, ox))}px ${up ? '100%' : '0%'}` })
  }, [align, width])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const tgt = e.target as Node
      if (panel.current?.contains(tgt) || btn.current?.contains(tgt)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        btn.current?.focus()
      }
    }
    const onScroll = (e: Event) => {
      if (panel.current && e.target instanceof Node && panel.current.contains(e.target)) return
      close()
    }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    // re-measure once content is laid out (height known)
    const raf = requestAnimationFrame(place)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
      cancelAnimationFrame(raf)
    }
  }, [open, close, place])

  return (
    <>
      {trigger({ ref: btn, onClick: () => setOpenBoth(!open), open, 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panel}
              role="menu"
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.94, filter: 'blur(4px)', transition: { duration: 0.14 } }}
              transition={{ type: 'spring', stiffness: 520, damping: 34 }}
              className={cn('glass glass-strong fixed z-[85] overflow-hidden rounded-[20px] p-1.5', className)}
              style={{
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                width: pos?.w ?? width,
                transformOrigin: pos?.origin ?? 'top right',
              }}
              // React events bubble through portals: keep clicks / drags inside
              // the popover from reaching a draggable or clickable ancestor.
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <div className="relative z-[1]">{children(close)}</div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

export interface PopItem {
  key?: string
  label?: ReactNode
  icon?: ReactNode
  onSelect?: () => void
  danger?: boolean
  active?: boolean
  disabled?: boolean
  hint?: ReactNode
  divider?: boolean
  /** Small section caption above the item. */
  section?: ReactNode
}

/** Menu rows inside a <Popover>. Items stagger in. */
export function PopMenu({ items, close }: { items: PopItem[]; close: () => void }) {
  let n = 0
  return (
    <div className="flex flex-col">
      {items.map((it, i) => {
        if (it.divider) return <div key={`d${i}`} className="mx-2 my-1 h-px bg-[var(--line)]" />
        if (it.section)
          return (
            <div key={`s${i}`} className="px-3 pb-1 pt-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3">
              {it.section}
            </div>
          )
        const idx = n++
        return (
          <motion.button
            key={it.key ?? i}
            type="button"
            role="menuitem"
            disabled={it.disabled}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0, transition: { delay: 0.02 * idx, duration: 0.22, ease: [0.23, 1, 0.32, 1] } }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              it.onSelect?.()
              close()
            }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] transition-colors disabled:pointer-events-none disabled:opacity-40',
              it.danger ? 'text-danger hover:bg-danger-soft' : 'text-ink hover:bg-[var(--surface-2)]',
              it.active && 'bg-[var(--surface-2)] font-medium',
            )}
          >
            {it.icon && <span className={cn('[&_svg]:size-4', it.danger ? 'text-danger' : 'text-ink-3')}>{it.icon}</span>}
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            {it.hint && <span className="shrink-0 text-[11px] text-ink-3">{it.hint}</span>}
          </motion.button>
        )
      })}
    </div>
  )
}

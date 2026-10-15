import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { EASE_IOS } from '@/lib/motion'

export interface AnchorRect {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

export const rectOf = (el: Element): AnchorRect => {
  const r = el.getBoundingClientRect()
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
}

interface Pos {
  left: number
  top: number
  origin: string
}

/**
 * Origin-aware liquid-glass popover anchored to a rect (portal → body).
 * Prefers the right side of the anchor, then the left, then below; it grows
 * out of the edge closest to the anchor. On phones it becomes a bottom sheet.
 */
export function AnchoredPopover({
  anchor,
  onClose,
  width = 340,
  children,
  label,
  id,
}: {
  anchor: AnchorRect | null
  onClose: () => void
  width?: number
  children: ReactNode
  label?: string
  /** Changing the id re-runs the entrance (e.g. switching events). */
  id?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<Pos | null>(null)
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)

  useLayoutEffect(() => {
    if (!anchor) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const isMobile = vw < 640
    setMobile(isMobile)
    if (isMobile) return
    const h = ref.current?.offsetHeight ?? 320
    const gap = 10
    let left: number
    let top = anchor.top - 8
    let origin: string
    if (anchor.right + gap + width <= vw - 8) {
      left = anchor.right + gap
      origin = 'left top'
    } else if (anchor.left - gap - width >= 8) {
      left = anchor.left - gap - width
      origin = 'right top'
    } else {
      left = Math.min(Math.max(8, anchor.left), vw - width - 8)
      top = anchor.bottom + gap
      origin = 'top center'
    }
    if (top + h > vh - 8) {
      top = Math.max(8, vh - h - 8)
      origin = origin.replace('top', 'bottom')
    }
    setPos({ left, top, origin })
    // re-measure once the content is laid out
  }, [anchor, width, id])

  useEffect(() => {
    if (!anchor) return
    const onDown = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return
      // let portalled children (menus/date pickers rendered into body) work
      const el = e.target as HTMLElement
      if (el.closest?.('[data-keep-popover],[role="dialog"],[role="alertdialog"]')) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onResize = () => onClose()
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [anchor, onClose])

  return createPortal(
    <AnimatePresence>
      {anchor &&
        (mobile ? (
          <div key="sheet" className="fixed inset-0 z-[78]">
            <motion.div
              className="absolute inset-0 bg-black/30 backdrop-blur-[4px] dark:bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              ref={ref}
              role="dialog"
              aria-label={label}
              className="glass glass-strong absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[30px] pb-[max(16px,env(safe-area-inset-bottom))]"
              initial={{ y: '100%' }}
              animate={{ y: 0, transition: { type: 'spring', stiffness: 320, damping: 34 } }}
              exit={{ y: '100%', transition: { duration: 0.22, ease: EASE_IOS } }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 100 && onClose()}
            >
              <div className="mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-[var(--line-2)]" />
              <div className="relative z-[1]">{children}</div>
            </motion.div>
          </div>
        ) : (
          <motion.div
            key={id ?? 'pop'}
            ref={ref}
            role="dialog"
            aria-label={label}
            className="glass glass-strong fixed z-[78] overflow-hidden rounded-[24px] !bg-[color-mix(in_oklab,var(--surface)_90%,transparent)] shadow-[0_30px_80px_-24px_rgba(0,0,0,.45)]"
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? 0, width, transformOrigin: pos?.origin ?? 'left top', visibility: pos ? 'visible' : 'hidden' }}
            initial={{ opacity: 0, scale: 0.86, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 460, damping: 30 } }}
            exit={{ opacity: 0, scale: 0.94, filter: 'blur(4px)', transition: { duration: 0.14, ease: EASE_IOS } }}
          >
            <div className="relative z-[1] max-h-[min(560px,80vh)] overflow-y-auto">{children}</div>
          </motion.div>
        ))}
    </AnimatePresence>,
    document.body,
  )
}

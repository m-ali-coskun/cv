import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { FILTER_TWEEN } from '@/lib/motion'

export interface MenuItem {
  label: ReactNode
  icon?: ReactNode
  onClick?: () => void
  danger?: boolean
  active?: boolean
  divider?: boolean
  disabled?: boolean
  hint?: ReactNode
}

/**
 * Lightweight popover menu. `trigger` receives an onClick toggler.
 * Closes on outside click / Esc / item click.
 */
export function Menu({
  trigger,
  items,
  align = 'end',
  className,
  width = 220,
  children,
}: {
  trigger: (props: { onClick: () => void; open: boolean }) => ReactNode
  items?: MenuItem[]
  align?: 'start' | 'end'
  className?: string
  width?: number
  /** Custom content instead of items. Receives close(). */
  children?: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])
  const close = () => setOpen(false)
  return (
    <div ref={ref} className="relative inline-flex">
      {trigger({ onClick: () => setOpen((o) => !o), open })}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.92, y: -6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 32, filter: FILTER_TWEEN }}
            className={cn(
              'glass glass-strong absolute top-[calc(100%+8px)] z-[70] overflow-hidden rounded-[20px] p-1.5',
              align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
              className,
            )}
            style={{ width }}
          >
            <div className="relative z-[1]">
              {children
                ? children(close)
                : items?.map((it, i) =>
                    it.divider ? (
                      <div key={i} className="my-1 h-px bg-[var(--line)]" />
                    ) : (
                      <button
                        key={i}
                        type="button"
                        role="menuitem"
                        disabled={it.disabled}
                        onClick={() => {
                          it.onClick?.()
                          close()
                        }}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] transition-colors disabled:opacity-40',
                          it.danger ? 'text-danger hover:bg-danger-soft' : 'text-ink hover:bg-[var(--surface-2)]',
                          it.active && 'bg-[var(--surface-2)] font-medium',
                        )}
                      >
                        {it.icon && <span className="text-ink-3 [&_svg]:size-4">{it.icon}</span>}
                        <span className="flex-1 truncate">{it.label}</span>
                        {it.hint && <span className="text-[11px] text-ink-3">{it.hint}</span>}
                      </button>
                    ),
                  )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

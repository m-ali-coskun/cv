import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_IOS } from '@/lib/motion'
import { IconButton } from './Button'

function useLockScroll(open: boolean) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
  /** Hide the default header (render your own). */
  bare?: boolean
  dismissable?: boolean
}

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl', full: 'max-w-[min(1400px,96vw)]' }

/** Centered liquid-glass dialog. On phones it becomes a bottom sheet. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', className, bare, dismissable = true }: ModalProps) {
  const id = useId()
  useLockScroll(open)
  useEscape(open && dismissable, onClose)
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-labelledby={id}>
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-[6px] dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissable ? onClose : undefined}
          />
          <motion.div
            className={cn(
              'glass glass-strong relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[30px] sm:rounded-[30px]',
              SIZES[size],
              className,
            )}
            initial={{ opacity: 0, y: 60, scale: 0.94, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 330, damping: 30 } }}
            exit={{ opacity: 0, y: 40, scale: 0.97, filter: 'blur(6px)', transition: { duration: 0.2, ease: EASE_IOS } }}
          >
            {!bare && (title || dismissable) && (
              <div className="relative z-[1] flex items-start justify-between gap-4 px-6 pb-2 pt-5">
                <div className="min-w-0">
                  {title && (
                    <h2 id={id} className="text-[20px] font-medium tracking-[-0.02em]">
                      {title}
                    </h2>
                  )}
                  {description && <p className="mt-1 text-[13.5px] text-ink-3">{description}</p>}
                </div>
                {dismissable && (
                  <IconButton label="Close" variant="soft" size="sm" onClick={onClose}>
                    <X className="size-4" />
                  </IconButton>
                )}
              </div>
            )}
            <div className={cn('relative z-[1] min-h-0 flex-1 overflow-y-auto', !bare && 'px-6 pb-6 pt-2')}>{children}</div>
            {footer && (
              <div className="relative z-[1] flex flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-4 safe-bottom">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  side?: 'right' | 'left' | 'bottom'
  width?: number
  className?: string
  header?: ReactNode
}

/** Side sheet (bottom sheet on phones when side="bottom"). */
export function Drawer({ open, onClose, title, children, side = 'right', width = 480, className, header }: DrawerProps) {
  useLockScroll(open)
  useEscape(open, onClose)
  const from = side === 'right' ? { x: '105%' } : side === 'left' ? { x: '-105%' } : { y: '105%' }
  const pos =
    side === 'right'
      ? 'right-2 top-2 bottom-2 sm:right-3 sm:top-3 sm:bottom-3 rounded-[28px]'
      : side === 'left'
        ? 'left-2 top-2 bottom-2 rounded-[28px]'
        : 'left-0 right-0 bottom-0 max-h-[90dvh] rounded-t-[30px]'
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[75]">
          <motion.div
            className="absolute inset-0 bg-black/25 backdrop-blur-[4px] dark:bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className={cn('glass glass-strong absolute flex flex-col overflow-hidden', pos, className)}
            style={side === 'bottom' ? undefined : { width: `min(${width}px, calc(100vw - 16px))` }}
            initial={from}
            animate={{ x: 0, y: 0, transition: { type: 'spring', stiffness: 300, damping: 34 } }}
            exit={{ ...from, transition: { duration: 0.25, ease: EASE_IOS } }}
            drag={side === 'bottom' ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose()
            }}
          >
            {side === 'bottom' && <div className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-[var(--line-2)]" />}
            {header ??
              (title && (
                <div className="relative z-[1] flex items-center justify-between gap-3 px-5 pb-3 pt-5">
                  <h2 className="text-[19px] font-medium tracking-[-0.02em]">{title}</h2>
                  <IconButton label="Close" variant="soft" size="sm" onClick={onClose}>
                    <X className="size-4" />
                  </IconButton>
                </div>
              ))}
            <div className="relative z-[1] min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

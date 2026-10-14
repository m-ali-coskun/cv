import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'

export function Tooltip({ content, children, side = 'top', className }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'right'; className?: string }) {
  const [show, setShow] = useState(false)
  const pos = side === 'top' ? 'bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2' : side === 'bottom' ? 'top-[calc(100%+8px)] left-1/2 -translate-x-1/2' : 'left-[calc(100%+10px)] top-1/2 -translate-y-1/2'
  return (
    <span className={cn('relative inline-flex', className)} onPointerEnter={() => setShow(true)} onPointerLeave={() => setShow(false)} onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.14 }}
            className={cn('pointer-events-none absolute z-[90] whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-medium text-[var(--surface)] shadow-lg', pos)}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

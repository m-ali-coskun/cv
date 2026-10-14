import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}
    >
      {icon && (
        <motion.div
          className="mb-4 flex size-16 items-center justify-center rounded-[22px] bg-accent-soft text-accent-text [&_svg]:size-7"
          animate={{ y: [0, -6, 0], rotate: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {icon}
        </motion.div>
      )}
      <h4 className="text-[16px] font-medium tracking-[-0.01em]">{title}</h4>
      {description && <p className="mt-1.5 max-w-sm text-[13.5px] text-ink-3">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}

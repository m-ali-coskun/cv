import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, CheckCircle2, Heart, Info, MessageCircle, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useToasts, type Toast } from '@/store/toasts'
import { Avatar } from '../ui/Avatar'

const ICON = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
  match: Heart,
  message: MessageCircle,
}

/** Stacked liquid-glass toasts (top-center on phones, bottom-right on desktop). */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)
  const navigate = useNavigate()
  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-auto sm:items-end">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard
            key={t.id}
            toast={t}
            onClose={() => dismiss(t.id)}
            onOpen={
              t.link
                ? () => {
                    navigate(t.link!)
                    dismiss(t.id)
                  }
                : undefined
            }
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastCard({ toast, onClose, onOpen }: { toast: Toast; onClose: () => void; onOpen?: () => void }) {
  const Icon = ICON[toast.tone]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.85, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => Math.abs(info.offset.x) > 90 && onClose()}
      className={cn(
        'glass glass-strong pointer-events-auto flex w-full max-w-[380px] items-start gap-3 rounded-[22px] p-3 pr-2',
        toast.tone === 'match' && 'ring-2 ring-[var(--accent)]',
      )}
    >
      <button type="button" onClick={onOpen} className={cn('relative z-[1] flex min-w-0 flex-1 items-start gap-3 text-left', !onOpen && 'cursor-default')}>
        {toast.avatarSeed ? (
          <Avatar seed={toast.avatarSeed} size={38} />
        ) : (
          <span
            className={cn(
              'flex size-9.5 shrink-0 items-center justify-center rounded-full',
              toast.tone === 'error' ? 'bg-danger text-white' : toast.tone === 'success' ? 'bg-success text-white' : 'bg-accent text-accent-ink',
            )}
          >
            <Icon className="size-[18px]" />
          </span>
        )}
        <span className="min-w-0 flex-1 pt-0.5">
          <span className="block truncate text-[14px] font-medium">{toast.title}</span>
          {toast.description && <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-ink-3">{toast.description}</span>}
        </span>
      </button>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick()
            onClose()
          }}
          className="relative z-[1] mt-1 shrink-0 rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-[var(--surface)]"
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" onClick={onClose} className="relative z-[1] mt-0.5 shrink-0 rounded-full p-1 text-ink-3 hover:bg-[var(--surface-2)] hover:text-ink" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </motion.div>
  )
}

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLang, useT } from '@/i18n'
import type { Lang } from '@/store/types'
import { Modal } from './Overlay'
import { Button } from './Button'

const STR: Record<Lang, { typeToConfirm: string }> = {
  en: { typeToConfirm: 'Type {word} to confirm' },
  de: { typeToConfirm: 'Zum Bestätigen {word} eingeben' },
  tr: { typeToConfirm: 'Onaylamak için {word} yazın' },
}

export interface ConfirmOptions {
  title: ReactNode
  description?: ReactNode
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  /** 'danger' = red icon + red confirm button. */
  tone?: 'default' | 'danger'
  icon?: ReactNode
  /** Require typing this word before the confirm button unlocks. */
  requireText?: string
  /** Extra content between the description and the buttons. */
  children?: ReactNode
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean
  onClose: () => void
  /** May return a promise — the button shows a spinner until it settles. */
  onConfirm: () => void | Promise<unknown>
}

/**
 * Small confirmation dialog built on <Modal> (bottom sheet on phones).
 * The icon wobbles in, the danger variant uses the red capsule button, and
 * the confirm action can be gated behind typing a word.
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, cancelLabel, tone = 'default', icon, requireText, children }: ConfirmDialogProps) {
  const t = useT()
  const lang = useLang()
  const [busy, setBusy] = useState(false)
  const [typed, setTyped] = useState('')
  const locked = !!requireText && typed.trim().toLowerCase() !== requireText.toLowerCase()
  const danger = tone === 'danger'

  const close = () => {
    if (busy) return
    setTyped('')
    onClose()
  }
  const confirm = async () => {
    if (locked) return
    try {
      setBusy(true)
      await onConfirm()
    } finally {
      setBusy(false)
      setTyped('')
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={close} size="sm" bare>
      <div className="relative z-[1] px-6 pb-6 pt-7 text-center sm:text-left">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <motion.span
            initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: [0, -10, 8, -4, 0], opacity: 1 }}
            transition={{ scale: { type: 'spring', stiffness: 420, damping: 14 }, rotate: { duration: 0.7, delay: 0.15 }, opacity: { duration: 0.2 } }}
            className={cn(
              'flex size-13 shrink-0 items-center justify-center rounded-[18px] [&_svg]:size-6',
              danger ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent-text',
            )}
          >
            {icon ?? (danger ? <AlertTriangle /> : <HelpCircle />)}
          </motion.span>
          <div className="min-w-0">
            <h2 className="text-[19px] font-medium tracking-[-0.02em] text-ink">{title}</h2>
            {description && <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{description}</p>}
          </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
        {requireText && (
          <label className="mt-5 block text-left">
            <span className="mb-1.5 block text-[12.5px] text-ink-3">{STR[lang].typeToConfirm.replace('{word}', `“${requireText}”`)}</span>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirm()}
              className={cn(
                'h-11 w-full rounded-2xl border bg-[var(--surface)]/70 px-4 font-mono text-[14px] text-ink outline-none transition-[border-color,box-shadow]',
                locked ? 'border-line focus:border-[var(--accent-line)]' : 'border-[var(--success)] shadow-[0_0_0_4px_var(--success-soft)]',
              )}
            />
          </label>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={close} disabled={busy} className="sm:min-w-24">
            {cancelLabel ?? t('core.action.cancel')}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={confirm} loading={busy} disabled={locked} autoFocus={!requireText} className="sm:min-w-28">
            {confirmLabel ?? t('core.action.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Imperative confirm:
 *   const [confirm, confirmDialog] = useConfirm()
 *   …{confirmDialog}
 *   if (await confirm({ title: 'Delete file?', tone: 'danger' })) remove()
 */
export function useConfirm(): [(opts: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)
  const result = useRef(false)

  const confirm = useCallback((opts: ConfirmOptions) => {
    result.current = false
    setState({ ...opts, open: true })
    return new Promise<boolean>((res) => {
      resolver.current = res
    })
  }, [])

  const dialog = state ? (
    <ConfirmDialog
      {...state}
      open={state.open}
      onConfirm={() => {
        result.current = true
      }}
      onClose={() => {
        resolver.current?.(result.current)
        resolver.current = null
        setState((s) => (s ? { ...s, open: false } : s))
      }}
    />
  ) : null

  return [confirm, dialog]
}

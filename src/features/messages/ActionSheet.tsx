import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, Bookmark, BookmarkCheck, Copy, CornerUpLeft, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { useLang, useT } from '@/i18n'
import type { Message } from '@/store/types'
import { Modal } from '@/components/ui/Overlay'
import { REACTIONS, clock, previewOf } from './model'
import { useThreadCtx } from './context'
import { useMessagesPrefs } from './store'

/**
 * iMessage-style focus sheet for a message (long-press on touch, right-click
 * on desktop): tapback bar, message preview and actions.
 */
export function ActionSheet({ message, onClose }: { message: Message | null; onClose: () => void }) {
  const t = useT()
  const lang = useLang()
  const ctx = useThreadCtx()
  const recent = useMessagesPrefs((s) => s.recentEmoji)
  const m = message
  const own = !!m && m.senderId === ctx.meId
  const canEdit = own && !!m && (m.kind === 'text' || m.kind === 'attachment')
  const saved = !!m && ctx.saved.has(m.id)
  const extra = recent.filter((e) => !(REACTIONS as readonly string[]).includes(e)).slice(0, 6)

  const run = (fn: () => void) => () => {
    fn()
    onClose()
  }

  return (
    <Modal open={!!m} onClose={onClose} size="sm" bare>
      {m && (
        <div className="p-4 sm:p-5">
          <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[var(--line-2)] sm:hidden" />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={spring.bouncy}
            className="glass glass-pill mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-0.5 p-1.5"
          >
            {[...REACTIONS, ...extra].map((e, i) => {
              const mine = m.reactions.find((r) => r.emoji === e)?.by.includes(ctx.meId)
              return (
                <motion.button
                  key={e}
                  type="button"
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0, transition: { ...spring.bouncy, delay: 0.05 + i * 0.03 } }}
                  whileHover={{ scale: 1.25, y: -3 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={run(() => ctx.react(m, e))}
                  className={cn('relative z-[1] flex size-10 items-center justify-center rounded-full text-[22px]', mine && 'bg-accent-soft')}
                  aria-label={t('messages.action.react', { emoji: e })}
                >
                  {e}
                </motion.button>
              )
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ delay: 0.05, ...spring.smooth }}
            className={cn('mt-4 flex', own ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-[22px] px-4 py-2.5 text-[14.5px] leading-relaxed',
                own ? 'bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'bg-[var(--surface-2)] text-ink',
              )}
            >
              <p className="line-clamp-5 whitespace-pre-wrap break-words">{m.kind === 'text' ? m.text : previewOf(m, t)}</p>
              <p className="mt-1 text-right font-mono text-[10.5px] opacity-60">{clock(m.createdAt, lang)}</p>
            </div>
          </motion.div>

          <div className="mt-4 overflow-hidden rounded-[22px] bg-[var(--surface-2)]">
            <SheetRow icon={<CornerUpLeft />} label={t('messages.action.reply')} onClick={run(() => ctx.reply(m))} />
            {!!m.text && <SheetRow icon={<Copy />} label={t('messages.action.copy')} onClick={run(() => ctx.copy(m))} />}
            <SheetRow icon={saved ? <BookmarkCheck /> : <Bookmark />} label={saved ? t('messages.action.unsave') : t('messages.action.save')} onClick={run(() => ctx.toggleSave(m))} />
            {m.jobId && <SheetRow icon={<ArrowUpRight />} label={t('messages.action.openJob', { id: m.jobId })} onClick={run(() => ctx.openJob(m.jobId!))} />}
            {canEdit && <SheetRow icon={<Pencil />} label={t('messages.action.edit')} onClick={run(() => ctx.edit(m))} />}
            {own && <SheetRow icon={<Trash2 />} label={t('messages.action.delete')} danger onClick={run(() => ctx.remove(m))} />}
          </div>
        </div>
      )}
    </Modal>
  )
}

function SheetRow({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3.5 text-left text-[15px] last:border-b-0 active:bg-[var(--surface-3)] sm:hover:bg-[var(--surface-3)]',
        danger ? 'text-danger' : 'text-ink',
      )}
    >
      <span>{label}</span>
      <span className={cn('[&_svg]:size-4.5', danger ? 'text-danger' : 'text-ink-3')}>{icon}</span>
    </button>
  )
}

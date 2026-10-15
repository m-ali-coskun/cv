import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Lock, PenLine, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { Match } from '@/store/types'
import { FILTER_TWEEN } from '@/lib/motion'

const MAX = 280

/** Private, inline-editable note on a match (only Ali sees it). */
export function NoteEditor({ match, compact, className }: { match: Match; compact?: boolean; className?: string }) {
  const t = useT()
  const setMatchNote = useApp((s) => s.setMatchNote)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(match.note ?? '')
  const ref = useRef<HTMLTextAreaElement>(null)
  const note = match.note?.trim()

  useEffect(() => {
    if (!editing) setDraft(match.note ?? '')
  }, [match.note, editing])

  const save = () => {
    const v = draft.trim().slice(0, MAX)
    setMatchNote(match.id, v)
    setEditing(false)
    if (v !== (match.note ?? '').trim()) toast({ title: v ? t('network.note.saved') : t('network.note.removed'), tone: 'success', duration: 2200 })
  }
  const cancel = () => {
    setDraft(match.note ?? '')
    setEditing(false)
  }

  return (
    <div className={cn('relative', className)} onClick={(e) => e.stopPropagation()}>
      <AnimatePresence mode="popLayout" initial={false}>
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, scale: 0.97, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 34, filter: FILTER_TWEEN }}
            className="rounded-[18px] border border-[var(--accent-line)] bg-[var(--surface)] p-2 shadow-[0_0_0_4px_var(--accent-softer)]"
          >
            <textarea
              ref={ref}
              autoFocus
              onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
              value={draft}
              maxLength={MAX}
              rows={compact ? 2 : 3}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  save()
                }
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  cancel()
                }
              }}
              placeholder={t('network.note.placeholder')}
              aria-label={t('network.note.label')}
              className="w-full resize-none bg-transparent px-2 py-1.5 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
            />
            <div className="flex items-center gap-1.5 px-1">
              <span className="font-mono text-[10.5px] text-ink-3">
                {draft.length}/{MAX}
              </span>
              {note && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft('')
                    setMatchNote(match.id, '')
                    setEditing(false)
                    toast({ title: t('network.note.removed'), tone: 'info', duration: 2200 })
                  }}
                  className="ml-1 flex size-7 items-center justify-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger"
                  aria-label={t('network.note.delete')}
                  title={t('network.note.delete')}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
              <button type="button" onClick={cancel} className="ml-auto rounded-full px-2.5 py-1 text-[12px] font-medium text-ink-3 hover:text-ink">
                {t('core.action.cancel')}
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={save}
                className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-[var(--surface)] dark:bg-accent dark:text-accent-ink"
              >
                <Check className="size-3.5" />
                {t('core.action.save')}
              </motion.button>
            </div>
          </motion.div>
        ) : note ? (
          <motion.button
            key="view"
            type="button"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
            onClick={() => setEditing(true)}
            className="group/note relative w-full rounded-[18px] bg-[color-mix(in_oklab,#ffd23f_18%,var(--surface-2))] px-3.5 py-2.5 text-left transition-colors hover:bg-[color-mix(in_oklab,#ffd23f_26%,var(--surface-2))]"
            title={t('network.note.edit')}
          >
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[color-mix(in_oklab,#b88a00_80%,var(--ink))]">
              <Lock className="size-3" />
              {t('network.note.private')}
              <PenLine className="ml-auto size-3.5 opacity-0 transition-opacity group-hover/note:opacity-100" />
            </span>
            <span className={cn('mt-1 block text-[13px] leading-relaxed text-ink', compact && 'line-clamp-2')}>{note}</span>
          </motion.button>
        ) : (
          <motion.button
            key="add"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            onClick={() => setEditing(true)}
            className="flex w-full items-center gap-2 rounded-[18px] border border-dashed border-line-2 px-3.5 py-2.5 text-[12.5px] text-ink-3 transition-colors hover:border-[var(--ink-4)] hover:text-ink"
          >
            <Plus className="size-3.5" />
            {t('network.note.add')}
            <Lock className="ml-auto size-3 opacity-60" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

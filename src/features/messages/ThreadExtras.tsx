import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bookmark, FileText, UserRound, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { shortDate } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import type { Message, Role } from '@/store/types'
import { Button } from '@/components/ui/Button'
import { clock, previewOf, type Person } from './model'
import { PersonAvatar } from './ui'

/**
 * "This is the beginning of your conversation with …" — sits above the first
 * message and focus-pulls in when it scrolls into view.
 */
export function ThreadIntro({
  person,
  since,
  jobsCount,
  role,
  onProfile,
  onBrief,
}: {
  person?: Person
  since?: string
  jobsCount: number
  role: Role
  onProfile: () => void
  onBrief: () => void
}) {
  const t = useT()
  const lang = useLang()
  const name = person?.name ?? ''
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
      className="mx-auto flex max-w-md flex-col items-center px-4 pb-4 pt-2 text-center"
    >
      <div className="relative">
        <motion.span
          aria-hidden
          className="absolute -inset-2 rounded-full bg-[conic-gradient(from_0deg,var(--accent),transparent_40%,var(--accent)_70%,transparent)] opacity-60 blur-[6px]"
          animate={{ rotate: 360 }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
        />
        <PersonAvatar person={person} size={68} className="relative ring-4 ring-[var(--surface)]" />
      </div>
      <p className="mt-3 text-[15px] font-medium leading-snug tracking-[-0.01em]">{t('messages.intro.title', { name })}</p>
      {since && <p className="mt-1 font-mono text-[11px] text-ink-3">{t('messages.intro.since', { date: shortDate(since, lang), count: jobsCount })}</p>}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button size="xs" variant="soft" icon={<UserRound className="size-3.5" />} onClick={onProfile}>
          {t('messages.intro.profile')}
        </Button>
        {role === 'client' && (
          <Button size="xs" icon={<FileText className="size-3.5" />} onClick={onBrief}>
            {t('messages.intro.brief')}
          </Button>
        )}
      </div>
      <div className="mt-5 h-px w-24 bg-[linear-gradient(90deg,transparent,var(--line-2),transparent)]" />
    </motion.div>
  )
}

/**
 * Telegram-style pinned bar for messages saved in this thread: tap to jump to
 * the current one and advance to the next; segments show the position.
 */
export function SavedBar({
  messages,
  onJump,
  onRemove,
}: {
  /** Saved messages of this thread, newest first. */
  messages: Message[]
  onJump: (id: string) => void
  onRemove: (m: Message) => void
}) {
  const t = useT()
  const lang = useLang()
  const [index, setIndex] = useState(0)
  const n = messages.length
  useEffect(() => {
    if (index >= n) setIndex(0)
  }, [n, index])
  const current = messages[Math.min(index, n - 1)]
  const segments = useMemo(() => Array.from({ length: Math.min(n, 4) }), [n])
  const activeSeg = n <= 4 ? index : Math.min(3, Math.floor((index / n) * 4))

  return (
    <AnimatePresence initial={false}>
      {current && (
        <motion.div
          key="saved-bar"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="relative z-[5] overflow-hidden border-b border-[var(--line)]"
        >
          <div className="flex items-center gap-2.5 px-3 py-2 sm:px-4">
            <span className="flex h-8 w-[3px] shrink-0 flex-col gap-[2px]" aria-hidden>
              {segments.map((_, i) => (
                <span key={i} className={cn('w-full flex-1 rounded-full transition-colors duration-300', i === activeSeg ? 'bg-accent' : 'bg-[var(--line-2)]')} />
              ))}
            </span>
            <button
              type="button"
              onClick={() => {
                onJump(current.id)
                setIndex((i) => (i + 1) % n)
              }}
              className="group flex min-w-0 flex-1 items-center gap-2 text-left"
              title={t('messages.savedBar.next')}
            >
              <Bookmark className="size-3.5 shrink-0 fill-accent text-accent-text" />
              <span className="min-w-0 flex-1 overflow-hidden">
                <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-accent-text">
                  {t('messages.savedBar.label')}
                  {n > 1 && (
                    <span className="font-mono text-[10.5px] text-ink-3">
                      {Math.min(index, n - 1) + 1}/{n}
                    </span>
                  )}
                </span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={current.id}
                    initial={{ y: 14, opacity: 0, filter: 'blur(3px)' }}
                    animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                    exit={{ y: -14, opacity: 0, filter: 'blur(3px)' }}
                    transition={spring.snappy}
                    className="block truncate text-[12.5px] text-ink-2 group-hover:text-ink"
                  >
                    {previewOf(current, t)}
                    <span className="ml-1.5 font-mono text-[10.5px] text-ink-3">
                      {shortDate(current.createdAt, lang)} {clock(current.createdAt, lang)}
                    </span>
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => onRemove(current)}
              aria-label={t('messages.savedBar.remove')}
              title={t('messages.savedBar.remove')}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-[var(--surface-2)] hover:text-ink"
            >
              <X className="size-3.5" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

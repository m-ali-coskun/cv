import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, PenLine, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { daysUntil, dueLabel, timeAgo } from '@/lib/dates'
import { useLang, useT, type TFn } from '@/i18n'
import { useApp } from '@/store'
import type { ConversationView } from '@/store/selectors'
import type { Job, Lang, Role } from '@/store/types'
import { CLOSED, quickReplies } from './model'

export type RecapTone = 'danger' | 'warning' | 'accent' | 'info'

export interface RecapItem {
  key: string
  tone: RecapTone
  text: string
  /** Optional deep link for the item (e.g. job deliveries tab). */
  href?: string
  /** English reply suggestion (message content stays English). */
  reply?: string
}

const TONE_DOT: Record<RecapTone, string> = {
  danger: 'bg-danger shadow-[0_0_0_3px_color-mix(in_oklab,var(--danger)_25%,transparent)]',
  warning: 'bg-warning shadow-[0_0_0_3px_color-mix(in_oklab,var(--warning)_25%,transparent)]',
  accent: 'bg-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_25%,transparent)]',
  info: 'bg-info shadow-[0_0_0_3px_color-mix(in_oklab,var(--info)_25%,transparent)]',
}
const RANK: Record<RecapTone, number> = { danger: 0, warning: 1, accent: 2, info: 3 }

const firstName = (name: string | undefined) => (name ?? '').split(' ')[0]

/**
 * Deterministic "AI" recap of a thread: what is waiting on the viewer, built
 * from the conversation + linked jobs. Chrome strings are translated; reply
 * suggestions are message content and therefore English.
 */
export function buildRecap(view: ConversationView, jobs: Job[], role: Role, meId: string, t: TFn, lang: Lang): RecapItem[] {
  const out: RecapItem[] = []
  const p = view.counterpart
  const name = p ? ('contactName' in p ? p.contactName : p.name) : ''
  const first = firstName(name)

  for (const j of jobs) {
    if (CLOSED.includes(j.status)) continue
    const days = daysUntil(j.dueAt)
    const pending = [...j.versions].reverse().find((v) => v.status === 'pending')
    const openRev = [...j.revisions].reverse().find((r) => r.status !== 'resolved')
    const revDone = openRev ? openRev.items.filter((i) => i.done).length : 0

    if (role === 'client') {
      if (j.status === 'in_review' && pending) {
        out.push({
          key: `${j.id}-review`,
          tone: 'danger',
          text: t('messages.recap.review', { id: j.id, v: pending.version }),
          href: `/jobs/${j.id}?tab=deliveries`,
          reply: `Thanks for v${pending.version}! I’m reviewing it today and will come back with feedback shortly.`,
        })
      }
      if (j.counterOffer?.status === 'pending') {
        out.push({
          key: `${j.id}-counter`,
          tone: 'warning',
          text: t('messages.recap.counter', { id: j.id, name: first }),
          href: `/jobs/${j.id}`,
          reply: `Thanks for the heads-up on ${j.id} — let me check the new date with the team.`,
        })
      }
      if (j.status === 'requested' && !j.counterOffer) {
        out.push({
          key: `${j.id}-req`,
          tone: 'info',
          text: t('messages.recap.awaitingAccept', { id: j.id, name: first }),
          href: `/jobs/${j.id}`,
          reply: `Hi ${first}! Just checking you got the brief for ${j.id} — happy to answer any questions.`,
        })
      }
      if (j.status === 'revisions' && openRev) {
        out.push({
          key: `${j.id}-rev`,
          tone: 'info',
          text: t('messages.recap.revisionClient', { id: j.id, done: revDone, total: openRev.items.length }),
          href: `/jobs/${j.id}?tab=revisions`,
        })
      }
    } else {
      if (j.status === 'requested') {
        out.push({
          key: `${j.id}-req`,
          tone: 'danger',
          text: t('messages.recap.newRequest', { id: j.id }),
          href: `/jobs/${j.id}`,
          reply: `Thanks for the brief! I’ve had a look at ${j.id} and I’m happy to take this on.`,
        })
      }
      if (j.status === 'revisions' && openRev) {
        out.push({
          key: `${j.id}-rev`,
          tone: 'warning',
          text: t('messages.recap.revisionDesigner', { id: j.id, done: revDone, total: openRev.items.length }),
          href: `/jobs/${j.id}?tab=revisions`,
          reply: `Thanks for the notes — I’m working through the revisions on ${j.id} and will send the next version soon.`,
        })
      }
      if (['queued', 'in_progress', 'final_touches'].includes(j.status) && days >= 0 && days <= 3) {
        out.push({
          key: `${j.id}-due`,
          tone: days <= 1 && j.progress < 80 ? 'danger' : 'warning',
          text: t('messages.recap.dueSoon', { id: j.id, due: dueLabel(j.dueAt, lang), progress: j.progress }),
          href: `/jobs/${j.id}`,
          reply: `Quick update on ${j.id}: we’re at ${j.progress}% and on track for the deadline.`,
        })
      }
    }
    if (days < 0 && !['in_review', 'requested'].includes(j.status)) {
      out.push({
        key: `${j.id}-late`,
        tone: 'danger',
        text: t('messages.recap.overdue', { id: j.id, count: Math.abs(days) }),
        href: `/jobs/${j.id}`,
        reply: role === 'client' ? `Hi ${first}! ${j.id} is past its due date — how is it looking on your side?` : `Sorry for the delay on ${j.id} — final files are coming very soon.`,
      })
    }
    if (j.blocker) {
      out.push({ key: `${j.id}-blocker`, tone: 'danger', text: t('messages.recap.blocked', { id: j.id, reason: j.blocker }), href: `/jobs/${j.id}` })
    }
  }

  // An unanswered question from the counterpart.
  const msgs = view.messages
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m.senderId === meId) break
    if (m.senderId === view.counterpartId && m.kind === 'text' && /\?\s*\S{0,3}$/.test(m.text.trim())) {
      out.push({
        key: `q-${m.id}`,
        tone: 'accent',
        text: t('messages.recap.question', { name: first, quote: m.text.length > 70 ? `${m.text.slice(0, 68)}…` : m.text }),
        reply: 'Good question — let me check and get back to you shortly.',
      })
      break
    }
  }

  if (view.unread > 0) {
    out.push({ key: 'unread', tone: 'accent', text: t('messages.recap.unread', { count: view.unread, name: first }) })
  }

  return out.sort((a, b) => RANK[a.tone] - RANK[b.tone]).slice(0, 4)
}

/** Night "designTab AI" card — the reference's black AI panel, for one thread. */
export function RecapCard({
  view,
  jobs,
  role,
  meId,
  onDraft,
  className,
}: {
  view: ConversationView
  jobs: Job[]
  role: Role
  meId: string
  onDraft: (text: string) => void
  className?: string
}) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const enabled = useApp((s) => s.settings.aiAssistant)
  const setSettings = useApp((s) => s.setSettings)
  const items = useMemo(() => buildRecap(view, jobs, role, meId, t, lang), [view, jobs, role, meId, t, lang])
  const top = items[0]
  const suggestion = items.find((i) => i.reply)?.reply ?? quickReplies(role, view.last, meId)[0]
  const sig = items.map((i) => i.key).join('|')
  const lastAt = view.last?.createdAt

  if (!enabled) {
    return (
      <div className={cn('glass-night flex items-center gap-3 rounded-[24px] p-3.5', className)}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-white">{t('messages.recap.offTitle')}</p>
          <p className="truncate text-[11.5px] text-white/55">{t('messages.recap.offBody')}</p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => setSettings({ aiAssistant: true })}
          className="h-8 shrink-0 rounded-full bg-accent px-3 text-[12px] font-medium text-accent-ink"
        >
          {t('messages.recap.turnOn')}
        </motion.button>
      </div>
    )
  }

  return (
    <div className={cn('glass-night relative overflow-hidden rounded-[24px] p-4', className)}>
      {/* sweep of light whenever the recap changes */}
      <motion.span
        key={sig}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-[linear-gradient(100deg,transparent,rgba(255,255,255,.10),transparent)]"
        initial={{ x: '0%' }}
        animate={{ x: '400%' }}
        transition={{ duration: 1.4, ease: EASE_OUT }}
      />
      <div className="pointer-events-none absolute -right-14 -top-16 size-40 rounded-full bg-accent opacity-20 blur-3xl" />
      <div className="relative flex items-center gap-2">
        <motion.span
          className="flex size-7 items-center justify-center rounded-full bg-accent text-accent-ink"
          animate={{ rotate: [0, 18, -10, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3.5 }}
        >
          <Sparkles className="size-3.5" />
        </motion.span>
        <span className="text-[13px] font-medium text-white">{t('messages.recap.title')}</span>
        {lastAt && <span className="ml-auto font-mono text-[10.5px] text-white/45">{timeAgo(lastAt, lang)}</span>}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={items.length}
          initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="relative mt-3 text-[17px] font-medium leading-snug tracking-[-0.02em] text-white"
        >
          {items.length ? t('messages.recap.headline', { count: items.length }) : t('messages.recap.clear')}
        </motion.p>
      </AnimatePresence>
      {items.length > 0 ? (
        <ul className="relative mt-2.5 space-y-2">
          <AnimatePresence initial={true}>
            {items.map((it, i) => (
              <motion.li
                key={it.key}
                layout="position"
                initial={{ opacity: 0, x: -10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { delay: 0.08 + i * 0.06, duration: 0.45, ease: EASE_OUT } }}
                exit={{ opacity: 0, x: 10, transition: { duration: 0.15 } }}
              >
                <button
                  type="button"
                  disabled={!it.href}
                  onClick={() => it.href && navigate(it.href)}
                  className="group flex w-full items-start gap-2.5 text-left text-[12.5px] leading-snug text-white/75 transition-colors enabled:hover:text-white"
                >
                  <span className={cn('mt-[5px] size-1.5 shrink-0 rounded-full', TONE_DOT[it.tone])} />
                  <span className="min-w-0 flex-1">{it.text}</span>
                  {it.href && <ArrowUpRight className="mt-px size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />}
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="relative mt-1 text-[12.5px] text-white/55">{t('messages.recap.clearBody')}</p>
      )}
      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.96 }}
          transition={spring.snappy}
          onClick={() => onDraft(suggestion)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[12.5px] font-medium text-accent-ink shadow-[0_10px_24px_-10px_var(--accent)]"
        >
          <PenLine className="size-3.5" />
          {t('messages.recap.draft')}
        </motion.button>
        {top?.href && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(top.href!)}
            className="inline-flex h-9 items-center gap-1 rounded-full bg-white/10 px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-white/15"
          >
            {t('messages.recap.open')}
            <ArrowUpRight className="size-3.5" />
          </motion.button>
        )}
      </div>
    </div>
  )
}

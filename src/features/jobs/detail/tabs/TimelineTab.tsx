import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, History, Send } from 'lucide-react'
import { isToday, isYesterday } from 'date-fns'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { fmt, timeAgo } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { JobStatus, TimelineEvent, TimelineKind } from '@/store/types'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Segmented } from '@/components/ui/Segmented'
import { useJobCtx } from '../context'
import { TIMELINE_GROUPS, TIMELINE_ICON } from '../model'
import { PersonAvatar } from '../ui'

const KIND_STYLE: Record<TimelineKind, string> = {
  created: 'bg-accent text-accent-ink',
  accepted: 'bg-success text-white',
  declined: 'bg-danger text-white',
  status: 'bg-info text-white',
  asset: 'bg-[#5B8DEF] text-white',
  delivery: 'bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink',
  revision: 'bg-[var(--warning)] text-[#0b0b0c]',
  approved: 'bg-success text-white',
  deadline: 'bg-[var(--warning)] text-[#0b0b0c]',
  comment: 'bg-[var(--surface-3)] text-ink',
  payment: 'bg-[#2FB36B] text-white',
  counter: 'bg-[#9B6BFF] text-white',
}

type Group = keyof typeof TIMELINE_GROUPS
const PAGE = 24

export function TimelineTab() {
  const t = useT()
  const lang = useLang()
  const { job, canAct, meId, person } = useJobCtx()
  const addComment = useApp((s) => s.addComment)
  const [group, setGroup] = useState<Group>('all')
  const [text, setText] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const sorted = useMemo(() => [...job.timeline].sort((a, b) => b.at.localeCompare(a.at)), [job.timeline])
  const filtered = group === 'all' ? sorted : sorted.filter((e) => TIMELINE_GROUPS[group].includes(e.kind))
  const shown = filtered.slice(0, limit)
  const days = useMemo(() => {
    const out: { key: string; label: string; events: TimelineEvent[] }[] = []
    for (const e of shown) {
      const d = new Date(e.at)
      const key = fmt(d, 'yyyy-MM-dd', lang)
      let g = out[out.length - 1]
      if (!g || g.key !== key) {
        g = { key, label: isToday(d) ? t('core.common.today') : isYesterday(d) ? t('core.common.yesterday') : fmt(d, 'EEEE, d MMM', lang), events: [] }
        out.push(g)
      }
      g.events.push(e)
    }
    return out
  }, [shown, lang, t])

  const post = () => {
    const v = text.trim()
    if (!v) return
    addComment(job.id, v)
    setText('')
    if (group !== 'all' && group !== 'comments') setGroup('all')
    toast({ title: t('job.timeline.posted'), tone: 'success', duration: 1800 })
  }

  const counts = (g: Group) => (g === 'all' ? sorted.length : sorted.filter((e) => TIMELINE_GROUPS[g].includes(e.kind)).length)

  return (
    <div className="space-y-5">
      {canAct && (
        <form
          className="flex items-start gap-3 rounded-[22px] bg-[var(--surface-2)] p-3"
          onSubmit={(e) => {
            e.preventDefault()
            post()
          }}
        >
          <PersonAvatar person={person(meId)} size={34} className="mt-0.5 hidden sm:block" />
          <div className="min-w-0 flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  post()
                }
              }}
              rows={2}
              placeholder={t('job.timeline.ph')}
              className="w-full resize-none rounded-[16px] border border-line bg-[var(--surface)] px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-[border-color,box-shadow] focus:border-[var(--accent-line)] focus:shadow-[0_0_0_4px_var(--accent-softer)]"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="hidden font-mono text-[11px] text-ink-3 sm:inline">{t('job.timeline.shortcut')}</span>
              <Button size="sm" type="submit" disabled={!text.trim()} icon={<Send className="size-3.5" />} className="ml-auto">
                {t('job.timeline.post')}
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
        <Segmented<Group>
          value={group}
          onChange={(g) => {
            setGroup(g)
            setLimit(PAGE)
          }}
          size="sm"
          layoutId="timeline-filter"
          options={(Object.keys(TIMELINE_GROUPS) as Group[]).map((g) => ({ value: g, label: t(`job.timeline.f.${g}`), count: counts(g) }))}
        />
      </div>

      {!filtered.length ? (
        <EmptyState icon={<History />} title={t('job.timeline.empty')} description={t('job.timeline.emptyBody')} />
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <section key={day.key}>
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[12px] font-medium text-ink-2">{day.label}</span>
                <span className="h-px flex-1 bg-[var(--line)]" />
                <span className="font-mono text-[11px] text-ink-3">{day.events.length}</span>
              </div>
              <ol className="relative ml-[17px]">
                <motion.span
                  aria-hidden
                  className="absolute bottom-3 left-0 top-3 w-0.5 origin-top -translate-x-1/2 rounded-full bg-[var(--line-2)]"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.8, ease: EASE_OUT }}
                />
                <AnimatePresence initial={false}>
                  {day.events.map((e, i) => (
                    <EventRow key={e.id} event={e} index={i} />
                  ))}
                </AnimatePresence>
              </ol>
            </section>
          ))}
          {filtered.length > limit && (
            <div className="flex justify-center">
              <Button size="sm" variant="glass" onClick={() => setLimit((l) => l + PAGE)}>
                {t('job.timeline.more', { count: filtered.length - limit })}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EventRow({ event: e, index }: { event: TimelineEvent; index: number }) {
  const lang = useLang()
  const { person, meId } = useJobCtx()
  const actor = person(e.actorId)
  const Icon = TIMELINE_ICON[e.kind]
  const from = e.meta?.from as JobStatus | undefined
  const to = e.meta?.to as JobStatus | undefined
  const isComment = e.kind === 'comment'
  const mine = e.actorId === meId
  return (
    <motion.li
      layout
      className="relative pb-4 pl-8 last:pb-0"
      initial={{ opacity: 0, x: -12, filter: 'blur(6px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { delay: Math.min(index, 8) * 0.045, duration: 0.45, ease: EASE_OUT } }}
      exit={{ opacity: 0, x: 12 }}
    >
      <motion.span
        className={cn('absolute left-0 top-0 flex size-[34px] -translate-x-1/2 items-center justify-center rounded-full ring-4 ring-[var(--surface)] [&_svg]:size-4', KIND_STYLE[e.kind])}
        initial={{ scale: 0.4, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...spring.bouncy, delay: Math.min(index, 8) * 0.045 + 0.05 }}
      >
        <Icon />
      </motion.span>
      <div className="min-w-0 pt-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <PersonAvatar person={actor} size={18} />
          <span className="text-[13px] font-medium text-ink">{actor?.name ?? e.actorId}</span>
          <span className="font-mono text-[11px] text-ink-3" title={fmt(e.at, 'PPpp', lang)}>
            {fmt(e.at, 'HH:mm', lang)} · {timeAgo(e.at, lang)}
          </span>
        </div>
        {isComment ? (
          <p className={cn('mt-1.5 inline-block max-w-full whitespace-pre-line rounded-[16px] rounded-tl-[6px] px-3.5 py-2 text-[13.5px] leading-relaxed', mine ? 'bg-accent-soft text-ink' : 'bg-[var(--surface-2)] text-ink')}>{e.text}</p>
        ) : (
          <p className="mt-0.5 text-[13.5px] leading-snug text-ink-2">{e.text}</p>
        )}
        {from && to && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={from} size="xs" />
            <ArrowRight className="size-3 text-ink-3" />
            <StatusBadge status={to} size="xs" />
          </div>
        )}
      </div>
    </motion.li>
  )
}

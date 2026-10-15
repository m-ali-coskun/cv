import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCheck,
  CircleDollarSign,
  Flag,
  FolderOpen,
  Hash,
  Layers,
  ListChecks,
  Pencil,
  Plus,
  Repeat2,
  Sparkles,
  Tag,
  Timer,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { dueLabel, shortDate, timeAgo } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { fireConfetti } from '@/lib/confetti'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { DisciplineIcon, PriorityBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Gauge } from '@/components/ui/Gauge'
import { TagInput } from '@/components/ui/TagInput'
import { useJobCtx } from '../context'
import { useDuration } from '../hooks'
import { isClosed, paragraphs, trackedSeconds } from '../model'
import { CheckDot, SectionTitle, listItem } from '../ui'

export function OverviewTab() {
  return (
    <div className="space-y-7">
      <div className="grid gap-6 @min-[760px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Brief />
          <Blocker />
          <Tags />
        </div>
        <div className="min-w-0">
          <Deliverables />
        </div>
      </div>
      <KeyFacts />
    </div>
  )
}

// ─────────────── brief ───────────────

/** Tiny rich-text: paragraphs, "- " bullet lists, "1." ordered lists and **bold**. */
function RichText({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    )
  return (
    <div className="space-y-3 text-[14.5px] leading-[1.7] text-ink-2">
      {paragraphs(text).map((p, i) => {
        const lines = p.split('\n')
        if (lines.every((l) => /^\s*([-•*]|\d+\.)\s+/.test(l))) {
          const ordered = /^\s*\d+\./.test(lines[0])
          const List = ordered ? 'ol' : 'ul'
          return (
            <List key={i} className={cn('space-y-1 pl-5', ordered ? 'list-decimal' : 'list-disc marker:text-[var(--accent-text)]')}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-•*]|\d+\.)\s+/, ''))}</li>
              ))}
            </List>
          )
        }
        return (
          <p key={i} className="whitespace-pre-line text-pretty">
            {inline(p)}
          </p>
        )
      })}
    </div>
  )
}

function Brief() {
  const t = useT()
  const lang = useLang()
  const { job, client } = useJobCtx()
  const [expanded, setExpanded] = useState(false)
  const long = job.description.length > 520
  return (
    <section>
      <SectionTitle icon={<Sparkles />} title={t('job.overview.brief')} sub={t('job.overview.briefBy', { name: client?.name ?? '', time: timeAgo(job.createdAt, lang) })} />
      <motion.blockquote
        className="relative mt-4 overflow-hidden rounded-[20px] bg-accent-softer px-4 py-3.5 text-[16px] font-medium leading-snug tracking-[-0.01em] text-ink sm:text-[17px]"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT, delay: 0.05 }}
      >
        <span aria-hidden className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-accent" />
        {job.summary}
      </motion.blockquote>
      <motion.div
        className={cn('relative mt-4', long && !expanded && 'max-h-[220px] overflow-hidden')}
        animate={{ height: 'auto' }}
        transition={spring.smooth}
      >
        <RichText text={job.description} />
        {long && !expanded && <div aria-hidden className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent,var(--surface))]" />}
      </motion.div>
      {long && (
        <Button size="xs" variant="ghost" className="mt-2" onClick={() => setExpanded((v) => !v)}>
          {expanded ? t('job.overview.less') : t('job.overview.more')}
        </Button>
      )}
    </section>
  )
}

// ─────────────── blocker ───────────────

function Blocker() {
  const t = useT()
  const { job, side, canAct } = useJobCtx()
  const update = useApp((s) => s.updateJob)
  const addComment = useApp((s) => s.addComment)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const closed = isClosed(job.status)
  if (closed && !job.blocker) return null

  if (job.blocker)
    return (
      <motion.div
        layout
        className="flex flex-wrap items-start gap-3 rounded-[20px] border border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-warning-soft p-4"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring.smooth}
      >
        <motion.span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--warning)] text-[#0b0b0c]"
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 3 }}
        >
          <AlertTriangle className="size-4" />
        </motion.span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-2">{t('job.blocker.title')}</div>
          <div className="mt-0.5 text-[14.5px] font-medium text-ink">{job.blocker}</div>
        </div>
        {canAct && (
          <Button
            size="sm"
            variant="glass"
            icon={<CheckCheck className="size-3.5" />}
            onClick={() => {
              update(job.id, { blocker: undefined })
              addComment(job.id, `Blocker cleared: ${job.blocker}`)
              toast({ title: t('job.blocker.cleared'), tone: 'success' })
            }}
          >
            {t('job.blocker.clear')}
          </Button>
        )}
      </motion.div>
    )

  if (!canAct || side !== 'designer') return null
  return (
    <AnimatePresence mode="wait" initial={false}>
      {editing ? (
        <motion.form
          key="form"
          className="flex flex-col gap-2 rounded-[20px] bg-[var(--surface-2)] p-3 sm:flex-row"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          onSubmit={(e) => {
            e.preventDefault()
            const v = text.trim()
            if (!v) return
            update(job.id, { blocker: v })
            addComment(job.id, `Blocker flagged: ${v}`)
            toast({ title: t('job.blocker.flagged'), description: v, tone: 'info' })
            setEditing(false)
            setText('')
          }}
        >
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('job.blocker.ph')}
            className="h-10 min-w-0 flex-1 rounded-full border border-line bg-[var(--surface)] px-4 text-[13.5px] outline-none focus:border-[var(--accent-line)]"
          />
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={!text.trim()}>
              {t('job.blocker.flag')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t('core.action.cancel')}
            </Button>
          </div>
        </motion.form>
      ) : (
        <motion.button
          key="btn"
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-3 transition-colors hover:text-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Flag className="size-3.5" />
          {t('job.blocker.report')}
        </motion.button>
      )}
    </AnimatePresence>
  )
}

// ─────────────── tags ───────────────

const TAG_SUGGESTIONS = ['launch', 'social', 'print', 'ooh', 'motion', 'rebrand', 'campaign', 'web', 'packaging', 'retainer', 'rush', 'b2b']

function Tags() {
  const t = useT()
  const { job, side, canAct } = useJobCtx()
  const update = useApp((s) => s.updateJob)
  const [edit, setEdit] = useState(false)
  const editable = canAct && side === 'client'
  return (
    <section>
      <SectionTitle
        icon={<Tag />}
        title={t('job.overview.tags')}
        right={
          editable && (
            <Button size="xs" variant={edit ? 'primary' : 'ghost'} icon={edit ? <CheckCheck className="size-3.5" /> : <Pencil className="size-3.5" />} onClick={() => setEdit((v) => !v)}>
              {edit ? t('core.action.done') : t('core.action.edit')}
            </Button>
          )
        }
      />
      <div className="mt-3">
        {edit ? (
          <TagInput value={job.tags} onChange={(tags) => update(job.id, { tags })} suggestions={TAG_SUGGESTIONS} transform="lowercase" max={12} quickPicks={5} icon={<Hash className="size-4" />} />
        ) : job.tags.length ? (
          <motion.div className="flex flex-wrap gap-1.5" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>
            {job.tags.map((tag) => (
              <motion.span
                key={tag}
                variants={{ hidden: { opacity: 0, scale: 0.6, y: 6 }, show: { opacity: 1, scale: 1, y: 0, transition: spring.bouncy } }}
                whileHover={{ y: -2, rotate: -2 }}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-[var(--surface-2)] px-3 font-mono text-[12.5px] text-ink-2"
              >
                <span className="text-ink-4">#</span>
                {tag}
              </motion.span>
            ))}
          </motion.div>
        ) : (
          <p className="text-[13px] text-ink-3">{t('job.overview.noTags')}</p>
        )}
      </div>
    </section>
  )
}

// ─────────────── deliverables ───────────────

function Deliverables() {
  const t = useT()
  const { job, canAct } = useJobCtx()
  const toggle = useApp((s) => s.toggleDeliverable)
  const add = useApp((s) => s.addDeliverable)
  const remove = useApp((s) => s.removeDeliverable)
  const [draft, setDraft] = useState('')
  const editable = canAct && job.status !== 'declined' && job.status !== 'cancelled'
  const done = job.deliverables.filter((d) => d.done).length
  const total = job.deliverables.length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <section>
      <SectionTitle icon={<ListChecks />} title={t('job.overview.deliverables')} sub={t('job.overview.deliverablesSub', { done, total })} />
      <div className="glass-accent mt-4 rounded-[24px] px-4 pb-3 pt-5">
        <div className="relative z-[1]">
          <Gauge
            value={pct}
            size={240}
            ticks={40}
            label={t('job.overview.readyLabel')}
            footer={
              <div className="flex items-center justify-between gap-2 rounded-full bg-white/85 px-4 py-2 text-[13px] text-[#0b0b0c] shadow-[inset_0_1px_0_#fff]">
                <span className="truncate font-mono font-medium">{job.id}</span>
                <span className="shrink-0 font-mono text-[12px] text-black/50">
                  {done} / {total} {t('job.overview.done')}
                </span>
              </div>
            }
            ariaLabel={t('job.overview.readyLabel')}
          />
        </div>
      </div>
      <ul className="mt-3 space-y-1">
        <AnimatePresence initial={false}>
          {job.deliverables.map((d) => (
            <motion.li key={d.id} layout {...listItem} className="group/dl flex items-center gap-3 rounded-[14px] px-2 py-2 transition-colors hover:bg-[var(--surface-2)]">
              <CheckDot
                checked={d.done}
                disabled={!editable}
                label={d.label}
                onClick={(() => {
                  toggle(job.id, d.id)
                  if (!d.done && done + 1 === total) {
                    fireConfetti({ particleCount: 70, origin: { x: 0.5, y: 0.5 } })
                    toast({ title: t('job.overview.allDone'), description: job.title, tone: 'success' })
                  }
                })}
              />
              <span className={cn('relative min-w-0 flex-1 text-[14px] transition-colors', d.done ? 'text-ink-3' : 'text-ink')}>
                {d.label}
                <motion.span aria-hidden className="absolute left-0 top-1/2 h-px w-full origin-left bg-[var(--ink-3)]" initial={false} animate={{ scaleX: d.done ? 1 : 0 }} transition={{ duration: 0.35, ease: EASE_OUT }} />
              </span>
              {editable && (
                <button
                  type="button"
                  aria-label={t('core.action.remove')}
                  onClick={() => remove(job.id, d.id)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3 opacity-100 transition-all hover:bg-danger-soft hover:text-danger sm:opacity-0 sm:group-hover/dl:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {editable && (
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const v = draft.trim()
            if (!v) return
            add(job.id, v)
            setDraft('')
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Plus className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('job.overview.addDeliverable')}
              className="h-10 w-full rounded-full border border-line bg-[var(--surface)]/70 pl-9 pr-3 text-[13.5px] outline-none transition-[border-color,box-shadow] focus:border-[var(--accent-line)] focus:shadow-[0_0_0_4px_var(--accent-softer)]"
            />
          </div>
          <AnimatePresence>
            {draft.trim() && (
              <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={spring.bouncy}>
                <Button size="sm" type="submit">
                  {t('core.action.add')}
                </Button>
              </motion.span>
            )}
          </AnimatePresence>
          {!draft.trim() && <span className="sr-only">{t('core.action.add')}</span>}
        </form>
      )}
    </section>
  )
}

// ─────────────── key facts ───────────────

function Fact({ icon, label, value, sub, tone, i }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; tone?: 'night' | 'danger'; i: number }) {
  return (
    <motion.div
      className={cn(
        'relative min-w-0 overflow-hidden rounded-[18px] p-3.5',
        tone === 'night' ? 'bg-night text-on-night' : tone === 'danger' ? 'bg-danger text-white' : 'bg-[var(--surface-2)]',
      )}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.04 * i, ...spring.smooth }}
      whileHover={{ y: -3 }}
    >
      <div className={cn('flex items-center gap-1.5 text-[11.5px]', tone ? 'opacity-70' : 'text-ink-3')}>
        <span className="[&_svg]:size-3.5">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 truncate text-[17px] font-medium tracking-[-0.02em]">{value}</div>
      {sub && <div className={cn('mt-0.5 truncate font-mono text-[11px]', tone ? 'opacity-70' : 'text-ink-3')}>{sub}</div>}
    </motion.div>
  )
}

function KeyFacts() {
  const t = useT()
  const lang = useLang()
  const dur = useDuration()
  const { job, setTab } = useJobCtx()
  const overdue = !isClosed(job.status) && new Date(job.dueAt).getTime() < Date.now()
  const facts = [
    { icon: <CircleDollarSign />, label: t('core.common.budget'), value: formatMoney(job.budget, job.currency, lang), tone: 'night' as const },
    { icon: <CalendarClock />, label: t('core.common.deadline'), value: shortDate(job.dueAt, lang), sub: isClosed(job.status) ? undefined : dueLabel(job.dueAt, lang), tone: overdue ? ('danger' as const) : undefined },
    { icon: <Flag />, label: t('core.common.priority'), value: <PriorityBadge priority={job.priority} /> },
    { icon: <DisciplineIcon id={job.discipline} size={14} />, label: t('job.facts.discipline'), value: t(`core.discipline.${job.discipline}`) },
    { icon: <Repeat2 />, label: t('job.facts.revisions'), value: `${job.revisions.length} / ${job.revisionLimit}`, sub: t('job.facts.revisionsSub') },
    { icon: <Layers />, label: t('job.facts.versions'), value: job.versions.length, sub: job.deliveredAt ? timeAgo(job.deliveredAt, lang) : '—' },
    { icon: <FolderOpen />, label: t('job.facts.assetsLabel'), value: job.assets.length, sub: t('job.facts.refs', { count: job.styleGuide.references.length }) },
    { icon: <Timer />, label: t('job.timer.title'), value: dur(trackedSeconds(job) / 60), sub: job.timerStartedAt ? t('job.timer.running') : undefined },
  ]
  return (
    <section>
      <SectionTitle
        icon={<Hash />}
        title={t('job.overview.facts')}
        right={
          <Button size="xs" variant="ghost" iconRight={<ArrowUpRight className="size-3.5" />} onClick={() => setTab('payments')}>
            {t('job.tab.payments')}
          </Button>
        }
      />
      <div className="mt-3 grid grid-cols-2 gap-2 @min-[560px]:grid-cols-4">
        {facts.map((f, i) => (
          <Fact key={f.label} i={i} {...f} />
        ))}
      </div>
    </section>
  )
}

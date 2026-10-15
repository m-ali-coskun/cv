import { useRef } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, ArrowUpRight, BadgeCheck, CalendarClock, Check, Download, FileText, Info, PackageCheck, RotateCcw, Wallet } from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { dueLabel, shortDate } from '@/lib/dates'
import { formatBytes, formatMoney } from '@/lib/format'
import { mediaIsImage, mediaIsVideo } from '@/lib/files'
import { useLang, useT } from '@/i18n'
import type { Job, MediaRef, Message } from '@/store/types'
import { MediaView } from '@/components/art/MediaView'
import { Button } from '@/components/ui/Button'
import { DisciplineIcon, Pill, StatusBadge } from '@/components/ui/Badge'
import { RatingStars } from '@/components/ui/RatingStars'
import { useThreadCtx } from './context'
import { clock, parseBrief, parseDelivery, parseRevision, parseStatus, type Person } from './model'
import { JobChip, PersonAvatar, RichText } from './ui'

const ORANGE = '#f97316'

const isVisual = (m: MediaRef) => mediaIsImage(m) || mediaIsVideo(m)

/* ───────────────────────────── media grid ───────────────────────────── */

export function MediaGrid({ items, className }: { items: MediaRef[]; className?: string }) {
  const { openMedia } = useThreadCtx()
  const refs = useRef<(HTMLElement | null)[]>([])
  const visual = items.map((m, i) => ({ m, i })).filter((x) => isVisual(x.m))
  const files = items.map((m, i) => ({ m, i })).filter((x) => !isVisual(x.m))
  const shown = visual.slice(0, 4)
  const extra = visual.length - shown.length
  const open = (i: number) => openMedia(items, i, (k) => refs.current[k])
  const n = shown.length

  return (
    <div className={cn('flex w-[min(calc(100cqw-92px),320px)] flex-col gap-1.5 sm:w-[min(calc(100cqw-136px),320px)]', className)}>
      {n > 0 && (
        <div className={cn('grid gap-1.5 overflow-hidden rounded-[20px]', n === 1 ? 'grid-cols-1' : 'grid-cols-2', n === 3 && 'grid-rows-2')}>
          {shown.map(({ m, i }, k) => (
            <motion.button
              key={i}
              type="button"
              ref={(el) => {
                refs.current[i] = el
              }}
              onClick={(e) => {
                e.stopPropagation()
                open(i)
              }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'group/tile relative overflow-hidden bg-[var(--surface-2)]',
                n === 1 ? 'aspect-[4/3]' : n === 3 && k === 0 ? 'row-span-2 aspect-auto h-full' : 'aspect-square',
              )}
              aria-label={m.kind === 'file' ? m.name : 'media'}
            >
              <span className="block size-full transition-transform duration-500 ease-[var(--ease-out)] group-hover/tile:scale-[1.06]">
                <MediaView media={m} playBadge />
              </span>
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition-opacity group-hover/tile:opacity-100" />
              {extra > 0 && k === shown.length - 1 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[22px] font-medium text-white backdrop-blur-[2px]">+{extra}</span>
              )}
            </motion.button>
          ))}
        </div>
      )}
      {files.map(({ m, i }) => (
        <button
          key={i}
          type="button"
          ref={(el) => {
            refs.current[i] = el
          }}
          onClick={(e) => {
            e.stopPropagation()
            open(i)
          }}
          className="flex items-center gap-2.5 rounded-2xl bg-[var(--surface)] p-2 pr-3 text-left text-ink shadow-[0_1px_2px_rgba(0,0,0,.06)] ring-1 ring-[var(--line)] transition-colors hover:bg-[var(--surface-2)]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
            <FileText className="size-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{m.kind === 'file' ? m.name : m.kind === 'url' ? (m.name ?? m.url) : 'file'}</span>
            <span className="block font-mono text-[10.5px] text-ink-3">{m.kind === 'file' ? formatBytes(m.size) : 'link'}</span>
          </span>
          <Download className="size-4 text-ink-3" />
        </button>
      ))}
    </div>
  )
}

/* ───────────────────────────── brief ───────────────────────────── */

function Tile({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-2xl bg-[var(--surface-2)] px-2.5 py-2', className)}>
      <p className="truncate text-[10.5px] text-ink-3">{label}</p>
      <p className="truncate text-[13px] font-medium tracking-[-0.01em]">{value}</p>
      {sub && <p className="truncate font-mono text-[10px] text-ink-3">{sub}</p>}
    </div>
  )
}

const cardBase = 'relative overflow-hidden rounded-[26px] bg-[var(--surface)] text-ink ring-1 ring-[var(--line)] shadow-[0_1px_2px_rgba(0,0,0,.05),0_18px_40px_-22px_rgba(0,0,0,.35)]'

export function BriefCard({ message, job }: { message: Message; job?: Job }) {
  const t = useT()
  const lang = useLang()
  const { openJob, query } = useThreadCtx()
  const parsed = parseBrief(message.text)
  return (
    <div className={cn(cardBase, 'w-[min(calc(100cqw-92px),360px)] sm:w-[min(calc(100cqw-136px),360px)]')}>
      <div className="relative h-28 overflow-hidden">
        {job ? <MediaView media={job.cover} /> : <div className="size-full bg-accent-soft" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
        <span className="glass glass-pill absolute left-3 top-3 inline-flex h-7 items-center gap-1.5 px-2.5 text-[11.5px] font-medium text-ink">
          <span className="relative z-[1] flex items-center gap-1.5">
            <FileText className="size-3.5" />
            {t('messages.card.newBrief')}
          </span>
        </span>
        {job && <DisciplineIcon id={job.discipline} size={30} className="absolute right-3 top-3" />}
        {job && <span className="absolute bottom-2.5 left-3 font-mono text-[11px] font-medium text-white/90">{job.id}</span>}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h4 className="text-[16px] font-medium leading-snug tracking-[-0.02em]">
            <RichText text={job?.title ?? parsed.title} query={query} />
          </h4>
          {parsed.summary && (
            <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-ink-2">
              <RichText text={parsed.summary} query={query} />
            </p>
          )}
        </div>
        {job && (
          <div className="grid grid-cols-3 gap-1.5">
            <Tile label={t('messages.card.budget')} value={<span className="font-mono">{formatMoney(job.budget, job.currency, lang, true)}</span>} />
            <Tile label={t('messages.card.due')} value={<span className="font-mono">{shortDate(job.dueAt, lang)}</span>} sub={dueLabel(job.dueAt, lang)} />
            <Tile label={t('messages.card.status')} value={<StatusBadge status={job.status} size="xs" className="max-w-full" />} />
          </div>
        )}
        {job && (
          <Button size="sm" block iconRight={<ArrowUpRight className="size-4" />} onClick={() => openJob(job.id)}>
            {t('messages.card.openJob')}
          </Button>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────────── delivery ───────────────────────────── */

export function DeliveryCard({ message, job }: { message: Message; job?: Job }) {
  const t = useT()
  const { openJob, role, query } = useThreadCtx()
  const parsed = parseDelivery(message.text)
  const version = job?.versions.find((v) => v.version === parsed.version)
  const media = message.attachments?.length ? message.attachments : (version?.media ?? [])
  const st = version?.status
  return (
    <div className={cn(cardBase, 'w-[min(calc(100cqw-92px),380px)] p-3.5 sm:w-[min(calc(100cqw-136px),380px)]')}>
      <div className="flex items-start gap-3">
        <motion.span
          initial={{ rotate: -12, scale: 0.7 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={spring.bouncy}
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-ink shadow-[0_8px_20px_-8px_var(--accent)]"
        >
          <PackageCheck className="size-5" />
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-medium tracking-[-0.01em]">
            {t('messages.card.delivery')}
            {parsed.version ? <span className="ml-1.5 font-mono text-[12px] text-ink-3">v{parsed.version}</span> : null}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {job && <JobChip job={job} onClick={() => openJob(job.id)} />}
            {st && (
              <Pill size="xs" tone={st === 'approved' ? 'success' : st === 'pending' ? 'warning' : 'outline'} dot>
                {t(`messages.card.version.${st}`)}
              </Pill>
            )}
          </div>
        </div>
      </div>
      {(parsed.note || parsed.head) && (
        <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-ink-2">
          <RichText text={parsed.note || parsed.head} query={query} />
        </p>
      )}
      {media.length > 0 && <MediaGrid items={media} className="mt-3 w-full" />}
      {job && (
        <Button
          size="sm"
          variant={role === 'client' && st === 'pending' ? 'primary' : 'soft'}
          block
          className="mt-3"
          iconRight={<ArrowUpRight className="size-4" />}
          onClick={() => openJob(job.id, 'deliveries')}
        >
          {role === 'client' ? t('messages.card.reviewDelivery') : t('messages.card.viewDelivery')}
        </Button>
      )}
    </div>
  )
}

/* ───────────────────────────── revision ───────────────────────────── */

export function RevisionCard({ message, job }: { message: Message; job?: Job }) {
  const t = useT()
  const { openJob, query } = useThreadCtx()
  const parsed = parseRevision(message.text)
  const rev = job?.revisions.find((r) => r.summary === parsed.summary) ?? job?.revisions.find((r) => r.items.some((it) => parsed.items.includes(it.text)))
  const items = rev ? rev.items.map((it) => ({ text: it.text, done: it.done })) : parsed.items.map((text) => ({ text, done: false }))
  const done = items.filter((i) => i.done).length
  const n = rev ? job!.revisions.indexOf(rev) + 1 : undefined
  return (
    <div
      className="relative w-[min(calc(100cqw-92px),370px)] overflow-hidden sm:w-[min(calc(100cqw-136px),370px)] rounded-[26px] p-3.5 text-ink shadow-[0_18px_40px_-24px_rgba(249,115,22,.6)]"
      style={{ background: `color-mix(in oklab, ${ORANGE} 12%, var(--surface))`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${ORANGE} 28%, transparent)` }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-40 blur-2xl" style={{ background: ORANGE }} />
      <div className="relative flex items-start gap-3">
        <motion.span
          initial={{ rotate: 90, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={spring.bouncy}
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-white"
          style={{ background: ORANGE, boxShadow: `0 8px 20px -8px ${ORANGE}` }}
        >
          <RotateCcw className="size-5" />
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-medium tracking-[-0.01em]">
            {t('messages.card.revision')}
            {n ? <span className="ml-1.5 font-mono text-[12px] text-ink-3">#{n}</span> : null}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {job && <JobChip job={job} onClick={() => openJob(job.id)} />}
            {rev && (
              <Pill size="xs" tone={rev.status === 'resolved' ? 'success' : 'outline'} dot={rev.status === 'resolved' ? true : ORANGE}>
                {t(`messages.card.revStatus.${rev.status}`)}
              </Pill>
            )}
          </div>
        </div>
      </div>
      <p className="relative mt-3 text-[13.5px] font-medium leading-snug">
        <RichText text={parsed.summary} query={query} />
      </p>
      {items.length > 0 && (
        <ul className="relative mt-2 space-y-1.5">
          {items.map((it, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.08 + i * 0.05 } }}
              className="flex items-start gap-2 text-[13px] leading-snug text-ink-2"
            >
              <span
                className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border', it.done ? 'border-transparent text-white' : 'border-[color-mix(in_oklab,#f97316_50%,transparent)]')}
                style={it.done ? { background: ORANGE } : undefined}
              >
                {it.done && <Check className="size-2.5" strokeWidth={3} />}
              </span>
              <span className={cn(it.done && 'text-ink-3 line-through decoration-1')}>
                <RichText text={it.text} query={query} />
              </span>
            </motion.li>
          ))}
        </ul>
      )}
      {items.length > 0 && (
        <div className="relative mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color-mix(in_oklab,#f97316_18%,transparent)]">
            <motion.div className="h-full rounded-full" style={{ background: ORANGE }} initial={{ width: 0 }} animate={{ width: `${(done / items.length) * 100}%` }} transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }} />
          </div>
          <span className="font-mono text-[10.5px] text-ink-3">
            {done}/{items.length}
          </span>
        </div>
      )}
      {job && (
        <Button
          size="sm"
          block
          className="relative mt-3 text-white hover:brightness-110"
          style={{ background: ORANGE }}
          iconRight={<ArrowUpRight className="size-4" />}
          onClick={() => openJob(job.id, 'revisions')}
        >
          {t('messages.card.viewRevisions')}
        </Button>
      )}
    </div>
  )
}

/* ───────────────────────────── approval ───────────────────────────── */

export function ApprovalCard({ message, job }: { message: Message; job?: Job }) {
  const t = useT()
  const lang = useLang()
  const { openJob, query } = useThreadCtx()
  const quote = message.text.replace(/^Approved ✅\s*—?\s*/, '').replace(/^[“"]|[”"]$/g, '')
  return (
    <div
      className="relative w-[min(calc(100cqw-92px),360px)] overflow-hidden sm:w-[min(calc(100cqw-136px),360px)] rounded-[26px] p-4 text-ink"
      style={{ background: 'color-mix(in oklab, var(--success) 13%, var(--surface))', boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--success) 30%, transparent), 0 18px 40px -24px var(--success)' }}
    >
      {[...Array(7)].map((_, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute size-1.5 rounded-full"
          style={{ left: `${12 + i * 12}%`, top: `${10 + ((i * 37) % 30)}%`, background: i % 2 ? 'var(--success)' : 'var(--accent)' }}
          initial={{ opacity: 0, y: 10, scale: 0 }}
          animate={{ opacity: [0, 1, 0.5], y: [10, -6, 0], scale: 1 }}
          transition={{ duration: 1.2, delay: 0.1 + i * 0.06 }}
        />
      ))}
      <div className="relative flex items-center gap-3">
        <motion.span
          initial={{ scale: 0.4, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={spring.wobbly}
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-success text-white shadow-[0_8px_20px_-8px_var(--success)]"
        >
          <BadgeCheck className="size-5" />
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-medium tracking-[-0.01em]">{t('messages.card.approved')}</p>
          {job && <JobChip job={job} onClick={() => openJob(job.id)} className="mt-0.5" />}
        </div>
      </div>
      <RatingStars value={job?.rating ?? 5} size={20} className="relative mt-3" />
      {quote && (
        <p className="relative mt-2 text-[13.5px] italic leading-relaxed text-ink-2">
          “<RichText text={quote} query={query} />”
        </p>
      )}
      {job && (
        <div className="relative mt-3 flex items-center justify-between gap-2 rounded-2xl bg-[var(--surface)]/70 px-3 py-2 text-[12px]">
          <span className="flex items-center gap-1.5 text-ink-2">
            <Wallet className="size-3.5" />
            {t('messages.card.paymentReleased')}
          </span>
          <span className="font-mono font-medium">{formatMoney(job.budget, job.currency, lang)}</span>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────────── centered lines ───────────────────────────── */

export function StatusLine({ message, job, sender }: { message: Message; job?: Job; sender?: Person }) {
  const lang = useLang()
  const { openJob, query, meId } = useThreadCtx()
  const parsed = parseStatus(message.text)
  if (parsed) {
    return (
      <div className="flex justify-center py-1.5">
        <motion.div className="glass glass-pill flex max-w-full flex-wrap items-center justify-center gap-1.5 px-2 py-1.5 text-[12px]" whileHover={{ scale: 1.02 }}>
          <span className="relative z-[1] flex flex-wrap items-center justify-center gap-1.5">
            <CalendarClock className="ml-1 size-3.5 text-ink-3" />
            {job && <JobChip job={job} onClick={() => openJob(job.id)} />}
            {parsed.from ? <StatusBadge status={parsed.from} size="xs" /> : <Pill size="xs">{parsed.fromLabel}</Pill>}
            <motion.span initial={{ x: -4, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, ...spring.bouncy }}>
              <ArrowRight className="size-3.5 text-ink-3" />
            </motion.span>
            {parsed.to ? <StatusBadge status={parsed.to} size="xs" /> : <Pill size="xs">{parsed.toLabel}</Pill>}
            <span className="mr-1 font-mono text-[10.5px] text-ink-3">{clock(message.createdAt, lang)}</span>
          </span>
        </motion.div>
      </div>
    )
  }
  const own = message.senderId === meId
  return (
    <div className="flex justify-center py-1.5">
      <div className="glass flex max-w-[min(92%,460px)] items-start gap-2.5 rounded-[22px] px-3.5 py-2.5">
        <span className="relative z-[1] mt-0.5">{sender ? <PersonAvatar person={sender} size={24} /> : <Info className="size-4 text-ink-3" />}</span>
        <div className="relative z-[1] min-w-0">
          <p className="text-[13px] leading-snug text-ink-2">
            <RichText text={message.text} query={query} onJob={(id) => openJob(id)} />
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            {job && <JobChip job={job} onClick={() => openJob(job.id)} />}
            <span className="font-mono text-[10.5px] text-ink-3">
              {own ? '' : sender?.name ? `${sender.name} · ` : ''}
              {clock(message.createdAt, lang)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SystemLine({ message, job }: { message: Message; job?: Job }) {
  const lang = useLang()
  const { openJob, query } = useThreadCtx()
  return (
    <div className="flex justify-center py-1.5">
      <p className="flex max-w-[min(92%,480px)] items-start gap-1.5 rounded-full px-3 py-1 text-center text-[12px] leading-snug text-ink-3">
        <Info className="mt-px size-3.5 shrink-0" />
        <span>
          <RichText text={message.text} query={query} onJob={(id) => openJob(id)} />
          {job && !message.text.includes(job.id) && (
            <button type="button" onClick={() => openJob(job.id)} className="ml-1 font-mono underline-offset-2 hover:underline">
              {job.id}
            </button>
          )}
          <span className="ml-1.5 font-mono text-[10.5px]">{clock(message.createdAt, lang)}</span>
        </span>
      </p>
    </div>
  )
}

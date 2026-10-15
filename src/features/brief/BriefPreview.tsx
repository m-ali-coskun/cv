import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, ChevronDown, CloudCheck, Eye, FileText, Paperclip } from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { formatMoney } from '@/lib/format'
import { dueLabel, shortDate, timeAgo } from '@/lib/dates'
import { nextJobId } from '@/lib/ids'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import type { ArtVariant, DisciplineId } from '@/store/types'
import { Avatar } from '@/components/ui/Avatar'
import { DisciplineIcon, Pill } from '@/components/ui/Badge'
import { ProgressRing } from '@/components/ui/Progress'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { GenerativeArt } from '@/components/art/GenerativeArt'
import { MediaView } from '@/components/art/MediaView'
import { useWizard } from './draftStore'
import { briefQuality, qualityLabelKey } from './model'
import { useBriefDesigner } from './ui'
import { AVAILABILITY_COLOR } from './steps/DesignerStep'

const ART: Record<DisciplineId, ArtVariant> = { visual: 'poster', video: 'video', motion: 'mesh', illustration: 'illustration', brand: 'logo', uiux: 'ui', '3d': 'blob3d' }

const reveal = {
  initial: { opacity: 0, height: 0, filter: 'blur(6px)' },
  animate: { opacity: 1, height: 'auto', filter: 'blur(0px)' },
  exit: { opacity: 0, height: 0, filter: 'blur(6px)' },
  transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] as const },
}

/** "Saved 4s ago" that keeps itself fresh. */
export function SavedIndicator({ className }: { className?: string }) {
  const t = useT()
  const lang = useLang()
  const savedAt = useWizard((s) => s.savedAt)
  const dirty = useWizard((s) => s.dirty)
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 15000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[12px] text-ink-3', className)} aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={savedAt ?? 'none'} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={spring.bouncy} className="flex">
          <CloudCheck className={cn('size-4', savedAt ? 'text-[var(--success)]' : 'text-ink-4')} />
        </motion.span>
      </AnimatePresence>
      {savedAt ? t('brief.saved', { ago: timeAgo(savedAt, lang) }) : dirty ? t('brief.saving') : t('brief.autosave')}
    </span>
  )
}

export function BriefPreview({ className, compact }: { className?: string; compact?: boolean }) {
  const t = useT()
  const lang = useLang()
  const draft = useWizard((s) => s.draft)
  const step = useWizard((s) => s.step)
  const goTo = useWizard((s) => s.goTo)
  const designer = useBriefDesigner()
  const jobs = useApp((s) => s.jobs)
  const currency = useApp((s) => s.settings.currency)
  const nextId = useMemo(() => nextJobId(jobs.map((j) => j.id)), [jobs])
  const quality = briefQuality(draft, designer)
  const disc = draft.discipline
  const visual = draft.assets.filter((a) => a.kind === 'image' || a.kind === 'video')

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* hero card, like the reference's address card */}
      <div className={cn('card relative overflow-hidden p-2', compact && 'shadow-none')}>
        <div className="relative h-[200px] overflow-hidden rounded-[22px]">
          <AnimatePresence initial={false}>
            <motion.div key={`${disc ?? 'none'}-${draft.templateId ?? ''}`} className="absolute inset-0" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
              {disc ? (
                <GenerativeArt seed={`${draft.templateId ?? 'brief'}-${disc}`} variant={ART[disc]} discipline={disc} className="size-full" playBadge={false} />
              ) : (
                <div className="stripes size-full bg-[var(--surface-2)]" />
              )}
            </motion.div>
          </AnimatePresence>
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 font-mono text-[11.5px] font-medium text-[#0b0b0c] shadow-[inset_0_1px_0_#fff] backdrop-blur">
            <FileText className="size-3.5" />
            {nextId}
          </div>
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-medium text-[#0b0b0c] backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--warning)]" />
            {t('brief.preview.draft')}
          </div>
          {disc && (
            <div className="absolute bottom-3 left-3">
              <DisciplineIcon id={disc} size={30} />
            </div>
          )}
        </div>

        <div className="glass glass-strong relative z-[1] mx-2 -mt-12 mb-1 rounded-[20px] p-3.5 bg-[color-mix(in_oklab,var(--surface)_84%,transparent)]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={draft.title ? 'filled' : 'empty'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={cn('line-clamp-2 text-[17px] font-medium leading-snug tracking-[-0.02em]', !draft.title && 'text-ink-4')}
                >
                  {draft.title || t('brief.preview.untitled')}
                </motion.div>
              </AnimatePresence>
              <div className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-3">{draft.summary || t('brief.preview.noSummary')}</div>
            </div>
            <ProgressRing value={quality.score} size={42} stroke={4.5}>
              <span className="font-mono text-[11px] font-semibold tabular-nums">{quality.score}</span>
            </ProgressRing>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <motion.div className="absolute inset-y-0 left-0 rounded-full bg-ink dark:bg-[var(--accent)]" initial={false} animate={{ width: `${quality.score}%` }} transition={spring.smooth} />
            </div>
            <span className="text-[11.5px] text-ink-3">{t(qualityLabelKey(quality.score))}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 divide-x divide-[var(--line)] rounded-2xl border border-line bg-[var(--surface)]/70">
            <div className="min-w-0 px-2.5 py-2">
              <div className="text-[10.5px] text-ink-3">{t('brief.preview.designer')}</div>
              <div className="truncate text-[13px] font-medium">{designer ? designer.name.split(' ')[0] : '—'}</div>
            </div>
            <div className="min-w-0 px-2.5 py-2">
              <div className="text-[10.5px] text-ink-3">{t('brief.preview.budget')}</div>
              <div className="truncate text-[13px] font-medium">
                <AnimatedCounter value={Math.round(draft.budget)} currency={currency} startOnView={false} />
              </div>
            </div>
            <div className="min-w-0 px-2.5 py-2">
              <div className="text-[10.5px] text-ink-3">{t('brief.preview.due')}</div>
              <div className="truncate font-mono text-[13px] font-medium">{draft.dueAt ? shortDate(draft.dueAt, lang) : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* details */}
      <div className={cn('card flex flex-col gap-0 p-4', compact && 'shadow-none')}>
        <AnimatePresence initial={false}>
          {designer && (
            <motion.div key="designer" {...reveal} className="overflow-hidden">
              <button type="button" onClick={() => goTo(1)} className="flex w-full items-center gap-3 rounded-2xl p-1.5 text-left transition-colors hover:bg-[var(--surface-2)]">
                <Avatar seed={designer.avatarSeed} media={designer.avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{designer.name}</div>
                  <div className="truncate text-[12px] text-ink-3">
                    {formatMoney(designer.hourlyRate, designer.currency, lang)}
                    {t('core.common.perHour')} · ~{designer.responseTimeHrs}h {t('brief.preview.reply')}
                  </div>
                </div>
                <Pill size="xs" dot={AVAILABILITY_COLOR[designer.availability]}>
                  {t(`core.availability.${designer.availability}`)}
                </Pill>
              </button>
            </motion.div>
          )}

          {draft.dueAt && (
            <motion.div key="due" {...reveal} className="overflow-hidden">
              <div className="mt-2 flex items-center justify-between rounded-2xl bg-[var(--surface-2)] px-3 py-2 text-[12.5px]">
                <span className="text-ink-3">{t('brief.preview.timeline')}</span>
                <span className="font-medium">{dueLabel(draft.dueAt, lang)}</span>
              </div>
            </motion.div>
          )}

          {draft.deliverables.length > 0 && (
            <motion.div key="deliv" {...reveal} className="overflow-hidden">
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-[11.5px] font-medium uppercase tracking-[0.1em] text-ink-3">
                  <span>{t('brief.steps.deliverables')}</span>
                  <span className="font-mono">{draft.deliverables.length}</span>
                </div>
                <ul className="flex flex-col gap-1">
                  <AnimatePresence initial={false}>
                    {draft.deliverables.slice(0, compact ? 3 : 5).map((d) => (
                      <motion.li key={d.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex items-center gap-2 text-[13px]">
                        <CheckCircle2 className="size-3.5 shrink-0 text-[var(--accent-text)]" />
                        <span className="truncate">{d.label}</span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                {draft.deliverables.length > (compact ? 3 : 5) && <div className="mt-1 text-[12px] text-ink-3">{t('brief.preview.more', { count: draft.deliverables.length - (compact ? 3 : 5) })}</div>}
              </div>
            </motion.div>
          )}

          {(draft.style.palette.length > 0 || draft.style.mood.length > 0 || draft.style.fonts.length > 0) && (
            <motion.div key="style" {...reveal} className="overflow-hidden">
              <div className="mt-3">
                <div className="mb-1.5 text-[11.5px] font-medium uppercase tracking-[0.1em] text-ink-3">{t('brief.steps.style')}</div>
                {draft.style.palette.length > 0 && (
                  <div className="flex h-7 overflow-hidden rounded-xl">
                    {draft.style.palette.map((c, i) => (
                      <motion.span key={`${c}-${i}`} layout className="h-full flex-1" style={{ background: c }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={spring.bouncy} />
                    ))}
                  </div>
                )}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {draft.style.fonts.map((f) => (
                    <span key={f} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11.5px]" style={{ fontFamily: `"${f}", ui-sans-serif` }}>
                      {f}
                    </span>
                  ))}
                  {draft.style.mood.map((m) => (
                    <span key={m} className="rounded-full bg-accent-soft px-2 py-0.5 text-[11.5px] font-medium text-[var(--accent-text)]">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {draft.assets.length > 0 && (
            <motion.div key="assets" {...reveal} className="overflow-hidden">
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-[11.5px] font-medium uppercase tracking-[0.1em] text-ink-3">
                  <span className="flex items-center gap-1">
                    <Paperclip className="size-3" />
                    {t('brief.steps.assets')}
                  </span>
                  <span className="font-mono">{draft.assets.length}</span>
                </div>
                <div className="flex -space-x-2">
                  {visual.slice(0, 6).map((a) => (
                    <motion.div key={a.id} initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={spring.bouncy} className="size-10 overflow-hidden rounded-xl ring-2 ring-[var(--surface)]">
                      <MediaView media={a.media} playBadge={false} />
                    </motion.div>
                  ))}
                  {draft.assets.length > Math.min(6, visual.length) && (
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--surface-2)] font-mono text-[11px] ring-2 ring-[var(--surface)]">+{draft.assets.length - Math.min(6, visual.length)}</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!designer && !draft.deliverables.length && !draft.dueAt && (
          <p className="flex items-center gap-2 text-[12.5px] text-ink-3">
            <Eye className="size-4" /> {t('brief.preview.empty')}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <SavedIndicator />
          <span className="font-mono text-[11px] text-ink-3">{t('brief.preview.step', { n: step + 1, total: 7 })}</span>
        </div>
      </div>
      {!compact && <Checklist />}
    </div>
  )
}

/** Section-by-section completion; each row jumps to its step. */
function Checklist() {
  const t = useT()
  const draft = useWizard((s) => s.draft)
  const goTo = useWizard((s) => s.goTo)
  const designer = useBriefDesigner()
  const rows = [
    { key: 'designer', step: 1, ok: !!designer },
    { key: 'basics', step: 2, ok: draft.title.trim().length >= 4 && draft.summary.trim().length >= 10 && draft.description.trim().length >= 40 },
    { key: 'terms', step: 2, ok: !!draft.dueAt && draft.budget >= 100 },
    { key: 'deliverables', step: 3, ok: draft.deliverables.length > 0 },
    { key: 'style', step: 4, ok: draft.style.palette.length > 0 || draft.style.fonts.length > 0 || draft.style.mood.length > 0 },
    { key: 'assets', step: 5, ok: draft.assets.length > 0 },
  ]
  const done = rows.filter((r) => r.ok).length
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[14px] font-medium tracking-[-0.01em]">{t('brief.checklist.title')}</span>
        <span className="font-mono text-[11px] text-ink-3">{t('brief.checklist.done', { n: done, total: rows.length })}</span>
      </div>
      <ul className="flex flex-col">
        {rows.map((r) => (
          <li key={r.key}>
            <button type="button" onClick={() => goTo(r.step)} className="group flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-[var(--surface-2)]">
              <motion.span
                className={cn('flex size-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300', r.ok ? 'bg-accent text-accent-ink' : 'border border-dashed border-line-2')}
                initial={false}
                animate={{ scale: r.ok ? [1, 1.25, 1] : 1 }}
                transition={{ duration: 0.35 }}
              >
                {r.ok && <CheckCircle2 className="size-3.5" />}
              </motion.span>
              <span className={cn('min-w-0 flex-1 truncate text-[13px] transition-colors', r.ok ? 'text-ink' : 'text-ink-3 group-hover:text-ink')}>{t(`brief.checklist.${r.key}`)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Phones/tablets: a collapsible bar that expands into the preview. */
export function BriefPreviewToggle() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const draft = useWizard((s) => s.draft)
  const designer = useBriefDesigner()
  const q = briefQuality(draft, designer).score
  return (
    <div className="xl:hidden">
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.98 }}
        aria-expanded={open}
        className="glass flex w-full items-center gap-3 rounded-[22px] px-3 py-2.5 text-left"
      >
        <ProgressRing value={q} size={36} stroke={4}>
          <span className="font-mono text-[10px] font-semibold">{q}</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-ink-3">{t('brief.preview.title')}</div>
          <div className={cn('truncate text-[14px] font-medium', !draft.title && 'text-ink-4')}>{draft.title || t('brief.preview.untitled')}</div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring.snappy} className="flex size-8 items-center justify-center rounded-full bg-[var(--surface-2)]">
          <ChevronDown className="size-4" />
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
            <div className="pt-3">
              <BriefPreview compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { differenceInCalendarDays } from 'date-fns'
import {
  AlertTriangle,
  ArrowRight,
  BookmarkPlus,
  CalendarRange,
  ClipboardCopy,
  Download,
  ExternalLink,
  FileCheck2,
  Lightbulb,
  Link2,
  Lock,
  PenLine,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { formatMoney } from '@/lib/format'
import { fmt, shortDate } from '@/lib/dates'
import { nextJobId } from '@/lib/ids'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useClient } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { ME_CLIENT_ID } from '@/store/types'
import { disciplineTheme } from '@/theme/disciplines'
import { Gauge } from '@/components/ui/Gauge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { DisciplineBadge, Pill, PriorityBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Overlay'
import { Input } from '@/components/ui/Field'
import { MediaView } from '@/components/art/MediaView'
import { useWizard } from '../draftStore'
import { briefQuality, briefToMarkdown, buildTimeline, firstInvalidStep, qualityLabelKey, STEP, STEP_IDS } from '../model'
import { saveUserTemplate } from '../templates'
import { Section, StepHeader, stepStagger, useBriefDesigner } from '../ui'

export function ReviewStep({ onSend, sending }: { onSend: () => void; sending: boolean }) {
  const t = useT()
  const lang = useLang()
  const draft = useWizard((s) => s.draft)
  const goTo = useWizard((s) => s.goTo)
  const designer = useBriefDesigner()
  const client = useClient(ME_CLIENT_ID)
  const jobs = useApp((s) => s.jobs)
  const currency = useApp((s) => s.settings.currency)
  const money = (n: number) => formatMoney(n, currency, lang)
  const nextId = useMemo(() => nextJobId(jobs.map((j) => j.id)), [jobs])
  const quality = briefQuality(draft, designer)
  const timeline = buildTimeline(draft)
  const invalid = firstInvalidStep(draft, { designerExists: !!designer })
  const [tplOpen, setTplOpen] = useState(false)
  const [tplName, setTplName] = useState('')

  const md = () => briefToMarkdown(draft, designer, money)
  const download = () => {
    const blob = new Blob([md()], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(draft.title || 'brief').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brief'}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    toast({ title: t('brief.review.downloaded'), tone: 'success', duration: 1800 })
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md())
      toast({ title: t('brief.review.copied'), tone: 'success', duration: 1800 })
    } catch {
      toast({ title: t('brief.review.copyFailed'), tone: 'error' })
    }
  }

  const days = draft.dueAt ? differenceInCalendarDays(new Date(draft.dueAt), new Date()) : null
  const disc = draft.discipline ?? 'visual'

  return (
    <motion.div variants={stepStagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
        <StepHeader
          index={STEP.review}
          icon={<FileCheck2 />}
          title={t('brief.review.title')}
          subtitle={t('brief.review.subtitle', { name: designer?.name.split(' ')[0] ?? t('brief.common.theDesigner') })}
          action={
            <>
              <Button size="sm" variant="glass" icon={<Download className="size-4" />} onClick={download}>
                .md
              </Button>
              <Button size="sm" variant="glass" icon={<ClipboardCopy className="size-4" />} onClick={copy}>
                {t('brief.review.copy')}
              </Button>
              <Button size="sm" variant="glass" icon={<BookmarkPlus className="size-4" />} onClick={() => (setTplName(draft.title), setTplOpen(true))}>
                {t('brief.review.saveTpl')}
              </Button>
            </>
          }
        />
      </motion.div>

      <AnimatePresence>
        {invalid >= 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-wrap items-center gap-3 rounded-[22px] bg-warning-soft p-4">
            <AlertTriangle className="size-5 shrink-0 text-[var(--warning)]" />
            <p className="min-w-0 flex-1 text-[13.5px] font-medium">{t('brief.review.missing', { step: t(`brief.steps.${STEP_IDS[invalid]}`) })}</p>
            <Button size="sm" onClick={() => goTo(invalid)} iconRight={<ArrowRight className="size-4" />}>
              {t('brief.review.fix')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* ───── the document ───── */}
        <motion.article variants={{ hidden: { opacity: 0, y: 30, rotate: -0.6 }, show: { opacity: 1, y: 0, rotate: 0, transition: { ...spring.smooth } } }} className="card relative min-w-0 overflow-hidden p-0">
          <div className="relative overflow-hidden px-5 pb-5 pt-5 sm:px-8 sm:pt-7" style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${disciplineTheme(disc).accent} 22%, var(--surface)), var(--surface) 70%)` }}>
            <div className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(180deg,#000,transparent)]" />
            <div className="relative flex flex-wrap items-center justify-between gap-2 font-mono text-[11.5px] uppercase tracking-[0.12em] text-ink-3">
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-ink px-2.5 py-1 text-[var(--surface)] dark:bg-accent dark:text-accent-ink">{nextId}</span>
                {t('brief.review.draft')}
              </span>
              <span>{fmt(new Date(), lang === 'en' ? 'MMM d, yyyy' : 'd. MMM yyyy', lang)}</span>
            </div>
            <h3 className="relative mt-5 text-balance text-[28px] font-medium leading-[1.08] tracking-[-0.03em] sm:text-[34px]">{draft.title || t('brief.preview.untitled')}</h3>
            {draft.summary && <p className="relative mt-2 max-w-2xl text-[15px] text-ink-2">{draft.summary}</p>}
            <div className="relative mt-4 flex flex-wrap gap-1.5">
              <DisciplineBadge id={disc} />
              <PriorityBadge priority={draft.priority} />
              {draft.tags.map((tag) => (
                <Pill key={tag} tone="outline" size="sm">
                  #{tag}
                </Pill>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 border-y border-line sm:grid-cols-4">
            {[
              { k: t('brief.review.budget'), v: money(draft.budget) },
              { k: t('brief.review.deadline'), v: draft.dueAt ? shortDate(draft.dueAt, lang) : '—', sub: days !== null ? t('brief.project.daysAway', { count: days }) : undefined },
              { k: t('brief.review.revisions'), v: String(draft.revisionLimit) },
              { k: t('brief.review.files'), v: String(draft.assets.length) },
            ].map((c, i) => (
              <div key={c.k} className={cn('border-line px-5 py-3.5 sm:px-6', i % 2 === 1 && 'border-l', i >= 2 && 'max-sm:border-t sm:border-l')}>
                <div className="text-[11.5px] text-ink-3">{c.k}</div>
                <div className="mt-0.5 font-mono text-[17px] font-medium tabular-nums tracking-[-0.02em]">{c.v}</div>
                {c.sub && <div className="text-[11px] text-ink-3">{c.sub}</div>}
              </div>
            ))}
          </div>

          <div className="flex flex-col divide-y divide-[var(--line)] px-5 sm:px-8">
            <DocSection title={t('brief.review.parties')} onEdit={() => goTo(STEP.designer)}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
                  {client && <Avatar kind="brand" name={client.name} color={client.logoColor} seed={client.avatarSeed} size={40} />}
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.1em] text-ink-3">{t('brief.review.from')}</div>
                    <div className="truncate text-[14px] font-medium">{client ? `${client.contactName} · ${client.name}` : 'Ali'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
                  {designer && <Avatar seed={designer.avatarSeed} media={designer.avatar} size={40} />}
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.1em] text-ink-3">{t('brief.review.to')}</div>
                    <div className="truncate text-[14px] font-medium">{designer ? designer.name : '—'}</div>
                    {designer && <div className="truncate text-[12px] text-ink-3">{designer.headline}</div>}
                  </div>
                </div>
              </div>
            </DocSection>

            <DocSection title={t('brief.review.description')} onEdit={() => goTo(STEP.project)}>
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{draft.description || '—'}</p>
            </DocSection>

            <DocSection title={t('brief.review.deliverables', { count: draft.deliverables.length })} onEdit={() => goTo(STEP.deliverables)}>
              <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {draft.deliverables.map((d, i) => (
                  <motion.li key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.03 }} className="flex items-center gap-2.5 text-[13.5px]">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-line-2 font-mono text-[10.5px] text-ink-3">{i + 1}</span>
                    {d.label}
                  </motion.li>
                ))}
              </ol>
              {draft.deliverables.length === 0 && <p className="text-[13px] text-ink-3">—</p>}
            </DocSection>

            <DocSection title={t('brief.review.style')} onEdit={() => goTo(STEP.style)}>
              <StyleSummary />
            </DocSection>

            <DocSection title={t('brief.review.assets', { count: draft.assets.length })} onEdit={() => goTo(STEP.assets)}>
              {draft.assets.length === 0 ? (
                <p className="text-[13px] text-ink-3">{t('brief.review.noAssets')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {draft.assets.map((a) =>
                    a.kind === 'link' ? (
                      <a key={a.id} href={a.media.kind === 'url' ? a.media.url : '#'} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 max-w-[220px] items-center gap-2 rounded-xl border border-line px-3 text-[12.5px] font-medium hover:bg-[var(--surface-2)]">
                        <Link2 className="size-4 shrink-0 text-ink-3" />
                        <span className="truncate">{a.name}</span>
                        <ExternalLink className="size-3 shrink-0 text-ink-4" />
                      </a>
                    ) : (
                      <div key={a.id} className="size-12 overflow-hidden rounded-xl ring-1 ring-line" title={a.name}>
                        <MediaView media={a.media} playBadge={false} className="[&_span]:hidden" />
                      </div>
                    ),
                  )}
                </div>
              )}
            </DocSection>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line-2 px-5 py-4 sm:px-8">
            <div className="text-[12px] text-ink-3">
              {t('brief.review.signed', { name: client?.contactName ?? 'Ali', company: client?.name ?? 'Northlight Studio' })}
              <div className="mt-1 -rotate-2 text-[24px] italic leading-none text-ink" style={{ fontFamily: '"Snell Roundhand", "Segoe Script", "Brush Script MT", cursive' }}>
                {client?.contactName ?? 'Ali'}
              </div>
            </div>
            <Button size="lg" icon={<Send className="size-4" />} onClick={onSend} loading={sending} disabled={invalid >= 0}>
              {t('brief.nav.send')}
            </Button>
          </div>
        </motion.article>

        {/* ───── side rail ───── */}
        <div className="flex min-w-0 flex-col gap-4">
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="glass-accent overflow-hidden rounded-[28px] p-4">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-[16px] font-medium tracking-[-0.015em]">{t('brief.quality.title')}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] opacity-60">{t('brief.quality.live')}</span>
            </div>
            <Gauge
              value={quality.score}
              tone="ink"
              label={t(qualityLabelKey(quality.score))}
              size={250}
              footer={
                <div className="flex items-center justify-between rounded-full bg-white/85 px-4 py-2 text-[12.5px] text-[#0b0b0c] shadow-[inset_0_1px_0_#fff]">
                  <span className="font-medium">{t('brief.quality.tips', { count: quality.tips.length })}</span>
                  <span className="font-mono text-[11.5px] text-black/50">{quality.score}/100</span>
                </div>
              }
            />
          </motion.div>

          <Section title={t('brief.quality.improve')} icon={<Lightbulb />}>
            {quality.tips.length === 0 ? (
              <p className="flex items-center gap-2 text-[13px] text-[color-mix(in_oklab,var(--success)_70%,var(--ink))]">
                <ShieldCheck className="size-4" /> {t('brief.quality.perfect')}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {quality.tips.slice(0, 6).map((tip, i) => (
                  <motion.li key={tip.key} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                    <button type="button" onClick={() => goTo(tip.step)} className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[var(--surface-2)]">
                      <span className="flex h-6 min-w-9 items-center justify-center rounded-full bg-accent-soft px-1.5 font-mono text-[11px] font-semibold text-[var(--accent-text)]">+{tip.points}</span>
                      <span className="min-w-0 flex-1 text-[13px] text-ink-2 group-hover:text-ink">{t(`brief.tip.${tip.key}`)}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t('brief.timeline.title')} hint={designer ? t('brief.timeline.replies', { name: designer.name.split(' ')[0], count: designer.responseTimeHrs }) : undefined} icon={<CalendarRange />}>
            {timeline.length ? (
              <TimelineChart phases={timeline} />
            ) : (
              <p className="text-[13px] text-ink-3">{t('brief.timeline.empty')}</p>
            )}
          </Section>

          <Section title={t('brief.pay.title')} icon={<Lock />}>
            <div className="flex flex-col gap-2">
              {[
                { label: t('brief.pay.kickoff'), amount: Math.round(draft.budget * 0.3), when: t('brief.pay.onAccept') },
                { label: t('brief.pay.final'), amount: Math.round(draft.budget * 0.7), when: draft.dueAt ? shortDate(draft.dueAt, lang) : '—' },
              ].map((m) => (
                <div key={m.label} className="tile flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{m.label}</div>
                    <div className="text-[11.5px] text-ink-3">{m.when}</div>
                  </div>
                  <span className="font-mono text-[14px] font-medium tabular-nums">{money(m.amount)}</span>
                </div>
              ))}
              <p className="mt-1 flex gap-2 text-[12px] leading-relaxed text-ink-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
                {t('brief.pay.note')}
              </p>
            </div>
          </Section>
        </div>
      </div>

      <Modal
        open={tplOpen}
        onClose={() => setTplOpen(false)}
        size="sm"
        title={t('brief.review.saveTpl')}
        description={t('brief.review.saveTplBody')}
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" onClick={() => setTplOpen(false)}>
              {t('brief.common.cancel')}
            </Button>
            <Button
              icon={<BookmarkPlus className="size-4" />}
              onClick={() => {
                const tpl = saveUserTemplate(draft, tplName)
                setTplOpen(false)
                toast({ title: t('brief.review.tplSaved', { name: tpl.name }), description: t('brief.review.tplSavedBody'), tone: 'success' })
              }}
            >
              {t('brief.common.save')}
            </Button>
          </div>
        }
      >
        <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder={t('brief.review.tplPh')} aria-label={t('brief.review.tplPh')} autoFocus />
      </Modal>
    </motion.div>
  )
}

function DocSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  const t = useT()
  return (
    <section className="group py-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] text-ink-3">{title}</h4>
        <motion.button
          type="button"
          onClick={onEdit}
          whileTap={{ scale: 0.94 }}
          className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)] hover:text-ink sm:opacity-60 sm:group-hover:opacity-100"
        >
          <PenLine className="size-3.5" /> {t('brief.common.edit')}
        </motion.button>
      </div>
      {children}
    </section>
  )
}

function StyleSummary() {
  const t = useT()
  const s = useWizard((st) => st.draft.style)
  const empty = !s.palette.length && !s.fonts.length && !s.mood.length && !s.references.length && !s.dos.length && !s.donts.length && !s.notes
  if (empty) return <p className="text-[13px] text-ink-3">{t('brief.review.noStyle')}</p>
  return (
    <div className="flex flex-col gap-3">
      {s.palette.length > 0 && (
        <div className="flex h-12 overflow-hidden rounded-2xl ring-1 ring-line">
          {s.palette.map((c, i) => (
            <motion.div key={`${c}-${i}`} className="group/sw relative flex flex-1 items-end p-1.5" style={{ background: c }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...spring.bouncy, delay: 0.2 + i * 0.05 }}>
              <span className="rounded bg-white/80 px-1 font-mono text-[9.5px] text-black opacity-0 transition-opacity group-hover/sw:opacity-100">{c}</span>
            </motion.div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {s.fonts.map((f) => (
          <span key={f} className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[13px]" style={{ fontFamily: `"${f}", ui-sans-serif` }}>
            {f}
          </span>
        ))}
        {s.mood.map((m) => (
          <Pill key={m} tone="night" size="sm">
            {m}
          </Pill>
        ))}
      </div>
      {(s.dos.length > 0 || s.donts.length > 0) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {s.dos.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-2xl bg-success-soft p-3 text-[12.5px]">
              {s.dos.map((d) => (
                <li key={d} className="flex items-center gap-1.5">
                  <ThumbsUp className="size-3 text-[var(--success)]" /> {d}
                </li>
              ))}
            </ul>
          )}
          {s.donts.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-2xl bg-danger-soft p-3 text-[12.5px]">
              {s.donts.map((d) => (
                <li key={d} className="flex items-center gap-1.5">
                  <ThumbsDown className="size-3 text-danger" /> {d}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {s.references.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {s.references.map((r) => (
            <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12px] font-medium hover:bg-[var(--surface-2)]">
              <Link2 className="size-3" /> {r.label}
            </a>
          ))}
        </div>
      )}
      {s.notes && <p className="whitespace-pre-line rounded-2xl bg-[var(--surface-2)] p-3 text-[13px] text-ink-2">{s.notes}</p>}
    </div>
  )
}

/** Mini Gantt of the phase plan, today → deadline. */
export function TimelineChart({ phases }: { phases: ReturnType<typeof buildTimeline> }) {
  const t = useT()
  const lang = useLang()
  const start = phases[0].start.getTime()
  const end = phases[phases.length - 1].end.getTime()
  const span = Math.max(1, end - start)
  return (
    <div className="flex flex-col gap-2.5">
      {phases.map((p, i) => {
        const left = ((p.start.getTime() - start) / span) * 100
        const width = Math.max(4, ((p.end.getTime() - p.start.getTime()) / span) * 100)
        return (
          <div key={p.key}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="font-medium">{t(`brief.phase.${p.key}`)}</span>
              <span className="font-mono text-[11px] text-ink-3">
                {shortDate(p.start, lang)} – {shortDate(p.end, lang)}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-[var(--surface-2)]">
              <motion.span
                className={cn('absolute inset-y-0 rounded-full', i === phases.length - 1 ? 'bg-ink dark:bg-[var(--on-night)]' : 'bg-accent')}
                style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%`, transformOrigin: 'left' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ ...spring.smooth, delay: 0.2 + i * 0.08 }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

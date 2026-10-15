import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { CalendarClock, Copy, Eye, FilePlus2, History, LayoutTemplate, ListChecks, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { formatMoney } from '@/lib/format'
import { fireConfetti } from '@/lib/confetti'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { disciplineTheme } from '@/theme/disciplines'
import { FolderCard } from '@/components/ui/FolderCard'
import { Button } from '@/components/ui/Button'
import { DisciplineBadge, DisciplineIcon, Pill, StatusBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { MediaView } from '@/components/art/MediaView'
import { ME_CLIENT_ID, type Job } from '@/store/types'
import { Modal } from '@/components/ui/Overlay'
import { GenerativeArt } from '@/components/art/GenerativeArt'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useWizard } from '../draftStore'
import { BASE_HOURS, draftHasContent, emptyDraft, STEP } from '../model'
import { BRIEF_TEMPLATES, jobToDraft, loadUserTemplates, removeUserTemplate, templateToDraft, type BriefTemplate } from '../templates'
import { Section, StepHeader, stepStagger, useBriefDesigner } from '../ui'

/** Paper sheets peeking out of a template folder: cover art, a document, the palette. */
function templatePapers(tpl: BriefTemplate) {
  return [
    <div key="doc" className="flex size-full flex-col gap-[7%] bg-white p-[9%] text-[#0b0b0c] dark:bg-[#202024] dark:text-white">
      <div className="truncate text-[9px] font-semibold leading-tight tracking-[-0.01em]">{tpl.title}</div>
      {tpl.deliverables.slice(0, 4).map((d) => (
        <div key={d} className="flex items-center gap-1">
          <span className="size-1.5 shrink-0 rounded-[2px]" style={{ background: disciplineTheme(tpl.discipline).accent }} />
          <span className="h-[3px] flex-1 rounded-full bg-black/10 dark:bg-white/15" />
        </div>
      ))}
    </div>,
    <div key="pal" className="flex size-full">
      {tpl.style.palette.slice(0, 5).map((c) => (
        <span key={c} className="h-full flex-1" style={{ background: c }} />
      ))}
    </div>,
    <GenerativeArt key="art" seed={tpl.id} variant={tpl.art[0]} discipline={tpl.discipline} className="size-full" playBadge={false} />,
  ]
}

export function StartStep() {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const draft = useWizard((s) => s.draft)
  const set = useWizard((s) => s.set)
  const goTo = useWizard((s) => s.goTo)
  const designer = useBriefDesigner()
  const [confirm, confirmDialog] = useConfirm()
  const [userTpls, setUserTpls] = useState(loadUserTemplates)
  const [preview, setPreview] = useState<BriefTemplate | null>(null)
  const [applied, setApplied] = useState<string | null>(null)

  const rate = designer?.hourlyRate ?? 70

  const apply = async (tpl: BriefTemplate, el?: Element | null) => {
    if (draftHasContent(draft) && draft.templateId !== tpl.id) {
      const ok = await confirm({
        title: t('brief.start.replaceTitle'),
        description: t('brief.start.replaceBody'),
        confirmLabel: t('brief.start.replaceCta'),
      })
      if (!ok) return
    }
    setApplied(tpl.id)
    const base = emptyDraft({ designerId: draft.designerId, assets: draft.assets })
    set(templateToDraft(tpl, base))
    fireConfetti({ from: el ?? undefined, particleCount: 70, spread: 70 })
    toast({ title: t('brief.start.applied', { name: tpl.name }), description: t('brief.start.appliedBody'), tone: 'success', duration: 2600 })
    setPreview(null)
    window.setTimeout(() => goTo(draft.designerId ? STEP.project : STEP.designer), 380)
  }

  const blank = async () => {
    if (draftHasContent(draft)) {
      const ok = await confirm({ title: t('brief.start.blankTitle'), description: t('brief.start.blankBody'), confirmLabel: t('brief.start.blankCta'), tone: 'danger' })
      if (!ok) return
      set(emptyDraft({ designerId: draft.designerId }))
    }
    goTo(draft.designerId ? STEP.project : STEP.designer)
  }

  const all = useMemo(() => [...userTpls, ...BRIEF_TEMPLATES], [userTpls])

  const jobs = useApp((s) => s.jobs)
  const designers = useApp((s) => s.designers)
  const past = useMemo(
    () => jobs.filter((j) => j.clientId === ME_CLIENT_ID && !['declined', 'cancelled'].includes(j.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [jobs],
  )
  const reuse = async (job: Job) => {
    if (draftHasContent(draft)) {
      const ok = await confirm({ title: t('brief.start.replaceTitle'), description: t('brief.start.replaceBody'), confirmLabel: t('brief.start.replaceCta') })
      if (!ok) return
    }
    set(jobToDraft(job, emptyDraft({ assets: draft.assets })))
    toast({ title: t('brief.start.reused', { id: job.id }), description: t('brief.start.reusedBody'), tone: 'success', duration: 2600 })
    window.setTimeout(() => goTo(STEP.project), 320)
  }

  const estimate = (tpl: BriefTemplate) => Math.round((rate * (BASE_HOURS[tpl.discipline] + Math.max(0, tpl.deliverables.length - 3) * 4)) / 50) * 50

  return (
    <motion.div variants={stepStagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
        <StepHeader
          index={STEP.start}
          icon={<LayoutTemplate />}
          title={t('brief.start.title')}
          subtitle={t('brief.start.subtitle')}
          action={
            <Button variant="glass" icon={<FilePlus2 className="size-4" />} onClick={blank}>
              {t('brief.start.blank')}
            </Button>
          }
        />
      </motion.div>

      <Section
        title={t('brief.start.gallery')}
        hint={designer ? t('brief.start.estimateFor', { name: designer.name.split(' ')[0], rate: formatMoney(rate, designer.currency, lang) }) : t('brief.start.estimateHint')}
        icon={<Sparkles />}
        action={<Pill tone="night" size="sm">{t('brief.start.count', { count: all.length })}</Pill>}
      >
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 2xl:grid-cols-4">
          {all.map((tpl, i) => {
            const theme = disciplineTheme(tpl.discipline)
            const active = draft.templateId === tpl.id
            return (
              <motion.div
                key={tpl.id}
                initial={{ opacity: 0, y: 26, scale: 0.94, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                transition={{ ...spring.smooth, delay: 0.08 + i * 0.05 }}
                className="flex min-w-0 flex-col items-center"
              >
                <FolderCard
                  title={tpl.name}
                  subtitle={t('brief.start.meta', { count: tpl.deliverables.length, days: tpl.days })}
                  papers={templatePapers(tpl)}
                  items={[]}
                  color={theme.accent}
                  icon={<DisciplineIcon id={tpl.discipline} size={22} />}
                  selected={active || applied === tpl.id}
                  badge={tpl.custom ? <Pill tone="accent" size="xs">{t('brief.start.mine')}</Pill> : undefined}
                  onClick={() => apply(tpl, document.getElementById(`tpl-${tpl.id}`))}
                  ariaLabel={t('brief.start.useNamed', { name: tpl.name })}
                />
                <div id={`tpl-${tpl.id}`} className="mt-2 flex w-full max-w-[290px] flex-wrap items-center justify-between gap-1.5 px-0.5">
                  <span className="font-mono text-[11.5px] text-ink-3">≈ {formatMoney(estimate(tpl), currency, lang)}</span>
                  <div className="flex items-center gap-1">
                    {tpl.custom && (
                      <button
                        type="button"
                        onClick={() => {
                          removeUserTemplate(tpl.id)
                          setUserTpls(loadUserTemplates())
                          toast({ title: t('brief.start.removed'), tone: 'default', duration: 2000 })
                        }}
                        aria-label={t('brief.common.remove')}
                        className="flex size-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPreview(tpl)}
                      aria-label={t('brief.start.preview')}
                      className="flex size-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-[var(--surface-2)] hover:text-ink"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    <Button size="xs" variant={active ? 'accent' : 'soft'} onClick={() => apply(tpl, document.getElementById(`tpl-${tpl.id}`))}>
                      {active ? t('brief.start.inUse') : t('brief.start.use')}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )
          })}
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.94, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            transition={{ ...spring.smooth, delay: 0.08 + all.length * 0.05 }}
            className="flex min-w-0 flex-col items-center"
          >
            <FolderCard
              title={t('brief.start.blank')}
              subtitle={t('brief.start.blankSub')}
              items={[]}
              color="var(--ink-4)"
              icon={<FilePlus2 className="text-white" />}
              onClick={blank}
            />
            <div className="mt-2 flex w-full max-w-[290px] justify-end px-0.5">
              <Button size="xs" variant="ghost" onClick={blank}>
                {t('brief.start.blankGo')}
              </Button>
            </div>
          </motion.div>
        </div>
      </Section>

      {past.length > 0 && (
        <Section title={t('brief.start.reuse')} hint={t('brief.start.reuseHint')} icon={<History />}>
          <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6">
            {past.map((j, i) => {
              const d = designers.find((x) => x.id === j.designerId)
              return (
                <motion.button
                  key={j.id}
                  type="button"
                  onClick={() => reuse(j)}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring.smooth, delay: 0.1 + i * 0.04 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative w-[220px] shrink-0 snap-start overflow-hidden rounded-[20px] border border-line bg-[var(--surface)] text-left shadow-[0_1px_2px_rgba(0,0,0,.04)] transition-shadow hover:shadow-[0_16px_34px_-18px_rgba(0,0,0,.35)]"
                >
                  <div className="relative h-24 overflow-hidden">
                    <MediaView media={j.cover} className="transition-transform duration-700 group-hover:scale-[1.06]" playBadge={false} />
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 font-mono text-[10.5px] font-medium text-[#0b0b0c]">{j.id}</span>
                    <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                      <Copy className="size-3.5" />
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="line-clamp-2 min-h-[2.5em] text-[13px] font-medium leading-snug">{j.title}</div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-ink-3">
                        {d && <Avatar seed={d.avatarSeed} media={d.avatar} size={18} />}
                        <span className="truncate">{d?.name.split(' ')[0]}</span>
                      </span>
                      <StatusBadge status={j.status} size="xs" />
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </Section>
      )}

      <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { icon: <Wand2 />, title: t('brief.start.why1'), body: t('brief.start.why1Body') },
          { icon: <ListChecks />, title: t('brief.start.why2'), body: t('brief.start.why2Body') },
          { icon: <CalendarClock />, title: t('brief.start.why3'), body: t('brief.start.why3Body') },
        ].map((x) => (
          <div key={x.title} className="glass rounded-[22px] p-4">
            <span className="mb-2 flex size-8 items-center justify-center rounded-xl bg-accent text-accent-ink [&_svg]:size-4">{x.icon}</span>
            <div className="text-[14px] font-medium">{x.title}</div>
            <p className="mt-0.5 text-[12.5px] text-ink-3">{x.body}</p>
          </div>
        ))}
      </motion.div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        size="lg"
        title={preview?.name}
        description={preview ? t('brief.start.meta', { count: preview.deliverables.length, days: preview.days }) : undefined}
        footer={
          preview && (
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setPreview(null)}>
                {t('brief.common.close')}
              </Button>
              <Button icon={<Sparkles className="size-4" />} onClick={() => apply(preview)}>
                {t('brief.start.useThis')}
              </Button>
            </div>
          )
        }
      >
        {preview && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl">
                <GenerativeArt seed={preview.id} variant={preview.art[0]} discipline={preview.discipline} className="size-full" playBadge={false} />
              </div>
              <DisciplineBadge id={preview.discipline} className="self-start" />
              <div className="flex overflow-hidden rounded-xl">
                {preview.style.palette.map((c) => (
                  <span key={c} className="h-8 flex-1" style={{ background: c }} title={c} />
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {preview.style.mood.map((m) => (
                  <Pill key={m} size="xs">
                    {m}
                  </Pill>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <h4 className="text-[18px] font-medium tracking-[-0.02em]">{preview.title}</h4>
              <p className="mt-1 text-[13.5px] text-ink-2">{preview.summary}</p>
              <p className="mt-3 max-h-56 overflow-y-auto whitespace-pre-line rounded-2xl bg-[var(--surface-2)] p-3 text-[13px] leading-relaxed text-ink-2">{preview.description}</p>
              <div className="mt-3 text-[12px] font-medium uppercase tracking-[0.1em] text-ink-3">{t('brief.steps.deliverables')}</div>
              <ul className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {preview.deliverables.map((d) => (
                  <li key={d} className={cn('flex items-center gap-2 text-[13px]')}>
                    <span className="size-1.5 rounded-full bg-accent" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
      {confirmDialog}
    </motion.div>
  )
}

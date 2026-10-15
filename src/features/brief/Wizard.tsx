import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, History, LayoutTemplate, MoreHorizontal, RotateCcw, Save, Send, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_IN_OUT, EASE_OUT, spring } from '@/lib/motion'
import { deleteFile } from '@/lib/files'
import { timeAgo } from '@/lib/dates'
import { nextJobId } from '@/lib/ids'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { ME_CLIENT_ID } from '@/store/types'
import { useIsDark } from '@/theme/ThemeProvider'
import { Stepper } from '@/components/ui/Stepper'
import { Button, IconButton } from '@/components/ui/Button'
import { Kbd } from '@/components/ui/Badge'
import { Menu } from '@/components/ui/Menu'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { clearSavedDraft, readSavedDraft, useWizard, writeSavedDraft } from './draftStore'
import { budgetAdvice, draftHasContent, emptyDraft, firstInvalidStep, STEP, STEP_IDS, stepErrors, stepValid, toJobInput, type BriefDraft } from './model'
import { BRIEF_TEMPLATES, jobToDraft, templateToDraft } from './templates'
import { scopedThemeStyle } from './theme'
import { useBriefDesigner } from './ui'
import { BriefPreview, BriefPreviewToggle, SavedIndicator } from './BriefPreview'
import { SuccessOverlay, type SentInfo } from './SuccessOverlay'
import { StartStep } from './steps/StartStep'
import { DesignerStep } from './steps/DesignerStep'
import { ProjectStep } from './steps/ProjectStep'
import { DeliverablesStep } from './steps/DeliverablesStep'
import { StyleStep } from './steps/StyleStep'
import { AssetsStep } from './steps/AssetsStep'
import { ReviewStep } from './steps/ReviewStep'

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 72, scale: 0.985, filter: 'blur(12px)' }),
  center: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE_OUT } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -48, scale: 0.985, filter: 'blur(8px)', transition: { duration: 0.2, ease: EASE_IN_OUT } }),
}

export function Wizard() {
  const t = useT()
  const lang = useLang()
  const dark = useIsDark()
  const [params] = useSearchParams()
  const designers = useApp((s) => s.designers)
  const settings = useApp((s) => s.settings)
  const createJob = useApp((s) => s.createJob)
  const jobs = useApp((s) => s.jobs)
  const draft = useWizard((s) => s.draft)
  const step = useWizard((s) => s.step)
  const dir = useWizard((s) => s.dir)
  const reached = useWizard((s) => s.reached)
  const pending = useWizard((s) => s.pending)
  const set = useWizard((s) => s.set)
  const goTo = useWizard((s) => s.goTo)
  const touch = useWizard((s) => s.touch)
  const designer = useBriefDesigner()
  const [ready, setReady] = useState(false)
  const [showErrors, setShowErrors] = useState<Record<number, boolean>>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<SentInfo | null>(null)
  const sentRef = useRef(false)
  const nextCtrl = useAnimationControls()
  const rootRef = useRef<HTMLDivElement>(null)
  const [confirm, confirmDialog] = useConfirm()

  const designerParam = params.get('designer')
  const templateParam = params.get('template')
  const fromParam = params.get('from')

  // ── init (once per visit) ──
  const freshDraft = useCallback((): BriefDraft => {
    const d = designerParam ? designers.find((x) => x.id === designerParam) : undefined
    const tab = settings.discipline !== 'all' ? settings.discipline : null
    const discipline = d ? (tab && d.disciplines.includes(tab) ? tab : d.primary) : tab
    return emptyDraft({ designerId: d?.id ?? null, discipline })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designerParam])

  useLayoutEffect(() => {
    const saved = readSavedDraft()
    const pendingDraft = saved && draftHasContent(saved.draft) ? saved : null
    let base = freshDraft()
    let startStep: number = STEP.start
    const tpl = templateParam ? BRIEF_TEMPLATES.find((x) => x.id === templateParam) : undefined
    const fromJob = fromParam ? useApp.getState().jobs.find((j) => j.id === fromParam && j.clientId === ME_CLIENT_ID) : undefined
    if (fromJob) {
      base = jobToDraft(fromJob, base)
      startStep = STEP.project
    } else if (tpl) {
      base = templateToDraft(tpl, base)
      startStep = base.designerId ? STEP.project : STEP.designer
    }
    useWizard.getState().init(base, pendingDraft, startStep)
    sentRef.current = false
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ?template= / ?from= arriving while the wizard is already open (same route)
  const linkKey = `${templateParam ?? ''}|${fromParam ?? ''}`
  const firstLink = useRef(linkKey)
  useEffect(() => {
    if (!ready || linkKey === firstLink.current) return
    firstLink.current = linkKey
    const cur = useWizard.getState().draft
    const fromJob = fromParam ? useApp.getState().jobs.find((j) => j.id === fromParam && j.clientId === ME_CLIENT_ID) : undefined
    const tpl = templateParam ? BRIEF_TEMPLATES.find((x) => x.id === templateParam) : undefined
    if (fromJob) {
      set(jobToDraft(fromJob, emptyDraft({ assets: cur.assets })))
      useWizard.getState().goTo(STEP.project)
    } else if (tpl) {
      set(templateToDraft(tpl, emptyDraft({ designerId: cur.designerId, assets: cur.assets })))
      useWizard.getState().goTo(cur.designerId ? STEP.project : STEP.designer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkKey, ready])

  // a ?designer= change while mounted just swaps the designer
  useEffect(() => {
    if (!ready || !designerParam) return
    const d = designers.find((x) => x.id === designerParam)
    const cur = useWizard.getState().draft
    if (d && cur.designerId !== d.id) set({ designerId: d.id, discipline: cur.discipline ?? d.primary }, { silent: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designerParam])

  // ── autosave ──
  const timer = useRef<number | undefined>(undefined)
  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = undefined
    const s = useWizard.getState()
    if (!s.dirty || s.pending || sentRef.current) return
    s.markSaved(writeSavedDraft(s.draft, s.step))
  }, [])
  useEffect(() => {
    const unsub = useWizard.subscribe((s, prev) => {
      if (!s.dirty || s.pending || sentRef.current) return
      if (s.draft === prev.draft && s.step === prev.step && s.dirty === prev.dirty) return
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, 600)
    })
    window.addEventListener('beforeunload', flush)
    return () => {
      unsub()
      window.removeEventListener('beforeunload', flush)
      if (timer.current) flush()
    }
  }, [flush])

  // ── budget follows the suggestion until the client sets it ──
  const advice = budgetAdvice(draft, designer)
  useEffect(() => {
    if (!ready || draft.budgetTouched || draft.budget === advice.suggested) return
    set({ budget: advice.suggested }, { silent: true })
  }, [ready, draft.budgetTouched, draft.budget, advice.suggested, set])

  // ── scroll to the top of the wizard on step change ──
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const top = (rootRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 16
    if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [step])

  const ctx = { designerExists: !!designer }
  const errors = stepErrors(step, draft, ctx)
  const valid = stepValid(step, draft, ctx)
  const firstError = Object.values(errors)[0]

  const reject = () => {
    setShowErrors((s) => ({ ...s, [step]: true }))
    touch(...Object.keys(errors))
    nextCtrl.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.42 } })
    // bring the first problem into view
    window.setTimeout(() => {
      const el = rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.focus({ preventScroll: true })
    }, 60)
  }

  const next = () => {
    if (step >= STEP.review) return
    if (!valid) return reject()
    goTo(step + 1)
  }
  const back = () => step > 0 && goTo(step - 1)

  const send = async () => {
    const bad = firstInvalidStep(draft, ctx)
    if (bad >= 0) {
      setShowErrors((s) => ({ ...s, [bad]: true }))
      goTo(bad)
      toast({ title: t('brief.review.missing', { step: t(`brief.steps.${STEP_IDS[bad]}`) }), tone: 'error' })
      return
    }
    setSending(true)
    await new Promise((r) => window.setTimeout(r, 450))
    const job = createJob(toJobInput(draft))
    sentRef.current = true
    window.clearTimeout(timer.current)
    clearSavedDraft()
    setSending(false)
    setSent({ jobId: job.id, conversationId: job.conversationId ?? '', designerId: job.designerId, title: job.title, sentAt: job.createdAt })
  }

  const startOver = async () => {
    const ok = await confirm({ title: t('brief.menu.resetTitle'), description: t('brief.menu.resetBody'), confirmLabel: t('brief.menu.reset'), tone: 'danger' })
    if (!ok) return
    for (const a of useWizard.getState().draft.assets) if (a.media.kind === 'file') void deleteFile(a.media.fileId)
    clearSavedDraft()
    useWizard.getState().init(freshDraft(), null)
    setShowErrors({})
    toast({ title: t('brief.menu.resetDone'), duration: 1800 })
  }

  const writeAnother = () => {
    sentRef.current = false
    setSent(null)
    useWizard.getState().init(emptyDraft({ discipline: settings.discipline !== 'all' ? settings.discipline : null }), null)
    setShowErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── keyboard: Enter = next (⌘/Ctrl+Enter works everywhere, also sends) ──
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.defaultPrevented || e.nativeEvent.isComposing || sent) return
    const el = e.target as HTMLElement
    if (!e.currentTarget.contains(el)) return // portaled popovers / dialogs
    const mod = e.metaKey || e.ctrlKey
    if (!mod) {
      if (el.closest('[data-no-enter], [role="dialog"]')) return
      if (el.tagName === 'TEXTAREA' || el.isContentEditable) return
      if (el.closest('button, a, select, [role="button"], [role="radio"], [role="tab"], [role="switch"]')) return
    }
    e.preventDefault()
    if (step === STEP.review) void send()
    else next()
  }

  const completed = useMemo(() => STEP_IDS.map((_, i) => i).filter((i) => i < reached && i !== step && stepValid(i, draft, ctx)), [reached, step, draft, ctx.designerExists])
  const onStepClick = (i: number) => {
    if (i <= step) return goTo(i)
    const bad = firstInvalidStep(draft, ctx, i)
    if (bad >= 0 && bad < i) {
      goTo(bad)
      setShowErrors((s) => ({ ...s, [bad]: true }))
      return
    }
    goTo(i)
  }

  const themeStyle = settings.accentMode === 'discipline' ? scopedThemeStyle(draft.discipline, dark) : undefined
  const nextId = useMemo(() => nextJobId(jobs.map((j) => j.id)), [jobs])

  if (!ready) return null

  const content = (() => {
    switch (step) {
      case STEP.start:
        return <StartStep />
      case STEP.designer:
        return <DesignerStep showErrors={!!showErrors[step]} onNext={() => useWizard.getState().goTo(STEP.project)} />
      case STEP.project:
        return <ProjectStep showErrors={!!showErrors[step]} errors={errors} />
      case STEP.deliverables:
        return <DeliverablesStep showErrors={!!showErrors[step]} />
      case STEP.style:
        return <StyleStep />
      case STEP.assets:
        return <AssetsStep />
      default:
        return <ReviewStep onSend={send} sending={sending} />
    }
  })()

  return (
    <div ref={rootRef} style={themeStyle} onKeyDown={onKeyDown} className={cn('grid grid-cols-1 items-start gap-4', step !== STEP.review && 'xl:grid-cols-[minmax(0,1fr)_minmax(320px,370px)]')}>
      <div className="flex min-w-0 flex-col gap-4">
        {/* restore banner */}
        <AnimatePresence initial={false}>
          {pending && (
            <motion.div
              key="restore"
              initial={{ opacity: 0, y: -16, scale: 0.97, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, scale: 0.97, filter: 'blur(8px)', transition: { duration: 0.2 } }}
              transition={spring.smooth}
              className="glass-accent flex flex-wrap items-center gap-3 rounded-[24px] p-3 pl-4"
              role="status"
            >
              <motion.span animate={{ rotate: [0, -25, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }} className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-ink)] text-accent">
                <History className="size-5" />
              </motion.span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium tracking-[-0.01em]">{t('brief.restore.title')}</div>
                <div className="truncate text-[12.5px] opacity-75">
                  “{pending.draft.title || t('brief.preview.untitled')}” · {t('brief.restore.meta', { ago: timeAgo(pending.savedAt, lang), n: Math.min(pending.step + 1, STEP_IDS.length), total: STEP_IDS.length })}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[var(--accent-ink)] hover:bg-black/10"
                  icon={<Trash2 className="size-4" />}
                  onClick={() => {
                    const cur = useWizard.getState().draft
                    const keep = new Set(cur.assets.map((a) => a.id))
                    for (const a of pending.draft.assets) if (a.media.kind === 'file' && !keep.has(a.id)) void deleteFile(a.media.fileId)
                    clearSavedDraft()
                    useWizard.getState().discardPending()
                    flush()
                  }}
                >
                  {t('brief.restore.discard')}
                </Button>
                <Button size="sm" icon={<RotateCcw className="size-4" />} onClick={() => useWizard.getState().restore()}>
                  {t('brief.restore.continue')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* header + stepper */}
        <div className="card relative p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="rounded-full bg-ink px-2.5 py-1 font-mono text-[11.5px] font-medium text-[var(--surface)] dark:bg-accent dark:text-accent-ink">{nextId}</span>
              <span className="truncate text-[13.5px] text-ink-2">{designer ? t('brief.header.for', { name: designer.name }) : t('brief.header.new')}</span>
            </div>
            <div className="flex items-center gap-1">
              <SavedIndicator className="hidden sm:inline-flex" />
              <Menu
                align="end"
                width={240}
                trigger={({ onClick }) => (
                  <IconButton label={t('brief.menu.more')} variant="ghost" size="sm" onClick={onClick}>
                    <MoreHorizontal className="size-4" />
                  </IconButton>
                )}
                items={[
                  { label: t('brief.menu.templates'), icon: <LayoutTemplate className="size-4" />, onClick: () => goTo(STEP.start) },
                  {
                    label: t('brief.menu.saveNow'),
                    icon: <Save className="size-4" />,
                    disabled: !!pending,
                    onClick: () => {
                      const s = useWizard.getState()
                      s.markSaved(writeSavedDraft(s.draft, s.step))
                      toast({ title: t('brief.menu.savedNow'), tone: 'success', duration: 1600 })
                    },
                  },
                  { divider: true, label: '' },
                  { label: t('brief.menu.reset'), icon: <Trash2 className="size-4" />, danger: true, onClick: startOver },
                ]}
              />
            </div>
          </div>
          <Stepper
            steps={STEP_IDS.map((id) => ({ id, label: t(`brief.steps.${id}`) }))}
            current={step}
            completed={completed}
            onStepClick={onStepClick}
            freeNavigation
          />
        </div>

        {step !== STEP.review && <BriefPreviewToggle />}

        {/* step content */}
        <div className="-mx-2.5 overflow-x-clip px-2.5 sm:-mx-3 sm:px-3">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
              {content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* sticky navigation */}
        <div className="sticky bottom-[5.6rem] z-20 lg:bottom-4">
          <div className="glass glass-strong glass-pill flex items-center gap-2 p-1.5">
            <AnimatePresence initial={false} mode="popLayout">
              {step > 0 && (
                <motion.div key="back" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={spring.snappy}>
                  <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={back} className="px-3 sm:px-5">
                    <span className="hidden sm:inline">{t('brief.nav.back')}</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="min-w-0 flex-1 px-1 text-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={`${step}-${firstError ?? 'ok'}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className={cn('truncate text-[12.5px]', firstError && showErrors[step] ? 'text-danger' : 'text-ink-3')}
                >
                  {firstError ? (
                    t(firstError)
                  ) : (
                    <span className="hidden items-center justify-center gap-1.5 sm:inline-flex">
                      {step === STEP.review ? t('brief.nav.sendHint') : t('brief.nav.enterHint')}
                      <Kbd className="bg-[var(--surface-2)] text-ink-2">↵</Kbd>
                    </span>
                  )}
                </motion.p>
              </AnimatePresence>
            </div>
            <motion.div animate={nextCtrl}>
              {step === STEP.review ? (
                <Button icon={<Send className="size-4" />} onClick={() => void send()} loading={sending} className={cn(firstInvalidStep(draft, ctx) >= 0 && 'opacity-50')}>
                  {t('brief.nav.send')}
                </Button>
              ) : (
                <Button
                  iconRight={<ArrowRight className="size-4" />}
                  onClick={next}
                  aria-disabled={!valid}
                  className={cn(!valid && 'opacity-45 hover:bg-ink')}
                >
                  {step === STEP.start ? (draft.templateId ? t('brief.nav.continue') : t('brief.nav.skip')) : t('brief.nav.next')}
                </Button>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {step !== STEP.review && (
        <aside className="no-scrollbar hidden min-w-0 xl:sticky xl:top-4 xl:block xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto xl:rounded-[28px]">
          <BriefPreview />
        </aside>
      )}

      <SuccessOverlay sent={sent} onAnother={writeAnother} themeStyle={themeStyle} discipline={draft.discipline} />
      {confirmDialog}
    </div>
  )
}

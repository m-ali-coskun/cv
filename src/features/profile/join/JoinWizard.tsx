import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { ArrowLeft, ArrowRight, Eye, Loader2, Rocket, RotateCcw, Wand2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_IN_OUT, EASE_OUT, spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { Designer } from '@/store/types'
import { Glass } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { Stepper } from '@/components/ui/Stepper'
import { Drawer } from '@/components/ui/Overlay'
import { ProgressBar } from '@/components/ui/Progress'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { personOf } from '@/features/discover/model'
import { designerStrength } from '../shared/data'
import { DiscoverCardPreview } from '../shared/DiscoverPreview'
import { BasicsStep, CraftStep, PreviewStep, StoryStep, WelcomeStep, WorkStep } from './steps'
import { Success } from './Success'
import { STEPS, clearDraft, draftHasContent, draftToDesigner, draftToInput, emptyDraft, loadDraft, personaDraft, saveDraft, stepErrors, stepValid, type JoinDraft } from './model'

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 80, scale: 0.98, filter: 'blur(12px)' }),
  center: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE_OUT } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -56, scale: 0.98, filter: 'blur(8px)', transition: { duration: 0.2, ease: EASE_IN_OUT } }),
}

const PUBLISH_STAGES = ['profile', 'work', 'discover'] as const

/**
 * /join — another person registers as a designer. Six steps with direction-
 * aware transitions, inline validation, a live Discover-card preview, draft
 * autosave (per browser) and a confetti success screen.
 */
export function JoinWizard() {
  const t = useT()
  const register = useApp((s) => s.registerDesigner)
  const [init] = useState(() => loadDraft())
  const [d, setD] = useState<JoinDraft>(() => init?.draft ?? emptyDraft())
  const [step, setStep] = useState(() => init?.step ?? 0)
  const [dir, setDir] = useState(1)
  const [reached, setReached] = useState(() => init?.step ?? 0)
  const [shown, setShown] = useState<Record<number, boolean>>({})
  const [personaN, setPersonaN] = useState(0)
  const [publishing, setPublishing] = useState<number | null>(null)
  const [created, setCreated] = useState<Designer | null>(null)
  const [peek, setPeek] = useState(false)
  const [joinedAt] = useState(() => new Date().toISOString())
  const nextCtrl = useAnimationControls()
  const top = useRef<HTMLDivElement>(null)
  const [confirm, confirmDialog] = useConfirm()

  const id = STEPS[step]
  const errors = useMemo(() => stepErrors(id, d), [id, d])
  const set = (patch: Partial<JoinDraft>) => setD((p) => ({ ...p, ...patch }))

  // resume toast (once, even under StrictMode's double effects)
  const resumed = useRef(false)
  useEffect(() => {
    if (resumed.current) return
    resumed.current = true
    if (init && draftHasContent(init.draft) && init.step > 0)
      toast({ title: t('profile.join.resumed'), description: t('profile.join.resumedHint'), tone: 'info', action: { label: t('profile.join.startOver'), onClick: () => reset() } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // autosave draft (debounced)
  useEffect(() => {
    if (created) return
    const h = window.setTimeout(() => saveDraft(d, step), 400)
    return () => window.clearTimeout(h)
  }, [d, step, created])

  const scrollTop = () => {
    const el = top.current
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - 16
    if (window.scrollY > y) window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
  }

  const goTo = (i: number) => {
    if (i === step) return
    setDir(i > step ? 1 : -1)
    setStep(i)
    setReached((r) => Math.max(r, i))
    scrollTop()
  }

  const next = () => {
    if (!stepValid(id, d)) {
      setShown((s) => ({ ...s, [step]: true }))
      nextCtrl.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.45 } })
      window.setTimeout(() => {
        const first = top.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 60)
      return
    }
    if (id === 'preview') return publish()
    goTo(step + 1)
  }

  const back = () => step > 0 && goTo(step - 1)

  const reset = () => {
    clearDraft()
    setD(emptyDraft())
    setShown({})
    setCreated(null)
    setPublishing(null)
    setReached(0)
    setDir(-1)
    setStep(0)
    scrollTop()
  }

  const askReset = async () => {
    if (!draftHasContent(d)) return reset()
    const ok = await confirm({ title: t('profile.join.resetTitle'), description: t('profile.join.resetText'), tone: 'danger', confirmLabel: t('profile.join.startOver') })
    if (ok) reset()
  }

  const sample = () => {
    const p = personaDraft(personaN)
    setPersonaN((n) => n + 1)
    setD(p)
    setShown({})
    setReached(STEPS.length - 1)
    toast({ title: t('profile.join.sampled', { name: p.name }), description: t('profile.join.sampledHint'), tone: 'success' })
    if (step === 0) goTo(1)
  }

  const publish = () => {
    setPublishing(0)
    PUBLISH_STAGES.forEach((_, i) => window.setTimeout(() => setPublishing(i), i * 520))
    window.setTimeout(() => {
      const taken = useApp.getState().designers.map((x) => x.handle)
      const designer = register(draftToInput(d, taken))
      clearDraft()
      setPublishing(null)
      setCreated(designer)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, PUBLISH_STAGES.length * 520 + 300)
  }

  const preview = useMemo(() => draftToDesigner(d, joinedAt), [d, joinedAt])
  const completeness = useMemo(() => designerStrength(preview).score, [preview])

  if (created) return <Success designer={created} onAnother={reset} />

  const completed = STEPS.map((_, i) => i).filter((i) => i < reached && (i === 0 || stepValid(STEPS[i], d)))
  const steps = STEPS.map((s) => ({ id: s, label: t(`profile.join.steps.${s}`) }))
  const showSide = id !== 'welcome' && id !== 'preview'

  return (
    <div ref={top} className="relative">
      <Glass className="relative overflow-clip p-0">
        {/* ambient */}
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-40 size-[520px] rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-32 size-[460px] rounded-full bg-[radial-gradient(closest-side,var(--accent-softer),transparent)] blur-2xl" />

        {/* header */}
        <div className="relative z-[2] flex flex-col gap-4 border-b border-line px-4 py-4 sm:px-7 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] text-ink-3">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
              {t('profile.join.header')}
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="xs" variant="ghost" icon={<Wand2 className="size-3.5" />} onClick={sample}>
                <span className="hidden sm:inline">{t('profile.join.sample')}</span>
                <span className="sm:hidden">{t('profile.join.sampleShort')}</span>
              </Button>
              {draftHasContent(d) && (
                <Button size="xs" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={askReset}>
                  {t('profile.join.startOver')}
                </Button>
              )}
            </div>
          </div>
          <Stepper steps={steps} current={step} completed={completed} onStepClick={(i) => (i <= reached ? goTo(i) : undefined)} />
        </div>

        {/* body */}
        <div className={cn('relative z-[1] grid gap-8 px-4 py-6 sm:px-7 sm:py-8', showSide && 'lg:grid-cols-[minmax(0,1fr)_360px]')}>
          <div className="min-w-0">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div key={id} custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
                {id === 'welcome' && <WelcomeStep onStart={() => goTo(1)} onSample={sample} />}
                {id === 'basics' && <BasicsStep d={d} set={set} errors={errors} show={!!shown[step]} />}
                {id === 'craft' && <CraftStep d={d} set={set} errors={errors} show={!!shown[step]} />}
                {id === 'story' && <StoryStep d={d} set={set} errors={errors} show={!!shown[step]} />}
                {id === 'work' && <WorkStep d={d} set={set} errors={errors} show={!!shown[step]} />}
                {id === 'preview' && <PreviewStep d={d} set={set} errors={errors} show={!!shown[step]} goTo={goTo} joinedAt={joinedAt} />}
              </motion.div>
            </AnimatePresence>
          </div>
          {showSide && (
            <aside className="hidden lg:block">
              <motion.div className="sticky top-4 space-y-4" initial={{ opacity: 0, x: 24, filter: 'blur(8px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}>
                <DiscoverCardPreview person={personOf(preview)} controls={false} />
                <div className="rounded-[20px] bg-[var(--surface-2)]/70 p-4">
                  <div className="mb-2 flex items-center justify-between text-[12.5px]">
                    <span className="text-ink-2">{t('profile.join.completeness')}</span>
                    <span className="font-mono font-medium">{completeness}%</span>
                  </div>
                  <ProgressBar value={completeness} tone="accent" height={8} />
                  <p className="mt-2 text-[12px] text-ink-3">{t('profile.join.completenessHint')}</p>
                </div>
              </motion.div>
            </aside>
          )}
        </div>

        {/* footer */}
        {id !== 'welcome' && (
          <div className="sticky bottom-[88px] z-[3] lg:bottom-4">
            <div className="mx-3 mb-3 flex items-center gap-2 rounded-full border border-line bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] p-1.5 shadow-[0_18px_40px_-20px_rgba(0,0,0,.45)] backdrop-blur-xl sm:mx-6 sm:mb-6">
              <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={back}>
                <span className="hidden sm:inline">{t('core.action.back')}</span>
              </Button>
              <div className="min-w-0 flex-1 truncate text-center font-mono text-[11.5px] text-ink-3 max-sm:invisible">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="inline-block">
                    {t('profile.join.stepOf', { n: step + 1, total: STEPS.length })}
                  </motion.span>
                </AnimatePresence>
              </div>
              {showSide && (
                <Button variant="glass" size="sm" className="lg:hidden" icon={<Eye className="size-4" />} onClick={() => setPeek(true)} aria-label={t('profile.join.peek')}>
                  <span className="hidden sm:inline">{t('profile.join.peek')}</span>
                </Button>
              )}
              <motion.div animate={nextCtrl}>
                {id === 'preview' ? (
                  <Button variant="accent" className="h-11 px-5" icon={<Rocket className="size-4" />} onClick={next} loading={publishing !== null}>
                    {t('profile.join.publish')}
                  </Button>
                ) : (
                  <Button className="h-11 px-5" iconRight={<ArrowRight className="size-4" />} onClick={next}>
                    {t('core.action.continue')}
                  </Button>
                )}
              </motion.div>
            </div>
          </div>
        )}

        {/* publishing overlay */}
        <AnimatePresence>
          {publishing !== null && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[10] flex items-center justify-center bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] backdrop-blur-md">
              <motion.div initial={{ scale: 0.9, y: 20, filter: 'blur(8px)' }} animate={{ scale: 1, y: 0, filter: 'blur(0px)' }} transition={spring.bouncy} className="glass-night w-[min(360px,90%)] rounded-[28px] p-6">
                <div className="flex items-center gap-3">
                  <motion.span className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-ink" animate={{ y: [0, -6, 0], rotate: [0, -8, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                    <Rocket className="size-5" />
                  </motion.span>
                  <div className="text-[16px] font-medium">{t('profile.join.publishing')}</div>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {PUBLISH_STAGES.map((s, i) => (
                    <li key={s} className={cn('flex items-center gap-2.5 text-[13.5px] transition-colors', i <= publishing ? 'text-white' : 'text-white/40')}>
                      <span className="flex size-5 items-center justify-center">
                        {i < publishing ? (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} className="size-2.5 rounded-full bg-accent" />
                        ) : i === publishing ? (
                          <Loader2 className="size-4 animate-spin text-accent" />
                        ) : (
                          <span className="size-2 rounded-full bg-white/25" />
                        )}
                      </span>
                      {t(`profile.join.stage.${s}`)}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Glass>

      {/* phone peek at the live card */}
      <Drawer open={peek} onClose={() => setPeek(false)} side="bottom" title={t('profile.join.peek')}>
        <div className="px-5 pb-10 pt-1">
          <DiscoverCardPreview person={personOf(preview)} />
        </div>
      </Drawer>
      {confirmDialog}
    </div>
  )
}

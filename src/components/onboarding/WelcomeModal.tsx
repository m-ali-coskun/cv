import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_IOS, EASE_OUT, spring } from '@/lib/motion'
import { fireConfetti, fireSideCannons } from '@/lib/confetti'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { useUI } from '@/store/ui'
import { Modal } from '../ui/Overlay'
import { Button } from '../ui/Button'
import { LogoMark } from '../layout/Logo'
import { DisciplinesSlide, HeroSlide, HowSlide, RoleSlide } from './slides'

export { openWelcomeTour } from './openWelcome'

const SLIDES = [HeroSlide, HowSlide, DisciplinesSlide, RoleSlide]
const KEYS = ['hero', 'how', 'disc', 'role'] as const

/**
 * First-visit welcome tour: a liquid-glass slide deck (bottom sheet on
 * phones) explaining what designTab is, how the loop works, how discipline
 * tabs re-theme the app, and letting the visitor pick a workspace.
 */
export function WelcomeModal() {
  const open = useUI((s) => s.welcomeOpen)
  const skip = useCallback(() => {
    useApp.getState().completeOnboarding()
    useUI.getState().set({ welcomeOpen: false })
  }, [])
  return (
    <Modal open={open} onClose={skip} size="lg" bare dismissable={false} className="sm:max-w-[820px]">
      <Deck onSkip={skip} />
    </Modal>
  )
}

function Deck({ onSkip }: { onSkip: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const role = useApp((s) => s.settings.role)
  const [[index, dir], setState] = useState<[number, number]>([0, 1])
  const last = index === SLIDES.length - 1
  const Slide = SLIDES[index]!
  const rootRef = useRef<HTMLDivElement>(null)

  // the sheet scrolls on phones — start every slide at the top
  useEffect(() => {
    rootRef.current?.parentElement?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [index])

  const goTo = useCallback((i: number) => {
    setState(([cur]) => {
      const next = Math.max(0, Math.min(SLIDES.length - 1, i))
      return next === cur ? [cur, 1] : [next, next > cur ? 1 : -1]
    })
  }, [])

  const finish = useCallback(() => {
    const r = useApp.getState().settings.role
    useApp.getState().completeOnboarding()
    useUI.getState().set({ welcomeOpen: false })
    navigate('/overview')
    window.setTimeout(() => {
      fireConfetti({ particleCount: 220, origin: { x: 0.5, y: 0.55 } })
      fireSideCannons(900)
    }, 260)
    toast({ title: t('onboarding.done.title'), description: t(`onboarding.done.${r}`), tone: 'success' })
  }, [navigate, t])

  const next = useCallback(() => (last ? finish() : goTo(index + 1)), [last, finish, goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prev()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onSkip()
      } else if (e.key === 'Enter' && !el?.closest('button, a, [role="button"]')) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onSkip])

  return (
    <div ref={rootRef} className="relative flex flex-col">
      {/* header */}
      <div className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-[var(--line-2)] sm:hidden" aria-hidden />
      <div className="flex items-center gap-3 px-5 pt-3 sm:px-7 sm:pt-6">
        <LogoMark size={30} />
        <span className="text-[15px] font-semibold tracking-[-0.04em] text-ink">designTab</span>
        <span className="font-mono text-[11.5px] text-ink-3">
          {String(index + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {!last && (
            <button type="button" onClick={onSkip} className="rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)] hover:text-ink">
              {t('onboarding.skip')}
            </button>
          )}
          <button
            type="button"
            onClick={onSkip}
            aria-label={t('core.action.close')}
            className="flex size-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-2 transition-colors hover:bg-[var(--surface-3)] hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* story-style progress */}
      <div className="mt-3 flex gap-1.5 px-5 sm:px-7" aria-hidden>
        {SLIDES.map((_, i) => (
          <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <motion.span
              className="block h-full origin-left rounded-full bg-accent"
              initial={false}
              animate={{ scaleX: i <= index ? 1 : 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            />
          </span>
        ))}
      </div>

      {/* slides */}
      <div className="relative overflow-hidden px-5 pb-4 pt-5 sm:min-h-[490px] sm:px-7">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={index}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 70, filter: 'blur(10px)', scale: 0.98 }),
              center: { opacity: 1, x: 0, filter: 'blur(0px)', scale: 1, transition: { duration: 0.5, ease: EASE_OUT } },
              exit: (d: number) => ({ opacity: 0, x: d * -50, filter: 'blur(8px)', transition: { duration: 0.2, ease: EASE_IOS } }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70 || info.velocity.x < -500) next()
              else if (info.offset.x > 70 || info.velocity.x > 500) prev()
            }}
            className="touch-pan-y"
          >
            <Slide />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* footer */}
      <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-line bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] px-5 py-3.5 backdrop-blur-xl safe-bottom sm:px-7">
        <div className="flex-1">
          <AnimatePresence initial={false}>
            {index > 0 && (
              <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="inline-flex">
                <Button variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} onClick={prev} aria-label={t('core.action.back')} className="px-2.5 sm:px-3.5">
                  <span className="hidden sm:inline">{t('core.action.back')}</span>
                </Button>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1.5" role="tablist" aria-label={t('onboarding.progress')}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={t(`onboarding.step.${KEYS[i]}`)}
              title={t(`onboarding.step.${KEYS[i]}`)}
              onClick={() => goTo(i)}
              className="relative flex h-5 items-center justify-center"
            >
              <motion.span
                className={cn('block h-2 rounded-full', i === index ? 'bg-ink dark:bg-accent' : 'bg-[var(--line-2)] hover:bg-ink-4')}
                animate={{ width: i === index ? 22 : 8 }}
                transition={spring.snappy}
              />
            </button>
          ))}
        </div>
        <div className="flex flex-1 justify-end">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={last ? 'finish' : 'next'}
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)', transition: { duration: 0.12 } }}
              transition={spring.snappy}
              className="inline-flex"
            >
              {last ? (
                <Button variant="accent" icon={<Sparkles className="size-4" />} onClick={finish} className="relative z-[1]">
                  {t(role === 'client' ? 'onboarding.finishClient' : 'onboarding.finishDesigner')}
                </Button>
              ) : (
                <Button iconRight={<ArrowRight className="size-4" />} onClick={next} autoFocus>
                  {index === 0 ? t('onboarding.start') : t('core.action.next')}
                </Button>
              )}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

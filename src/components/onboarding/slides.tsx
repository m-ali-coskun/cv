import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  FolderOpen,
  Heart,
  HeartHandshake,
  Inbox,
  MessagesSquare,
  Pause,
  PenTool,
  Play,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { LANGUAGES, useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { ME_CLIENT_ID, ME_DESIGNER_ID, ME_NAME, type Role } from '@/store/types'
import { DISCIPLINE_LIST, DISCIPLINE_ONLY } from '@/theme/disciplines'
import { useIsDark } from '@/theme/ThemeProvider'
import { Avatar } from '../ui/Avatar'
import { DisciplineIcon } from '../ui/Badge'
import { LogoMark } from '../layout/Logo'
import { ThemeMock } from '@/features/settings/lib/ThemeMock'

// ───────────────────────────── shared ─────────────────────────────

function SlideTitle({ kicker, title, body }: { kicker: string; title: string; body?: ReactNode }) {
  const words = title.split(' ')
  return (
    <div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-accent-text"
      >
        {kicker}
      </motion.p>
      <h2 className="mt-1.5 text-[26px] font-medium leading-[1.08] tracking-[-0.035em] text-ink sm:text-[34px]">
        {words.map((w, i) => (
          <Fragment key={i}>
            <motion.span
              className="inline-block"
              initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.55, delay: 0.06 + i * 0.045, ease: EASE_OUT }}
            >
              {w}
            </motion.span>{' '}
          </Fragment>
        ))}
      </h2>
      {body && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT }}
          className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-ink-2 sm:text-[15px]"
        >
          {body}
        </motion.p>
      )}
    </div>
  )
}

// ───────────────────────────── 1 · hero ─────────────────────────────

/** Discipline app-icons orbiting the logo on a tilted ellipse (depth via scale/zIndex). */
function Orbit() {
  const N = 24
  return (
    <>
      {DISCIPLINE_ONLY.map((d, idx) => {
        const phase = (idx / DISCIPLINE_ONLY.length) * Math.PI * 2
        const xs: number[] = []
        const ys: number[] = []
        const ss: number[] = []
        const zs: number[] = []
        const os: number[] = []
        for (let k = 0; k <= N; k++) {
          const a = phase + (k / N) * Math.PI * 2
          const depth = Math.sin(a)
          xs.push(Math.cos(a) * 150)
          ys.push(depth * 46)
          ss.push(0.72 + (depth + 1) * 0.2)
          zs.push(depth > 0 ? 3 : 1)
          os.push(0.55 + (depth + 1) * 0.225)
        }
        return (
          <motion.span
            key={d.id}
            className="absolute left-1/2 top-1/2 -ml-[17px] -mt-[17px]"
            animate={{ x: xs, y: ys, scale: ss, zIndex: zs, opacity: os }}
            transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
          >
            <DisciplineIcon id={d.id} size={34} />
          </motion.span>
        )
      })}
    </>
  )
}

function FloatChip({ children, className, delay, float = 5 }: { children: ReactNode; className?: string; delay: number; float?: number }) {
  return (
    <motion.div
      className={cn('absolute z-[4]', className)}
      initial={{ opacity: 0, scale: 0.6, filter: 'blur(6px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ ...spring.bouncy, delay }}
    >
      <motion.div
        animate={{ y: [0, -float, 0] }}
        transition={{ duration: 3.2 + delay, repeat: Infinity, ease: 'easeInOut' }}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1.5 text-[11.5px] font-medium text-white shadow-[0_10px_30px_-12px_rgba(0,0,0,.6)] backdrop-blur-md"
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function HeroStage() {
  const t = useT()
  return (
    <div className="glass-night relative h-[188px] overflow-hidden rounded-[26px] sm:h-[220px]">
      <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:16px_16px]" />
      <motion.span
        aria-hidden
        className="absolute -left-10 -top-16 size-60 rounded-full bg-accent opacity-35 blur-3xl"
        animate={{ x: [0, 60, 0], y: [0, 30, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        aria-hidden
        className="absolute -bottom-20 right-0 size-64 rounded-full opacity-30 blur-3xl"
        style={{ background: 'var(--glow-1)' }}
        animate={{ x: [0, -50, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 origin-center scale-[0.78] sm:scale-100">
        <Orbit />
        <div className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2">
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-[24px] border border-[var(--accent)]"
              animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 1.2, ease: 'easeOut' }}
            />
          ))}
          <motion.div initial={{ scale: 0.3, rotate: -40, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ ...spring.wobbly, delay: 0.1 }}>
            <LogoMark size={84} />
          </motion.div>
        </div>
      </div>
      <FloatChip className="left-3 top-3 sm:left-5 sm:top-5" delay={0.5}>
        <Heart className="size-3.5 fill-[#FF3B6B] text-[#FF3B6B]" /> {t('onboarding.hero.chipMatch')}
      </FloatChip>
      <FloatChip className="right-3 top-3 hidden sm:right-5 sm:top-5 sm:block" delay={0.7} float={7}>
        <span className="font-mono text-white/70">DT-2841</span> {t('onboarding.hero.chipDelivered')}
      </FloatChip>
      <FloatChip className="bottom-3 left-3 hidden sm:bottom-5 sm:left-5 sm:block" delay={0.9} float={6}>
        <CheckCircle2 className="size-3.5 text-accent" /> {t('onboarding.hero.chipBrief')}
      </FloatChip>
      <FloatChip className="bottom-3 right-3 sm:bottom-5 sm:right-5" delay={1.1}>
        <Wallet className="size-3.5 text-accent" /> <span className="font-mono">€1,300</span> {t('onboarding.hero.chipPaid')}
      </FloatChip>
    </div>
  )
}

export function HeroSlide() {
  const t = useT()
  const lang = useLang()
  const setLang = useApp((s) => s.setLang)
  return (
    <div className="flex flex-col gap-5">
      <HeroStage />
      <SlideTitle kicker={t('onboarding.hero.kicker')} title={t('onboarding.hero.title', { name: ME_NAME })} body={t('onboarding.hero.body')} />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: EASE_OUT }}
        className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-[12.5px] text-ink-3">{t('onboarding.hero.language')}</p>
        <div className="inline-flex gap-1 self-start rounded-full bg-[var(--surface-2)] p-1" role="radiogroup">
          {LANGUAGES.map((l) => {
            const on = l.id === lang
            return (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setLang(l.id)}
                className={cn('relative flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors', on ? 'text-[var(--surface)] dark:text-ink' : 'text-ink-2 hover:text-ink')}
              >
                {on && <motion.span layoutId="welcome-lang" className="absolute inset-0 rounded-full bg-ink dark:bg-[var(--surface-3)]" transition={spring.pill} />}
                <span className="relative text-[15px] leading-none">{l.flag}</span>
                <span className="relative">{l.native}</span>
              </button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

// ───────────────────────────── 2 · how it works ─────────────────────────────

const LOOP = { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } as const

function MatchIllus() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <motion.span className="absolute" animate={{ x: [-46, -17, -17, -46] }} transition={{ ...LOOP, times: [0, 0.35, 0.75, 1] }}>
        <Avatar seed="ali" size={36} ring />
      </motion.span>
      <motion.span className="absolute" animate={{ x: [46, 17, 17, 46] }} transition={{ ...LOOP, times: [0, 0.35, 0.75, 1] }}>
        <Avatar seed="maya-chen" size={36} ring />
      </motion.span>
      <motion.span
        className="absolute z-[2] -mt-10 flex size-7 items-center justify-center rounded-full bg-[#FF3B6B] text-white shadow-[0_6px_16px_-4px_#FF3B6B]"
        animate={{ scale: [0, 0, 1.35, 1, 0], y: [6, 6, -4, 0, -8] }}
        transition={{ ...LOOP, times: [0, 0.33, 0.45, 0.7, 1] }}
      >
        <Heart className="size-3.5 fill-white" />
      </motion.span>
    </div>
  )
}

function BriefIllus() {
  return (
    <div className="relative flex h-full items-center justify-center gap-2">
      <div className="relative h-[66px] w-[58px] rounded-[10px] bg-[var(--surface)] p-2 shadow-[0_6px_16px_-8px_rgba(0,0,0,.3)]">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="mb-1.5 block h-1.5 origin-left rounded-full bg-ink-4"
            style={{ width: `${90 - i * 22}%` }}
            animate={{ scaleX: [0, 1, 1, 0] }}
            transition={{ ...LOOP, times: [0, 0.25 + i * 0.1, 0.85, 1] }}
          />
        ))}
        <div className="mt-2 flex gap-1">
          {['#FF9A00', '#31A8FF', 'var(--accent)'].map((c, i) => (
            <motion.span key={c} className="size-2.5 rounded-full" style={{ background: c }} animate={{ scale: [0, 0, 1.3, 1, 1, 0] }} transition={{ ...LOOP, times: [0, 0.4 + i * 0.06, 0.55 + i * 0.06, 0.65, 0.88, 1] }} />
          ))}
        </div>
      </div>
      <motion.span
        className="flex h-6 items-center gap-1 rounded-full bg-ink px-2 font-mono text-[10px] text-[var(--surface)]"
        animate={{ x: [24, 0, 0, 24], opacity: [0, 1, 1, 0] }}
        transition={{ ...LOOP, times: [0.1, 0.35, 0.85, 1] }}
      >
        <CalendarDays className="size-3" /> Oct 24
      </motion.span>
    </div>
  )
}

function CreateIllus() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-2.5 px-4">
      <svg viewBox="0 0 120 40" className="h-9 w-full overflow-visible">
        <motion.path
          d="M4 30 C 20 4, 34 4, 44 20 S 70 38, 82 18 S 106 6, 116 14"
          fill="none"
          stroke="var(--accent)"
          strokeWidth={5}
          strokeLinecap="round"
          animate={{ pathLength: [0, 1, 1, 0] }}
          transition={{ ...LOOP, times: [0, 0.6, 0.85, 1] }}
        />
      </svg>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
        <motion.span className="block h-full origin-left rounded-full bg-ink" animate={{ scaleX: [0.1, 0.78, 0.78, 0.1] }} transition={{ ...LOOP, times: [0, 0.6, 0.85, 1] }} />
      </div>
      <motion.span className="absolute right-3 top-2 text-ink-2" animate={{ rotate: [0, -14, 8, 0], y: [0, -3, 0] }} transition={LOOP}>
        <PenTool className="size-4" />
      </motion.span>
    </div>
  )
}

function DeliverIllus() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <motion.div
        className="h-[58px] w-[78px] rounded-[10px] shadow-[0_8px_20px_-8px_rgba(0,0,0,.35)]"
        style={{ background: 'linear-gradient(135deg, var(--glow-1), var(--accent) 55%, var(--accent-deep))' }}
        animate={{ y: [34, 0, 0, 34], opacity: [0, 1, 1, 0], rotate: [-6, 0, 0, -6] }}
        transition={{ ...LOOP, times: [0, 0.3, 0.85, 1] }}
      />
      <motion.span
        className="absolute bottom-3 right-[calc(50%-52px)] flex size-8 items-center justify-center rounded-full bg-[#2FB36B] text-white shadow-[0_6px_16px_-4px_#2FB36B]"
        animate={{ scale: [0, 0, 1.35, 1, 1, 0], rotate: [-40, -40, 8, 0, 0, 0] }}
        transition={{ ...LOOP, times: [0, 0.38, 0.5, 0.6, 0.85, 1] }}
      >
        <BadgeCheck className="size-4" />
      </motion.span>
    </div>
  )
}

export function HowSlide() {
  const t = useT()
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  useEffect(() => {
    if (hover !== null) return
    const id = window.setInterval(() => setActive((a) => (a + 1) % 4), 2400)
    return () => window.clearInterval(id)
  }, [hover])
  const current = hover ?? active
  const steps = [
    { icon: HeartHandshake, illus: <MatchIllus />, key: 'match' },
    { icon: FileText, illus: <BriefIllus />, key: 'brief' },
    { icon: PenTool, illus: <CreateIllus />, key: 'create' },
    { icon: BadgeCheck, illus: <DeliverIllus />, key: 'deliver' },
  ]
  const extras = [
    { icon: MessagesSquare, key: 'core.nav.messages' },
    { icon: FolderOpen, key: 'core.nav.files' },
    { icon: CalendarDays, key: 'core.nav.calendar' },
    { icon: CreditCard, key: 'core.nav.payments' },
    { icon: BarChart3, key: 'core.nav.analytics' },
    { icon: Inbox, key: 'core.nav.requests' },
  ]
  return (
    <div className="flex flex-col gap-5">
      <SlideTitle kicker={t('onboarding.how.kicker')} title={t('onboarding.how.title')} body={t('onboarding.how.body')} />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {steps.map((s, i) => {
          const on = i === current
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: on ? -4 : 0, filter: 'blur(0px)' }}
              transition={{ opacity: { delay: 0.15 + i * 0.08, duration: 0.5 }, filter: { delay: 0.15 + i * 0.08, duration: 0.5 }, y: spring.snappy }}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              className={cn(
                'relative flex flex-col rounded-[22px] border p-2 transition-[border-color,box-shadow,background-color] duration-300',
                on ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_7%,var(--surface))] shadow-[0_0_0_3px_var(--accent-softer),0_18px_36px_-22px_var(--accent)]' : 'border-line bg-[var(--surface)]/70',
              )}
            >
              <div className="relative h-[92px] overflow-hidden rounded-[16px] bg-[var(--surface-2)]">{s.illus}</div>
              <div className="flex items-center gap-2 px-1.5 pb-1 pt-2.5">
                <span className={cn('flex size-7 items-center justify-center rounded-[9px] transition-colors', on ? 'bg-accent text-accent-ink' : 'bg-[var(--surface-2)] text-ink-2')}>
                  <s.icon className="size-3.5" />
                </span>
                <span className="font-mono text-[11px] text-ink-3">0{i + 1}</span>
              </div>
              <p className="px-1.5 text-[14px] font-medium tracking-[-0.01em] text-ink">{t(`onboarding.how.${s.key}`)}</p>
              <p className="px-1.5 pb-1 text-[12px] leading-snug text-ink-3">{t(`onboarding.how.${s.key}Desc`)}</p>
            </motion.div>
          )
        })}
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[12px] text-ink-3">{t('onboarding.how.plus')}</span>
        {extras.map((x, i) => (
          <motion.span
            key={x.key}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring.bouncy, delay: 0.6 + i * 0.05 }}
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-2.5 text-[12px] font-medium text-ink-2"
          >
            <x.icon className="size-3.5" />
            {t(x.key)}
          </motion.span>
        ))}
      </motion.div>
    </div>
  )
}

// ───────────────────────────── 3 · disciplines ─────────────────────────────

const CYCLE_MS = 1900

export function DisciplinesSlide() {
  const t = useT()
  const dark = useIsDark()
  const setDiscipline = useApp((s) => s.setDiscipline)
  const accentMode = useApp((s) => s.settings.accentMode)
  const motionOff = useApp((s) => s.settings.motion === 'off')
  const original = useRef(useApp.getState().settings.discipline)
  const [idx, setIdx] = useState(() => Math.max(0, DISCIPLINE_LIST.findIndex((d) => d.id === original.current)))
  // with motion switched off the tour does not flash through themes on its own
  const [paused, setPaused] = useState(() => useApp.getState().settings.motion === 'off')
  const theme = DISCIPLINE_LIST[idx]!

  // restore the tab the user had before the tour
  useEffect(() => {
    const prev = original.current
    return () => useApp.getState().setDiscipline(prev)
  }, [])
  useEffect(() => {
    setDiscipline(theme.id)
  }, [theme.id, setDiscipline])
  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => setIdx((i) => (i + 1) % DISCIPLINE_LIST.length), CYCLE_MS)
    return () => window.clearInterval(id)
  }, [paused])

  return (
    <div className="flex flex-col gap-5">
      <SlideTitle kicker={t('onboarding.disc.kicker')} title={t('onboarding.disc.title')} body={t('onboarding.disc.body')} />
      <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="grid grid-cols-4 gap-x-1.5 gap-y-3" onPointerLeave={() => setPaused(motionOff)}>
          {DISCIPLINE_LIST.map((d, i) => {
            const on = i === idx
            return (
              <motion.button
                key={d.id}
                type="button"
                initial={{ opacity: 0, scale: 0.4, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ ...spring.bouncy, delay: 0.1 + i * 0.05 }}
                onPointerEnter={() => {
                  setPaused(true)
                  setIdx(i)
                }}
                onClick={() => {
                  setPaused(true)
                  setIdx(i)
                }}
                className="relative flex min-w-0 flex-col items-center gap-1.5 rounded-[18px] px-1 py-2"
                aria-pressed={on}
              >
                {on && (
                  <motion.span
                    layoutId="welcome-disc"
                    className="absolute inset-0 rounded-[18px] bg-[var(--surface-2)] shadow-[inset_0_0_0_1px_var(--line-2)]"
                    transition={spring.pill}
                  />
                )}
                <motion.span className="relative" animate={on ? { y: -3, scale: 1.12, rotate: [0, -8, 6, 0] } : { y: 0, scale: 1, rotate: 0 }} transition={spring.bouncy}>
                  <DisciplineIcon id={d.id} size={46} />
                </motion.span>
                <span className={cn('relative w-full truncate text-center text-[11px] font-medium', on ? 'text-ink' : 'text-ink-3')}>{t(d.labelKey)}</span>
              </motion.button>
            )
          })}
        </div>
        <div className="relative">
          <div className="relative overflow-hidden rounded-[20px] shadow-[0_24px_50px_-30px_rgba(0,0,0,.5)] ring-1 ring-black/5">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={theme.id}
                initial={{ opacity: 0, scale: 1.06, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
              >
                <ThemeMock theme={theme} mode={dark ? 'dark' : 'light'} animate />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={theme.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="truncate text-[13.5px] font-medium text-ink"
                >
                  {t(theme.labelKey)} <span className="text-ink-3">· {theme.id === 'all' ? 'designTab' : theme.inspiredBy}</span>
                </motion.p>
              </AnimatePresence>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                {!paused && (
                  <motion.span
                    key={idx}
                    className="block h-full origin-left rounded-full bg-accent"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: CYCLE_MS / 1000, ease: 'linear' }}
                  />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? t('onboarding.disc.play') : t('onboarding.disc.pause')}
              title={paused ? t('onboarding.disc.play') : t('onboarding.disc.pause')}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink transition-colors hover:bg-[var(--surface-3)]"
            >
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
          </div>
          {accentMode === 'fixed' && <p className="mt-2 text-[11.5px] text-ink-3">{t('onboarding.disc.fixedNote')}</p>}
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────── 4 · choose workspace ─────────────────────────────

function ClientIllus() {
  const client = useApp((s) => s.clients.find((c) => c.id === ME_CLIENT_ID))
  return (
    <div className="relative flex h-full items-center justify-center bg-accent-soft">
      <Avatar kind="brand" name={client?.name ?? 'Northlight Studio'} color={client?.logoColor} seed={client?.avatarSeed ?? 'northlight'} size={44} />
      {['maya-chen', 'leo-martins', 'elena-rossi'].map((s, i) => (
        <motion.span
          key={s}
          className="absolute"
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
          animate={{ x: [-58, 0, 58][i], y: [-8, -26, -8][i], scale: 1, opacity: 1 }}
          transition={{ ...spring.bouncy, delay: 0.25 + i * 0.08 }}
        >
          <Avatar seed={s} size={28} ring />
        </motion.span>
      ))}
      <motion.span
        className="absolute bottom-2.5 flex h-6 items-center gap-1 rounded-full bg-ink px-2.5 text-[10.5px] font-medium text-[var(--surface)]"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring.bouncy, delay: 0.5 }}
      >
        <FileText className="size-3" /> Brief · DT-2871
      </motion.span>
    </div>
  )
}

function DesignerIllus() {
  const me = useApp((s) => s.designers.find((d) => d.id === ME_DESIGNER_ID))
  return (
    <div className="glass-night relative flex h-full items-center justify-center gap-3 rounded-none">
      <Avatar seed="ali" media={me?.avatar} size={44} status="online" />
      <motion.div
        className="rounded-[12px] bg-white/10 px-3 py-2 text-left backdrop-blur"
        initial={{ x: 30, opacity: 0, rotate: 6 }}
        animate={{ x: 0, opacity: 1, rotate: 0 }}
        transition={{ ...spring.bouncy, delay: 0.3 }}
      >
        <p className="flex items-center gap-1 text-[10.5px] text-on-night/60">
          <Inbox className="size-3" /> Orbit Fitness
        </p>
        <p className="font-mono text-[12px] text-accent">3,000 EUR</p>
      </motion.div>
    </div>
  )
}

export function RoleSlide() {
  const t = useT()
  const role = useApp((s) => s.settings.role)
  const setRole = useApp((s) => s.setRole)
  const cards: { id: Role; illus: ReactNode }[] = [
    { id: 'client', illus: <ClientIllus /> },
    { id: 'designer', illus: <DesignerIllus /> },
  ]
  return (
    <div className="flex flex-col gap-5">
      <SlideTitle kicker={t('onboarding.role.kicker')} title={t('onboarding.role.title')} body={t('onboarding.role.body')} />
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
        {cards.map((c, i) => {
          const on = role === c.id
          return (
            <motion.button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setRole(c.id)}
              initial={{ opacity: 0, y: 26, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.55, delay: 0.15 + i * 0.1, ease: EASE_OUT }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'relative flex flex-col overflow-hidden rounded-[24px] border p-2 text-left transition-[border-color,box-shadow,background-color] duration-300',
                on
                  ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface))] shadow-[0_0_0_3px_var(--accent-softer),0_22px_44px_-24px_var(--accent)]'
                  : 'border-line bg-[var(--surface)]/70 hover:border-line-2',
              )}
            >
              <AnimatePresence>
                {on && (
                  <motion.span
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={spring.bouncy}
                    className="absolute right-4 top-4 z-[3] flex size-7 items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_6px_16px_-6px_var(--accent)]"
                  >
                    <CheckCircle2 className="size-4" />
                  </motion.span>
                )}
              </AnimatePresence>
              <div className="h-[104px] overflow-hidden rounded-[18px]">{c.illus}</div>
              <div className="px-2.5 pb-2.5 pt-3">
                <p className="text-[17px] font-medium tracking-[-0.02em] text-ink">{t(`onboarding.role.${c.id}.title`)}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-3">{t(`onboarding.role.${c.id}.sub`)}</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {[1, 2, 3].map((n) => (
                    <li key={n} className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-2">
                      <CheckCircle2 className={cn('mt-px size-3.5 shrink-0', on ? 'text-accent-text' : 'text-ink-4')} />
                      {t(`onboarding.role.${c.id}.p${n}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.button>
          )
        })}
      </div>
      <p className="text-[12px] text-ink-3">{t('onboarding.role.hint')}</p>
    </div>
  )
}

import { motion } from 'motion/react'
import {
  Atom,
  Brush,
  CalendarClock,
  Code2,
  Command,
  Database,
  FileCode2,
  Gauge,
  HardDrive,
  PartyPopper,
  PlayCircle,
  Route,
  Shapes,
  Smile,
  Sparkles,
  Wind,
  Zap,
} from 'lucide-react'
import { spring, stagger, item } from '@/lib/motion'
import { useT } from '@/i18n'
import { useUI } from '@/store/ui'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Badge'
import { LogoMark } from '@/components/layout/Logo'
import { openWelcomeTour } from '@/components/onboarding/openWelcome'
import { GroupLabel, SectionHeader, SettingsCard, useFlash } from '../ui'
import { SECTIONS } from '../sections'

export const APP_VERSION = '1.0.0'

const STACK = [
  { name: 'React 19', role: 'ui', icon: Atom, color: '#61DAFB' },
  { name: 'TypeScript', role: 'types', icon: FileCode2, color: '#3178C6' },
  { name: 'Vite', role: 'build', icon: Zap, color: '#A855F7' },
  { name: 'Tailwind CSS v4', role: 'styles', icon: Wind, color: '#38BDF8' },
  { name: 'Motion', role: 'motion', icon: Sparkles, color: '#FF4D8D' },
  { name: 'Zustand', role: 'state', icon: Database, color: '#F59E0B' },
  { name: 'React Router', role: 'routing', icon: Route, color: '#F44250' },
  { name: 'date-fns', role: 'dates', icon: CalendarClock, color: '#770C56' },
  { name: 'DiceBear', role: 'avatars', icon: Smile, color: '#FF9A00' },
  { name: 'canvas-confetti', role: 'confetti', icon: PartyPopper, color: '#2EE6C5' },
  { name: 'idb-keyval', role: 'files', icon: HardDrive, color: '#2FB36B' },
  { name: 'Lucide', role: 'icons', icon: Shapes, color: '#F56565' },
] as const

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="inline-flex h-7 min-w-7 items-center justify-center rounded-[9px] border border-line-2 bg-[var(--surface)] px-2 font-mono text-[12px] font-medium text-ink shadow-[0_2px_0_var(--line-2)]"
        >
          {k}
        </kbd>
      ))}
    </span>
  )
}

export function AboutSection() {
  const t = useT()
  const meta = SECTIONS.find((s) => s.id === 'about')!
  const versionFlash = useFlash('version')
  const stackFlash = useFlash('stack')
  const keysFlash = useFlash('shortcuts')
  const mod = isMac ? '⌘' : 'Ctrl'

  const shortcuts: { keys: string[]; label: string }[] = [
    { keys: [mod, 'K'], label: t('settings.about.key.palette') },
    { keys: ['↑', '↓', '↵'], label: t('settings.about.key.paletteNav') },
    { keys: ['←', '→'], label: t('settings.about.key.swipe') },
    { keys: ['↑'], label: t('settings.about.key.super') },
    { keys: ['Space'], label: t('settings.about.key.shot') },
    { keys: ['⌫'], label: t('settings.about.key.undo') },
    { keys: ['←', '→'], label: t('settings.about.key.tour') },
    { keys: ['Esc'], label: t('settings.about.key.esc') },
  ]

  return (
    <>
      <SectionHeader icon={meta.icon} color={meta.color} title={t('settings.nav.about')} description={t('settings.about.desc')} />

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <SettingsCard variant="night" className="overflow-hidden" spotlight>
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-accent opacity-30 blur-3xl"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 40, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div ref={versionFlash.ref} animate={versionFlash.controls} id="set-version" className="relative z-[1] -m-2 flex h-full flex-col gap-5 rounded-[22px] p-2">
            <div className="flex items-center gap-4">
              <motion.span initial={{ scale: 0.5, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={spring.wobbly}>
                <LogoMark size={72} />
              </motion.span>
              <div>
                <p className="text-[30px] font-semibold leading-none tracking-[-0.05em]">designTab</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Pill tone="accent" size="xs">
                    v{APP_VERSION}
                  </Pill>
                  <span className="font-mono text-[11.5px] text-on-night/55">{t('settings.about.build', { date: '2026.10' })}</span>
                </div>
              </div>
            </div>
            <p className="max-w-lg text-[14px] leading-relaxed text-on-night/75">{t('settings.about.pitch')}</p>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button variant="accent" icon={<PlayCircle className="size-4" />} onClick={openWelcomeTour}>
                {t('settings.workspace.tourCta')}
              </Button>
              <Button variant="ghost" className="text-on-night/80 hover:bg-white/10 hover:text-on-night" icon={<Command className="size-4" />} onClick={() => useUI.getState().set({ paletteOpen: true })}>
                {t('settings.about.openPalette')}
              </Button>
            </div>
          </motion.div>
        </SettingsCard>

        <SettingsCard spotlight tilt={4}>
          <div className="relative z-[1] flex h-full flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar seed="ali" size={56} ring status="online" />
              <div>
                <p className="text-[11.5px] uppercase tracking-[0.08em] text-ink-3">{t('settings.about.creditKicker')}</p>
                <p className="text-[19px] font-medium tracking-[-0.02em] text-ink">{t('settings.about.credit')}</p>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed text-ink-2">{t('settings.about.creditBody')}</p>
            <div className="mt-auto flex flex-wrap gap-1.5">
              {[
                { icon: Brush, label: t('settings.about.tag.product') },
                { icon: Sparkles, label: t('settings.about.tag.motion') },
                { icon: Code2, label: t('settings.about.tag.frontend') },
                { icon: Gauge, label: t('settings.about.tag.perf') },
              ].map((x) => (
                <Pill key={x.label} tone="neutral" icon={<x.icon className="size-3.5" />}>
                  {x.label}
                </Pill>
              ))}
            </div>
          </div>
        </SettingsCard>
      </div>

      <SettingsCard>
        <motion.div ref={stackFlash.ref} animate={stackFlash.controls} id="set-stack" className="relative z-[1] -m-2 rounded-[22px] p-2">
          <GroupLabel right={<span className="font-mono text-[11.5px] text-ink-3">{STACK.length}</span>}>{t('settings.about.stack')}</GroupLabel>
          <motion.ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" variants={stagger(0.035)} initial="hidden" animate="show">
            {STACK.map((s) => (
              <motion.li
                key={s.name}
                variants={item}
                whileHover={{ y: -3 }}
                className="group flex items-center gap-3 rounded-[18px] border border-line bg-[var(--surface)]/60 p-3 transition-shadow hover:shadow-[0_14px_30px_-20px_rgba(0,0,0,.4)]"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-[12px] text-white transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110"
                  style={{ background: `linear-gradient(150deg, ${s.color}, color-mix(in oklab, ${s.color} 65%, #000))` }}
                >
                  <s.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium text-ink">{s.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">{t(`settings.about.role.${s.role}`)}</span>
                </span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </SettingsCard>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <SettingsCard>
          <motion.div ref={keysFlash.ref} animate={keysFlash.controls} id="set-shortcuts" className="relative z-[1] -m-2 rounded-[22px] p-2">
            <GroupLabel>{t('settings.about.shortcuts')}</GroupLabel>
            <ul className="divide-y divide-[var(--line)]">
              {shortcuts.map((s, i) => (
                <motion.li
                  key={s.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * i, ...spring.smooth }}
                  className="flex items-center justify-between gap-4 py-2.5"
                >
                  <span className="min-w-0 text-[13.5px] text-ink-2">{s.label}</span>
                  <Keys keys={s.keys} />
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </SettingsCard>

        <SettingsCard>
          <GroupLabel>{t('settings.about.whatsNew')}</GroupLabel>
          <ol className="relative z-[1] flex flex-col gap-3 border-l border-dashed border-line-2 pl-5">
            {[1, 2, 3, 4, 5].map((n, i) => (
              <motion.li
                key={n}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i, ...spring.smooth }}
                className="relative text-[13px] leading-relaxed text-ink-2"
              >
                <span className="absolute -left-[26.5px] top-1.5 size-3 rounded-full border-2 border-[var(--surface)] bg-accent shadow-[0_0_0_3px_var(--accent-softer)]" />
                {t(`settings.about.new${n}`)}
              </motion.li>
            ))}
          </ol>
        </SettingsCard>
      </div>
    </>
  )
}

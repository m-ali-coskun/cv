import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Copy, Layers2, MousePointerClick, Pin, Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { DisciplineFilter } from '@/store/types'
import { DISCIPLINE_LIST, disciplineTheme, type DisciplineTheme } from '@/theme/disciplines'
import { useActiveTheme, useIsDark } from '@/theme/ThemeProvider'
import { DisciplineIcon, Pill } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { Gauge } from '@/components/ui/Gauge'
import { ProgressBar } from '@/components/ui/Progress'
import { Segmented } from '@/components/ui/Segmented'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { ThemeMock } from '../lib/ThemeMock'
import { CheckBadge, GroupLabel, OptionCard, SectionHeader, SettingsCard, useFlash } from '../ui'
import { SECTIONS } from '../sections'

function Swatch({ color, label }: { color: string; label: string }) {
  const t = useT()
  return (
    <motion.button
      type="button"
      title={`${label} · ${color}`}
      aria-label={`${t('core.action.copy')} ${color}`}
      whileHover={{ y: -3, scale: 1.12 }}
      whileTap={{ scale: 0.9 }}
      transition={spring.snappy}
      onClick={(e) => {
        e.stopPropagation()
        void navigator.clipboard?.writeText(color).catch(() => undefined)
        toast({ title: t('settings.themes.copied', { hex: color }), tone: 'success', duration: 1800 })
      }}
      className="group/sw relative size-6 rounded-full ring-2 ring-[var(--surface)] shadow-[0_2px_6px_rgba(0,0,0,.15)]"
      style={{ background: color }}
    >
      <Copy className="absolute inset-0 m-auto size-3 text-white opacity-0 mix-blend-difference transition-opacity group-hover/sw:opacity-100" />
    </motion.button>
  )
}

function ThemeCard({ theme, active, onApply, index }: { theme: DisciplineTheme; active: boolean; onApply: () => void; index: number }) {
  const t = useT()
  const dark = useIsDark()
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, delay: 0.04 * index, ease: EASE_OUT }}
      whileHover={{ y: -6 }}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-[24px] border transition-[border-color,box-shadow] duration-300',
        active ? 'border-transparent' : 'border-line bg-[var(--surface)]/70 hover:border-line-2',
      )}
      style={
        active
          ? {
              background: `color-mix(in oklab, ${theme.accent} 10%, var(--surface))`,
              boxShadow: `0 0 0 2px ${theme.accent}, 0 22px 50px -24px ${theme.accent}`,
            }
          : undefined
      }
      onClick={onApply}
      role="radio"
      aria-checked={active}
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onApply())}
    >
      <CheckBadge show={active} className="right-4 top-4" />
      <div className="p-1.5 sm:p-2">
        <div className="relative overflow-hidden rounded-[14px] ring-1 ring-black/5 sm:rounded-[17px]">
          <motion.div className="origin-center transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.05]">
            <ThemeMock theme={theme} mode={dark ? 'dark' : 'light'} animate />
          </motion.div>
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: `color-mix(in oklab, ${theme.deep} 35%, transparent)` }}
          >
            <span className="translate-y-3 scale-75 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:translate-y-0 group-hover:scale-100">
              <DisciplineIcon id={theme.id} size={64} />
            </span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-2.5 pb-1 pt-1 sm:gap-3 sm:px-4 sm:pt-1.5">
        <motion.span whileHover={{ rotate: -10, scale: 1.1 }} className="shrink-0">
          <DisciplineIcon id={theme.id} size={34} />
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium tracking-[-0.01em] text-ink sm:text-[14.5px]">{t(theme.labelKey)}</p>
          <p className="truncate text-[11.5px] text-ink-3 sm:text-[12px]">
            {theme.id === 'all' ? t('settings.themes.signature') : t('core.discipline.inspired', { app: theme.inspiredBy })}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-2.5 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-2.5">
        <div className="flex -space-x-1.5">
          <Swatch color={theme.accent} label={t('settings.themes.swatch.accent')} />
          <Swatch color={theme.deep} label={t('settings.themes.swatch.deep')} />
          <Swatch color={theme.glow} label={t('settings.themes.swatch.glow')} />
          <Swatch color={theme.glow2} label={t('settings.themes.swatch.glow2')} />
        </div>
        <span className="hidden font-mono text-[11px] uppercase tracking-wide text-ink-3 sm:inline">{theme.accent}</span>
      </div>
    </motion.div>
  )
}

function LivePreview() {
  const t = useT()
  const theme = useActiveTheme()
  const [on, setOn] = useState(true)
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('b')
  return (
    <SettingsCard className="overflow-hidden">
      <GroupLabel right={<Pill tone="accent" dot>{t(theme.labelKey)}</Pill>}>{t('settings.themes.preview')}</GroupLabel>
      <p className="relative z-[1] -mt-1 mb-4 text-[12.5px] text-ink-3">{t('settings.themes.previewDesc')}</p>
      <div className="relative z-[1] grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="tile flex flex-col gap-4 p-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<Sparkles className="size-3.5" />}>
              {t('settings.themes.sample.primary')}
            </Button>
            <Button size="sm" variant="accent">
              {t('settings.themes.sample.accent')}
            </Button>
            <Button size="sm" variant="soft">
              {t('settings.themes.sample.soft')}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="accent" dot>
              {t('core.status.in_progress')}
            </Pill>
            <Pill tone="warning">{t('core.status.in_review')}</Pill>
            <Pill tone="success">{t('core.status.approved')}</Pill>
            <Toggle checked={on} onChange={setOn} size="sm" label="toggle" />
          </div>
          <ProgressBar value={78} tone="accent" showLabel />
          <Segmented
            size="sm"
            pill="accent"
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'a', label: t('core.common.today') },
              { value: 'b', label: t('core.common.days7') },
              { value: 'c', label: t('core.common.days30') },
            ]}
          />
        </div>
        <div className="flex gap-3">
          <div className="glass-night relative flex flex-1 flex-col justify-between overflow-hidden rounded-[20px] p-4">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-ink">
              <Wand2 className="size-4" />
            </span>
            <div>
              <p className="text-[30px] font-medium leading-none tracking-[-0.04em]">
                <AnimatedCounter value={94} suffix="%" />
              </p>
              <p className="mt-1 text-[11.5px] text-on-night/60">{t('settings.themes.sample.ready')}</p>
            </div>
          </div>
          <div className="glass-accent flex flex-1 items-center justify-center rounded-[20px] p-2">
            <Gauge value={94} size={150} tone="ink" ticks={28} />
          </div>
        </div>
      </div>
    </SettingsCard>
  )
}

export function ThemesSection() {
  const t = useT()
  const discipline = useApp((s) => s.settings.discipline)
  const accentMode = useApp((s) => s.settings.accentMode)
  const fixedAccent = useApp((s) => s.settings.fixedAccent)
  const setSettings = useApp((s) => s.setSettings)
  const setDiscipline = useApp((s) => s.setDiscipline)
  const active = useActiveTheme()
  const meta = SECTIONS.find((s) => s.id === 'themes')!
  const modeFlash = useFlash('mode')
  const galleryFlash = useFlash('gallery')

  const apply = (id: DisciplineFilter) => {
    if (accentMode === 'fixed') setSettings({ fixedAccent: id })
    else setDiscipline(id)
  }

  return (
    <>
      <SectionHeader icon={meta.icon} color={meta.color} title={t('settings.nav.themes')} description={t('settings.themes.desc')} />

      {/* Hero: explains that tabs re-theme the app */}
      <SettingsCard variant="night" className="overflow-hidden">
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full opacity-50 blur-3xl"
          animate={{ background: active.accent }}
          transition={{ duration: 0.8 }}
        />
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full opacity-30 blur-3xl"
          animate={{ background: active.glow }}
          transition={{ duration: 0.8 }}
        />
        <div className="relative z-[1] grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Pill className="bg-white/10 text-on-night" icon={<Layers2 className="size-3.5" />}>
              {t('settings.themes.heroKicker')}
            </Pill>
            <h3 className="mt-3 text-[24px] font-medium leading-tight tracking-[-0.03em] sm:text-[30px]">{t('settings.themes.heroTitle')}</h3>
            <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-on-night/70">{t('settings.themes.heroBody')}</p>
            <div className="mt-4 flex items-center gap-3">
              <AnimatePresence mode="wait">
                <motion.span
                  key={active.id}
                  initial={{ scale: 0.4, rotate: -30, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.12 } }}
                  transition={spring.bouncy}
                >
                  <DisciplineIcon id={active.id} size={44} />
                </motion.span>
              </AnimatePresence>
              <div className="min-w-0">
                <p className="text-[11.5px] uppercase tracking-[0.08em] text-on-night/50">{t('settings.themes.painting')}</p>
                <p className="truncate text-[15px] font-medium">
                  {t(active.labelKey)} <span className="text-on-night/50">· {active.inspiredBy}</span>
                </p>
              </div>
            </div>
          </div>
          {/* mini tab bar replica — really switches the tab */}
          <div className="flex flex-wrap gap-1.5 rounded-[22px] bg-white/[0.06] p-2 lg:w-[300px]">
            <p className="mb-1 flex w-full items-center gap-1.5 px-1 text-[11.5px] text-on-night/55">
              <MousePointerClick className="size-3.5" /> {t('settings.themes.tryTabs')}
            </p>
            {DISCIPLINE_LIST.map((d) => {
              const on = d.id === discipline
              return (
                <motion.button
                  key={d.id}
                  type="button"
                  onClick={() => setDiscipline(d.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.92 }}
                  className={cn('relative flex h-9 items-center gap-1.5 rounded-full pl-1 pr-3 text-[12px] font-medium', on ? 'text-[#0b0b0c]' : 'text-on-night/80 hover:text-on-night')}
                  title={t(d.labelKey)}
                >
                  {on && <motion.span layoutId="theme-hero-tab" className="absolute inset-0 rounded-full" style={{ background: d.accent }} transition={spring.pill} />}
                  <span className="relative">
                    <DisciplineIcon id={d.id} size={26} />
                  </span>
                  <span className="relative">{d.code}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </SettingsCard>

      {/* Mode */}
      <SettingsCard>
        <motion.div ref={modeFlash.ref} animate={modeFlash.controls} id="set-mode" className="relative z-[1] -m-2 rounded-[22px] p-2">
          <GroupLabel>{t('settings.themes.modeTitle')}</GroupLabel>
          <div className="grid gap-3 md:grid-cols-2" role="radiogroup">
            <OptionCard selected={accentMode === 'discipline'} onClick={() => setSettings({ accentMode: 'discipline' })}>
              <div className="flex gap-4 p-4 pr-12">
                <div className="relative flex h-16 w-24 shrink-0 flex-col justify-center gap-1.5 rounded-[16px] bg-[var(--surface-2)] px-2.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="block h-2.5 rounded-full"
                      style={{ width: `${88 - i * 18}%` }}
                      animate={{ background: ['#C9F158', '#31A8FF', '#9999FF', '#FF9A00', '#FF3366', '#2EE6C5', '#C9F158'] }}
                      transition={{ duration: 7, repeat: Infinity, delay: i * 0.35, ease: 'linear' }}
                    />
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink">{t('settings.themes.follow')}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{t('settings.themes.followDesc')}</p>
                </div>
              </div>
            </OptionCard>
            <OptionCard selected={accentMode === 'fixed'} onClick={() => setSettings({ accentMode: 'fixed', fixedAccent: accentMode === 'fixed' ? fixedAccent : active.id })}>
              <div className="flex gap-4 p-4 pr-12">
                <div className="relative flex h-16 w-24 shrink-0 items-center justify-center rounded-[16px] bg-[var(--surface-2)]">
                  <motion.span
                    className="size-10 rounded-[30%]"
                    style={{ background: disciplineTheme(accentMode === 'fixed' ? fixedAccent : active.id).accent }}
                    animate={{ rotate: [0, 6, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  <motion.span
                    className="absolute -right-1.5 -top-1.5 flex size-7 items-center justify-center rounded-full bg-ink text-[var(--surface)] shadow-lg"
                    animate={accentMode === 'fixed' ? { y: [0, -4, 0] } : {}}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  >
                    <Pin className="size-3.5" />
                  </motion.span>
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink">{t('settings.themes.fixed')}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{t('settings.themes.fixedDesc')}</p>
                </div>
              </div>
            </OptionCard>
          </div>
        </motion.div>
      </SettingsCard>

      {/* Gallery */}
      <SettingsCard>
        <motion.div ref={galleryFlash.ref} animate={galleryFlash.controls} id="set-gallery" className="relative z-[1] -m-2 rounded-[22px] p-2">
          <GroupLabel right={<span className="hidden text-[12px] text-ink-3 sm:inline">{accentMode === 'fixed' ? t('settings.themes.clickPin') : t('settings.themes.clickSwitch')}</span>}>
            {t('settings.themes.gallery')}
          </GroupLabel>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4" role="radiogroup">
            {DISCIPLINE_LIST.map((d, i) => (
              <ThemeCard key={d.id} theme={d} index={i} active={active.id === d.id} onApply={() => apply(d.id)} />
            ))}
          </div>
        </motion.div>
      </SettingsCard>

      <LivePreview />
    </>
  )
}

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Droplets, Gauge, Layers, Monitor, Moon, Play, Rows3, Sparkle, Sun, Wand2, Waves } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring, stagger } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import type { GlassLevel, MotionLevel, ThemeMode } from '@/store/types'
import { useActiveTheme } from '@/theme/ThemeProvider'
import { Segmented } from '@/components/ui/Segmented'
import { Toggle } from '@/components/ui/Toggle'
import { Button } from '@/components/ui/Button'
import { ThemeMock } from '../lib/ThemeMock'
import { Divider, GroupLabel, OptionCard, SectionHeader, SettingRow, SettingsCard, useFlash } from '../ui'
import { SECTIONS } from '../sections'

const GLASS: Record<GlassLevel, { alpha: number; blur: number; sat: number }> = {
  clear: { alpha: 0.42, blur: 28, sat: 200 },
  frosted: { alpha: 0.62, blur: 22, sat: 180 },
  solid: { alpha: 0.94, blur: 8, sat: 120 },
}

function ThemeCards() {
  const t = useT()
  const theme = useApp((s) => s.settings.theme)
  const setSettings = useApp((s) => s.setSettings)
  const active = useActiveTheme()
  const { ref, controls } = useFlash('theme')
  const options: { id: ThemeMode; icon: typeof Sun }[] = [
    { id: 'light', icon: Sun },
    { id: 'dark', icon: Moon },
    { id: 'system', icon: Monitor },
  ]
  return (
    <motion.div ref={ref} animate={controls} id="set-theme" className="relative z-[1] grid grid-cols-3 gap-2 rounded-[22px] sm:gap-3" role="radiogroup">
      {options.map((o, i) => {
        const Icon = o.icon
        const selected = theme === o.id
        return (
          <OptionCard key={o.id} selected={selected} onClick={() => setSettings({ theme: o.id })} ariaLabel={t(`settings.appearance.theme.${o.id}`)}>
            <div className="p-1.5 sm:p-2">
              <div className="relative overflow-hidden rounded-[12px] ring-1 ring-black/5 sm:rounded-[16px]">
                {o.id === 'system' ? (
                  <div className="relative">
                    <ThemeMock theme={active} mode="light" animate />
                    <div className="absolute inset-0 [clip-path:polygon(62%_0,100%_0,100%_100%,38%_100%)]">
                      <ThemeMock theme={active} mode="dark" />
                    </div>
                  </div>
                ) : (
                  <ThemeMock theme={active} mode={o.id} animate />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2.5 pb-3 pt-1 sm:px-4 sm:pb-4 sm:pt-1.5">
              <motion.span
                className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink sm:flex"
                animate={selected ? { rotate: [0, -25, 20, 0], scale: [1, 1.15, 1] } : { rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.05 * i }}
              >
                <Icon className="size-4" />
              </motion.span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink sm:text-[14px]">{t(`settings.appearance.theme.${o.id}`)}</p>
                <p className="hidden truncate text-[12px] text-ink-3 sm:block">{t(`settings.appearance.theme.${o.id}Desc`)}</p>
              </div>
            </div>
          </OptionCard>
        )
      })}
    </motion.div>
  )
}

/** Live glass preview: moving colour blobs behind a pane that uses the chosen level. */
function GlassPreview({ level }: { level: GlassLevel }) {
  const t = useT()
  const g = GLASS[level]
  return (
    <div className="relative min-h-48 flex-1 overflow-hidden rounded-[22px] bg-[var(--surface-2)]">
      <div className="dot-grid absolute inset-0 opacity-70" />
      <motion.span
        className="absolute left-[8%] top-[10%] size-28 rounded-full bg-accent"
        animate={{ x: [0, 90, 30, 0], y: [0, 30, 60, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute right-[10%] top-[30%] size-24 rounded-[30%] bg-[#FF61F6]"
        animate={{ x: [0, -80, -20, 0], y: [0, -20, 40, 0], rotate: [0, 90, 180, 360] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute bottom-[-12%] left-[40%] size-24 rounded-full bg-[#31A8FF]"
        animate={{ x: [0, 60, -60, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="stripes absolute inset-x-0 top-[38%] h-10 opacity-80" />
      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-center text-[64px] font-semibold leading-none tracking-[-0.06em] text-ink/80">
        Aa Aa Aa
      </span>
      <div className="absolute inset-x-6 bottom-5 top-12 sm:inset-x-10">
        <div
          className="relative flex h-full flex-col justify-between overflow-hidden rounded-[20px] border p-4"
          style={{
            background: `color-mix(in oklab, var(--surface) ${Math.round(g.alpha * 100)}%, transparent)`,
            backdropFilter: `blur(${g.blur}px) saturate(${g.sat}%)`,
            WebkitBackdropFilter: `blur(${g.blur}px) saturate(${g.sat}%)`,
            borderColor: 'var(--glass-border)',
            boxShadow: 'inset 0 1px 0 var(--glass-edge), var(--glass-shadow)',
            transition: 'background-color .6s var(--ease-out), backdrop-filter .6s var(--ease-out), -webkit-backdrop-filter .6s var(--ease-out)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-medium tracking-[-0.02em] text-ink">{t('settings.appearance.glassPreview')}</p>
            <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-[var(--surface)]">{t(`settings.appearance.glass.${level}`)}</span>
          </div>
          <p className="font-mono text-[11.5px] text-ink-2">
            α {g.alpha.toFixed(2)} · blur {g.blur}px · sat {g.sat}%
          </p>
        </div>
      </div>
    </div>
  )
}

/** Replays a mini list entrance using the selected motion level. */
function MotionDemo({ level }: { level: MotionLevel }) {
  const t = useT()
  const [run, setRun] = useState(0)
  useEffect(() => setRun((r) => r + 1), [level])
  const variants = {
    hidden:
      level === 'expressive'
        ? { opacity: 0, y: 34, scale: 0.8, rotate: -6, filter: 'blur(8px)' }
        : level === 'subtle'
          ? { opacity: 0, y: 6 }
          : { opacity: 1 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      filter: 'blur(0px)',
      transition: level === 'expressive' ? spring.bouncy : level === 'subtle' ? { duration: 0.25, ease: EASE_OUT } : { duration: 0 },
    },
  }
  return (
    <div className="relative z-[1] mt-4 rounded-[20px] bg-[var(--surface-2)] p-3">
      <div className="flex items-center justify-between gap-2 px-1 pb-2.5">
        <p className="text-[12px] font-medium text-ink-3">{t('settings.appearance.motionDemo')}</p>
        <Button size="xs" variant="glass" icon={<Play className="size-3" />} onClick={() => setRun((r) => r + 1)}>
          {t('settings.appearance.replay')}
        </Button>
      </div>
      <motion.div key={run} className="grid grid-cols-3 gap-2" initial="hidden" animate="show" variants={stagger(level === 'expressive' ? 0.09 : 0.04)}>
        {[0, 1, 2].map((i) => (
          <motion.div key={i} variants={variants} className="rounded-[14px] bg-[var(--surface)] p-2.5 shadow-[0_1px_2px_rgba(0,0,0,.05)]">
            <span className={cn('block h-9 rounded-[10px]', i === 1 ? 'bg-accent' : 'bg-[var(--surface-3)]')} />
            <span className="mt-2 block h-1.5 w-3/4 rounded-full bg-[var(--surface-3)]" />
            <span className="mt-1 block h-1.5 w-1/2 rounded-full bg-[var(--surface-3)]" />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

export function AppearanceSection() {
  const t = useT()
  const glass = useApp((s) => s.settings.glass)
  const motionLevel = useApp((s) => s.settings.motion)
  const animatedBackground = useApp((s) => s.settings.animatedBackground)
  const compact = useApp((s) => s.settings.compact)
  const refraction = useApp((s) => s.settings.refraction)
  const setSettings = useApp((s) => s.setSettings)
  const meta = SECTIONS.find((s) => s.id === 'appearance')!
  const glassFlash = useFlash('glass')
  const motionFlash = useFlash('motion')

  const motionOptions: { id: MotionLevel; icon: typeof Wand2 }[] = [
    { id: 'expressive', icon: Wand2 },
    { id: 'subtle', icon: Waves },
    { id: 'off', icon: Gauge },
  ]

  return (
    <>
      <SectionHeader icon={meta.icon} color={meta.color} title={t('settings.nav.appearance')} description={t('settings.appearance.desc')} />

      <SettingsCard>
        <GroupLabel>{t('settings.appearance.theme')}</GroupLabel>
        <ThemeCards />
      </SettingsCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsCard>
          <motion.div ref={glassFlash.ref} animate={glassFlash.controls} id="set-glass" className="relative z-[1] -m-2 flex h-[calc(100%+16px)] flex-col rounded-[22px] p-2">
            <GroupLabel
              right={
                <Segmented<GlassLevel>
                  size="sm"
                  value={glass}
                  onChange={(v) => setSettings({ glass: v })}
                  options={(['clear', 'frosted', 'solid'] as const).map((v) => ({ value: v, label: t(`settings.appearance.glass.${v}`) }))}
                />
              }
            >
              {t('settings.appearance.glass')}
            </GroupLabel>
            <p className="mb-3 text-[12.5px] text-ink-3">{t('settings.appearance.glassDesc')}</p>
            <GlassPreview level={glass} />
          </motion.div>
        </SettingsCard>

        <SettingsCard>
          <motion.div ref={motionFlash.ref} animate={motionFlash.controls} id="set-motion" className="relative z-[1] -m-2 rounded-[22px] p-2">
            <GroupLabel>{t('settings.appearance.motion')}</GroupLabel>
            <div className="grid gap-2" role="radiogroup">
              {motionOptions.map((o) => {
                const Icon = o.icon
                const selected = motionLevel === o.id
                return (
                  <motion.button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSettings({ motion: o.id })}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'relative flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition-colors',
                      selected ? 'text-ink' : 'text-ink-2 hover:bg-[var(--surface-2)]',
                    )}
                  >
                    {selected && (
                      <motion.span
                        layoutId="motion-level-pill"
                        className="absolute inset-0 rounded-[18px] bg-accent-soft ring-1 ring-[var(--accent-line)]"
                        transition={spring.pill}
                      />
                    )}
                    <span className={cn('relative flex size-9 items-center justify-center rounded-[12px]', selected ? 'bg-accent text-accent-ink' : 'bg-[var(--surface-2)]')}>
                      <Icon className="size-4" />
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <span className="block text-[14px] font-medium">{t(`settings.appearance.motion.${o.id}`)}</span>
                      <span className="block text-[12px] text-ink-3">{t(`settings.appearance.motion.${o.id}Desc`)}</span>
                    </span>
                  </motion.button>
                )
              })}
            </div>
            <MotionDemo level={motionLevel} />
          </motion.div>
        </SettingsCard>
      </div>

      <SettingsCard>
        <GroupLabel>{t('settings.appearance.more')}</GroupLabel>
        <SettingRow
          id="background"
          icon={Droplets}
          color="#31A8FF"
          title={t('settings.appearance.background')}
          description={t('settings.appearance.backgroundDesc')}
          control={<Toggle checked={animatedBackground} onChange={(v) => setSettings({ animatedBackground: v })} label={t('settings.appearance.background')} />}
        />
        <Divider />
        <SettingRow
          id="density"
          icon={Rows3}
          color="#9999FF"
          title={t('settings.appearance.density')}
          description={t('settings.appearance.densityDesc')}
          control={<Toggle checked={compact} onChange={(v) => setSettings({ compact: v })} label={t('settings.appearance.density')} />}
        />
        <Divider />
        <SettingRow
          id="specular"
          icon={Sparkle}
          color="#CF96FD"
          title={t('settings.appearance.specular')}
          description={t('settings.appearance.specularDesc')}
          control={<Toggle checked={refraction} onChange={(v) => setSettings({ refraction: v })} label={t('settings.appearance.specular')} />}
        />
        <Divider />
        <SettingRow
          icon={Layers}
          color="#2EE6C5"
          title={t('settings.appearance.resetLook')}
          description={t('settings.appearance.resetLookDesc')}
          control={
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSettings({ theme: 'light', glass: 'frosted', motion: 'expressive', animatedBackground: true, compact: false, refraction: true })}
            >
              {t('core.action.reset')}
            </Button>
          }
        />
      </SettingsCard>
    </>
  )
}

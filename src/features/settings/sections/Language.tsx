import { useMemo } from 'react'
import { motion } from 'motion/react'
import { CalendarDays, Coins, Globe2, Hash, Info } from 'lucide-react'
import { addDays, isToday, startOfWeek } from 'date-fns'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { fmt } from '@/lib/dates'
import { formatMoney, formatNumber } from '@/lib/format'
import { LANGUAGES, translate, useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { ME_NAME } from '@/store/types'
import { Segmented } from '@/components/ui/Segmented'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Divider, GroupLabel, OptionCard, SectionHeader, SettingRow, SettingsCard, useFlash } from '../ui'
import { SECTIONS } from '../sections'

function WeekStrip({ start }: { start: 0 | 1 }) {
  const lang = useLang()
  const days = useMemo(() => {
    const s = startOfWeek(new Date(), { weekStartsOn: start })
    return Array.from({ length: 7 }, (_, i) => addDays(s, i))
  }, [start])
  return (
    <div className="relative z-[1] mt-3 grid grid-cols-7 gap-1.5">
      {days.map((d, i) => {
        const today = isToday(d)
        return (
          <motion.div
            key={`${start}-${i}`}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...spring.snappy, delay: i * 0.03 }}
            className={cn(
              'flex flex-col items-center gap-1 rounded-[14px] py-2',
              today ? 'bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'bg-[var(--surface-2)] text-ink-2',
              i === 0 && !today && 'ring-1 ring-[var(--accent-line)]',
            )}
          >
            <span className="text-[10.5px] font-medium uppercase tracking-wide opacity-70">{fmt(d, 'EEEEEE', lang)}</span>
            <span className="font-mono text-[13px] font-medium">{fmt(d, 'd', lang)}</span>
          </motion.div>
        )
      })}
    </div>
  )
}

export function LanguageSection() {
  const t = useT()
  const lang = useLang()
  const setLang = useApp((s) => s.setLang)
  const currency = useApp((s) => s.settings.currency)
  const weekStartsOn = useApp((s) => s.settings.weekStartsOn)
  const setSettings = useApp((s) => s.setSettings)
  const meta = SECTIONS.find((s) => s.id === 'language')!
  const langFlash = useFlash('lang')
  const now = new Date()

  return (
    <>
      <SectionHeader icon={meta.icon} color={meta.color} title={t('settings.nav.language')} description={t('settings.language.desc')} />

      <SettingsCard>
        <motion.div ref={langFlash.ref} animate={langFlash.controls} id="set-lang" className="relative z-[1] -m-2 rounded-[22px] p-2">
          <GroupLabel>{t('settings.language.title')}</GroupLabel>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup">
            {LANGUAGES.map((l, i) => {
              const selected = l.id === lang
              return (
                <OptionCard key={l.id} selected={selected} onClick={() => setLang(l.id)} ariaLabel={l.native}>
                  <div className="p-4">
                    <motion.span
                      className="block text-[44px] leading-none"
                      animate={selected ? { rotate: [0, -12, 10, 0], scale: [1, 1.18, 1] } : { rotate: 0, scale: 1 }}
                      transition={{ duration: 0.6, delay: i * 0.03 }}
                    >
                      {l.flag}
                    </motion.span>
                    <p className="mt-3 text-[17px] font-medium tracking-[-0.02em] text-ink">{l.native}</p>
                    <p className="text-[12.5px] text-ink-3">
                      {l.label} · <span className="font-mono uppercase">{l.id}</span>
                    </p>
                    <p className="mt-3 truncate rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-[12.5px] text-ink-2">
                      “{translate(l.id, 'core.greeting.morning', { name: ME_NAME })}”
                    </p>
                  </div>
                </OptionCard>
              )
            })}
          </div>
          <p className="mt-3 flex items-start gap-2 px-1 text-[12.5px] text-ink-3">
            <Info className="mt-0.5 size-3.5 shrink-0" /> {t('settings.language.contentNote')}
          </p>
        </motion.div>
      </SettingsCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsCard>
          <SettingRow
            id="currency"
            icon={Coins}
            color="#2FB36B"
            title={t('settings.language.currency')}
            description={t('settings.language.currencyDesc')}
            stack
            control={
              <Segmented<'EUR' | 'USD'>
                size="sm"
                value={currency}
                onChange={(v) => setSettings({ currency: v })}
                options={[
                  { value: 'EUR', label: '€ EUR' },
                  { value: 'USD', label: '$ USD' },
                ]}
              />
            }
          />
          <div className="tile relative z-[1] mt-2 flex items-end justify-between gap-3 p-4">
            <div>
              <p className="text-[12px] text-ink-3">{t('settings.language.sample')}</p>
              <p className="mt-1 text-[30px] font-medium leading-none tracking-[-0.04em] text-ink">
                <AnimatedCounter key={currency + lang} value={12480} currency={currency} startOnView={false} />
              </p>
            </div>
            <p className="font-mono text-[12px] text-ink-3">{formatMoney(960, currency, lang)}</p>
          </div>
        </SettingsCard>

        <SettingsCard>
          <SettingRow
            id="week"
            icon={CalendarDays}
            color="#31A8FF"
            title={t('settings.language.week')}
            description={t('settings.language.weekDesc')}
            stack
            control={
              <Segmented<'1' | '0'>
                size="sm"
                value={String(weekStartsOn) as '1' | '0'}
                onChange={(v) => setSettings({ weekStartsOn: v === '1' ? 1 : 0 })}
                options={[
                  { value: '1', label: t('settings.language.monday') },
                  { value: '0', label: t('settings.language.sunday') },
                ]}
              />
            }
          />
          <WeekStrip start={weekStartsOn} />
        </SettingsCard>
      </div>

      <SettingsCard>
        <GroupLabel>{t('settings.language.formats')}</GroupLabel>
        <div className="relative z-[1] grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
          {[
            { icon: CalendarDays, label: t('settings.language.fmtDate'), value: fmt(now, lang === 'en' ? 'EEE, MMM d, yyyy' : lang === 'de' ? 'EEE, d. MMM yyyy' : 'd MMM yyyy, EEE', lang) },
            { icon: Globe2, label: t('settings.language.fmtTime'), value: fmt(now, 'HH:mm', lang) },
            { icon: Hash, label: t('settings.language.fmtNumber'), value: formatNumber(1234567.89, lang, { maximumFractionDigits: 2 }) },
            { icon: Coins, label: t('settings.language.fmtMoney'), value: formatMoney(2450.5, currency, lang) },
          ].map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, ...spring.smooth }}
              className="tile flex items-center gap-3 p-3.5"
            >
              <f.icon className="size-4 shrink-0 text-ink-3" />
              <div className="min-w-0">
                <p className="text-[11.5px] text-ink-3">{f.label}</p>
                <p className="truncate font-mono text-[13px] text-ink">{f.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <Divider className="my-4" />
        <p className="relative z-[1] text-[12.5px] text-ink-3">{t('settings.language.formatsNote')}</p>
      </SettingsCard>
    </>
  )
}

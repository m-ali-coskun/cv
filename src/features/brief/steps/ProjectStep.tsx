import { useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { format } from 'date-fns'
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  Coins,
  FileText,
  Flag,
  Hash,
  Lightbulb,
  Loader2,
  PenLine,
  RefreshCw,
  Repeat,
  Sparkles,
  Square,
  Undo2,
  Wand2,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { formatMoney } from '@/lib/format'
import { shortDate } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { DISCIPLINE_IDS, type DisciplineId, type Priority } from '@/store/types'
import { disciplineTheme } from '@/theme/disciplines'
import { Input, Textarea } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { TagInput } from '@/components/ui/TagInput'
import { Slider } from '@/components/ui/Slider'
import { DatePicker } from '@/components/ui/DatePicker'
import { Menu } from '@/components/ui/Menu'
import { Button } from '@/components/ui/Button'
import { DisciplineIcon, Pill } from '@/components/ui/Badge'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { useWizard } from '../draftStore'
import { budgetAdvice, deadlineInfo, dueInDays, LIMITS, STEP, TAG_SUGGESTIONS, tomorrow } from '../model'
import { generateDescription, generateSummary, type AiTone } from '../ai'
import { CharCount, FieldError, FieldLabel, NumberStepper, Section, StepHeader, stepStagger, useBriefDesigner, useTypewriter } from '../ui'

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']

export function ProjectStep({ showErrors, errors }: { showErrors: boolean; errors: Record<string, string | undefined> }) {
  const t = useT()
  const draft = useWizard((s) => s.draft)
  const set = useWizard((s) => s.set)
  const touched = useWizard((s) => s.touched)
  const touch = useWizard((s) => s.touch)
  const designer = useBriefDesigner()
  const show = (f: string) => !!errors[f] && (showErrors || !!touched[f])

  return (
    <motion.div variants={stepStagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
        <StepHeader index={STEP.project} icon={<PenLine />} title={t('brief.project.title')} subtitle={t('brief.project.subtitle')} />
      </motion.div>

      <Section title={t('brief.project.basics')} hint={t('brief.project.basicsHint')} icon={<FileText />}>
        <div className="grid gap-4">
          <div>
            <FieldLabel htmlFor="brief-title" required right={<CharCount value={draft.title} max={LIMITS.title} />}>
              {t('brief.project.fTitle')}
            </FieldLabel>
            <Input
              id="brief-title"
              value={draft.title}
              maxLength={LIMITS.title}
              onChange={(e) => set({ title: e.target.value })}
              onBlur={() => touch('title')}
              placeholder={t('brief.project.titlePh')}
              aria-invalid={show('title')}
              className={cn('h-12 text-[16px] font-medium', show('title') && 'border-danger')}
            />
            <FieldError show={show('title')}>{t('brief.err.title')}</FieldError>
          </div>

          <div>
            <FieldLabel
              htmlFor="brief-summary"
              required
              right={
                <span className="flex items-center gap-2">
                  {!draft.summary.trim() && (draft.title.trim() || draft.deliverables.length > 0) && (
                    <button type="button" onClick={() => set({ summary: generateSummary(draft) })} className="flex items-center gap-1 text-[12px] font-medium text-[var(--accent-text)] hover:underline">
                      <Wand2 className="size-3.5" /> {t('brief.project.suggest')}
                    </button>
                  )}
                  <CharCount value={draft.summary} max={LIMITS.summary} />
                </span>
              }
            >
              {t('brief.project.fSummary')}
            </FieldLabel>
            <Input
              id="brief-summary"
              value={draft.summary}
              maxLength={LIMITS.summary}
              onChange={(e) => set({ summary: e.target.value })}
              onBlur={() => touch('summary')}
              placeholder={t('brief.project.summaryPh')}
              aria-invalid={show('summary')}
              className={cn(show('summary') && 'border-danger')}
            />
            <FieldError show={show('summary')}>{t('brief.err.summary')}</FieldError>
          </div>

          <DescriptionField show={show('description')} />

          <div>
            <FieldLabel required>{t('brief.project.fDiscipline')}</FieldLabel>
            <DisciplinePicker value={draft.discipline} core={designer?.disciplines ?? []} onChange={(d) => set({ discipline: d })} />
            <FieldError show={show('discipline')}>{t('brief.err.discipline')}</FieldError>
          </div>

          <div data-no-enter>
            <FieldLabel right={<span className="font-mono text-[11.5px] text-ink-3">{draft.tags.length}/8</span>}>{t('brief.project.fTags')}</FieldLabel>
            <TagInput
              value={draft.tags}
              onChange={(tags) => set({ tags })}
              suggestions={TAG_SUGGESTIONS[draft.discipline ?? 'visual']}
              quickPicks={5}
              max={8}
              transform="lowercase"
              icon={<Hash className="size-4" />}
              placeholder={t('brief.project.tagsPh')}
            />
          </div>
        </div>
      </Section>

      <Section title={t('brief.project.terms')} hint={t('brief.project.termsHint')} icon={<Coins />}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <FieldLabel>{t('brief.project.fPriority')}</FieldLabel>
            <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
              <Segmented
                value={draft.priority}
                onChange={(p) => set({ priority: p })}
                pill={draft.priority === 'urgent' ? 'accent' : 'night'}
                options={PRIORITIES.map((p) => ({
                  value: p,
                  label: t(`core.priority.${p}`),
                  icon: <Flag className={cn('size-3.5', p === 'urgent' && 'fill-current')} />,
                }))}
              />
            </div>
            <p className="mt-1.5 text-[12.5px] text-ink-3">{t(`brief.project.priorityHint.${draft.priority}`)}</p>
          </div>
          <BudgetField show={show('budget')} />
          <DeadlineField show={show('dueAt')} errorKey={errors.dueAt} />
          <div className="lg:col-span-2">
            <FieldLabel right={<span className="text-[12px] text-ink-3">{t('brief.project.revisionsHint')}</span>}>{t('brief.project.fRevisions')}</FieldLabel>
            <NumberStepper value={draft.revisionLimit} min={LIMITS.revisionsMin} max={LIMITS.revisionsMax} onChange={(v) => set({ revisionLimit: v })} label={t('brief.project.fRevisions')} />
          </div>
        </div>
      </Section>
    </motion.div>
  )
}

// ─────────────────────────── discipline picker ───────────────────────────

export function DisciplinePicker({ value, core, onChange }: { value: DisciplineId | null; core: DisciplineId[]; onChange: (d: DisciplineId) => void }) {
  const t = useT()
  return (
    <LayoutGroup id="brief-discipline">
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {DISCIPLINE_IDS.map((id) => {
          const th = disciplineTheme(id)
          const active = value === id
          return (
            <motion.button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={spring.snappy}
              className={cn(
                'relative inline-flex h-10 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-[13px] font-medium transition-colors',
                active ? '' : 'bg-[var(--surface-2)] text-ink-2 hover:text-ink',
              )}
              style={active ? { color: th.ink } : undefined}
            >
              {active && (
                <motion.span
                  layoutId="disc-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: th.accent, boxShadow: `0 10px 24px -12px ${th.accent}, inset 0 1px 0 rgba(255,255,255,.5)` }}
                  transition={spring.pill}
                />
              )}
              <span className="relative z-[1] flex items-center gap-2">
                <DisciplineIcon id={id} size={26} />
                {t(th.labelKey)}
                {core.includes(id) && (
                  <span className={cn('size-1.5 rounded-full', active ? 'bg-current' : 'bg-[var(--success)]')} title={t('brief.project.coreSkill')} />
                )}
              </span>
            </motion.button>
          )
        })}
      </div>
      {core.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-3">
          <span className="size-1.5 rounded-full bg-[var(--success)]" />
          {t('brief.project.coreLegend')}
        </p>
      )}
    </LayoutGroup>
  )
}

// ─────────────────────────── description + AI ───────────────────────────

const TONES: AiTone[] = ['balanced', 'concise', 'detailed', 'friendly']

function DescriptionField({ show }: { show: boolean }) {
  const t = useT()
  const draft = useWizard((s) => s.draft)
  const set = useWizard((s) => s.set)
  const touch = useWizard((s) => s.touch)
  const designer = useBriefDesigner()
  const motionLevel = useApp((s) => s.settings.motion)
  const [tone, setTone] = useState<AiTone>('balanced')
  const [typing, setTyping] = useState(false)
  const [prev, setPrev] = useState<string | null>(null)
  const [seed, setSeed] = useState(0)
  const [target, setTarget] = useState('')
  const tw = useTypewriter(
    (s) => set({ description: s }),
    () => setTyping(false),
  )

  const write = (nextSeed = seed) => {
    const text = generateDescription(draft, designer, tone, nextSeed)
    setPrev(draft.description)
    setTarget(text)
    setTyping(true)
    tw.start(text, motionLevel === 'off')
  }

  const words = draft.description.trim() ? draft.description.trim().split(/\s+/).length : 0
  const canWrite = !!(draft.title.trim() || draft.deliverables.length || draft.discipline)

  return (
    <div>
      <FieldLabel htmlFor="brief-desc" required right={<span className="font-mono text-[11.5px] text-ink-3">{t('brief.project.words', { count: words })}</span>}>
        {t('brief.project.fDescription')}
      </FieldLabel>

      {/* AI bar */}
      <div className="glass-night relative mb-2 flex flex-wrap items-center gap-2 overflow-hidden rounded-[18px] p-1.5 pl-3">
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -left-10 top-0 h-full w-24 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--accent)_35%,transparent),transparent)]"
          animate={typing ? { x: ['0%', '900%'] } : { x: '0%', opacity: 0 }}
          transition={typing ? { duration: 1.4, repeat: Infinity, ease: 'linear' } : { duration: 0.2 }}
        />
        <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-on-night">
          <motion.span animate={typing ? { rotate: 360 } : { rotate: 0 }} transition={typing ? { duration: 2.2, repeat: Infinity, ease: 'linear' } : spring.smooth} className="flex text-accent">
            <Sparkles className="size-4" />
          </motion.span>
          <span className="truncate">{typing ? t('brief.ai.writing') : prev !== null ? t('brief.ai.done') : t('brief.ai.label')}</span>
        </span>
        <Menu
          align="end"
          width={230}
          trigger={({ onClick, open }) => (
            <button type="button" onClick={onClick} disabled={typing} className="inline-flex h-8 items-center gap-1 rounded-full bg-white/10 px-3 text-[12.5px] font-medium text-on-night transition-colors hover:bg-white/20 disabled:opacity-50" aria-expanded={open}>
              {t(`brief.ai.tone.${tone}`)}
              <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
            </button>
          )}
          items={TONES.map((x) => ({ label: t(`brief.ai.tone.${x}`), hint: t(`brief.ai.toneHint.${x}`), active: x === tone, onClick: () => setTone(x) }))}
        />
        <AnimatePresence mode="popLayout" initial={false}>
          {typing ? (
            <motion.button
              key="stop"
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => tw.finish(target)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-medium text-[#0b0b0c]"
            >
              <Square className="size-3 fill-current" /> {t('brief.ai.skip')}
            </motion.button>
          ) : (
            <motion.div key="go" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-1">
              {prev !== null && (
                <>
                  <button type="button" onClick={() => (set({ description: prev }), setPrev(null))} title={t('brief.ai.undo')} aria-label={t('brief.ai.undo')} className="flex size-8 items-center justify-center rounded-full text-on-night/80 hover:bg-white/10">
                    <Undo2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const s = seed + 1
                      setSeed(s)
                      write(s)
                    }}
                    title={t('brief.ai.again')}
                    aria-label={t('brief.ai.again')}
                    className="flex size-8 items-center justify-center rounded-full text-on-night/80 hover:bg-white/10"
                  >
                    <RefreshCw className="size-4" />
                  </button>
                </>
              )}
              <Button size="sm" variant="accent" disabled={!canWrite} icon={<Wand2 className="size-3.5" />} onClick={() => write()}>
                {draft.description.trim() ? t('brief.ai.rewrite') : t('brief.ai.write')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative">
        <Textarea
          id="brief-desc"
          value={draft.description}
          readOnly={typing}
          maxLength={LIMITS.description}
          onChange={(e) => set({ description: e.target.value })}
          onBlur={() => touch('description')}
          placeholder={t('brief.project.descPh')}
          aria-invalid={show}
          className={cn('min-h-[220px] max-h-[560px] text-[14px] [field-sizing:content]', typing && 'border-[var(--accent-line)] shadow-[0_0_0_4px_var(--accent-softer)]', show && 'border-danger')}
        />
        {typing && <span className="pointer-events-none absolute bottom-3 right-4 h-4 w-[2px] animate-pulse bg-[var(--accent)]" aria-hidden />}
      </div>
      {!canWrite && <p className="mt-1.5 text-[12px] text-ink-3">{t('brief.ai.needInput')}</p>}
      <FieldError show={show}>{t('brief.err.description')}</FieldError>
    </div>
  )
}

// ─────────────────────────── budget ───────────────────────────

function BudgetField({ show }: { show: boolean }) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const draft = useWizard((s) => s.draft)
  const set = useWizard((s) => s.set)
  const designer = useBriefDesigner()
  const advice = budgetAdvice(draft, designer)
  const money = (n: number) => formatMoney(n, currency, lang)
  const [text, setText] = useState<string | null>(null)

  const setBudget = (v: number) => set({ budget: Math.max(0, Math.round(v)), budgetTouched: true })

  return (
    <div>
      <FieldLabel htmlFor="brief-budget" required>
        {t('brief.project.fBudget')}
      </FieldLabel>
      <div className="tile p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="text-[34px] font-medium leading-none tracking-[-0.03em]">
            <AnimatedCounter value={Math.round(draft.budget)} currency={currency} startOnView={false} />
          </div>
          <div className="w-32">
            <Input
              id="brief-budget"
              inputMode="numeric"
              value={text ?? String(Math.round(draft.budget))}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '')
                setText(raw)
                if (raw) setBudget(Number(raw))
              }}
              onBlur={() => setText(null)}
              aria-label={t('brief.project.fBudget')}
              className="h-10 text-right font-mono"
              right={<span className="pr-1.5 text-[12px] text-ink-3">{currency === 'EUR' ? '€' : '$'}</span>}
            />
          </div>
        </div>
        <div className="mt-4">
          <Slider
            value={Math.min(LIMITS.budgetMax, Math.max(LIMITS.budgetMin, draft.budget))}
            onChange={(v: number) => setBudget(v)}
            min={LIMITS.budgetMin}
            max={LIMITS.budgetMax}
            step={50}
            format={(v) => formatMoney(v, currency, lang, true)}
            ariaLabel={t('brief.project.fBudget')}
            marks={[{ value: advice.suggested, label: t('brief.project.suggestedMark') }]}
          />
        </div>
        <FairMeter budget={draft.budget} low={advice.low} high={advice.high} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12.5px] text-ink-3">
            {t('brief.project.estimate', { hours: advice.hours, rate: formatMoney(advice.rate, designer?.currency ?? currency, lang) })} · <span className="font-mono">{money(advice.low)}–{money(advice.high)}</span>
          </p>
          {draft.budget !== advice.suggested && (
            <Button size="xs" variant="soft" icon={<Lightbulb className="size-3.5" />} onClick={() => set({ budget: advice.suggested, budgetTouched: false })}>
              {t('brief.project.useSuggested', { amount: money(advice.suggested) })}
            </Button>
          )}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={advice.verdict}
            initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
            transition={{ duration: 0.25 }}
            className={cn(
              'mt-3 rounded-xl px-3 py-2 text-[12.5px] font-medium',
              advice.verdict === 'low' && 'bg-warning-soft text-[color-mix(in_oklab,var(--warning)_60%,var(--ink))]',
              advice.verdict === 'fair' && 'bg-success-soft text-[color-mix(in_oklab,var(--success)_70%,var(--ink))]',
              advice.verdict === 'generous' && 'bg-accent-soft text-[var(--accent-text)]',
            )}
          >
            {t(`brief.project.verdict.${advice.verdict}`, { name: designer?.name.split(' ')[0] ?? t('brief.common.theDesigner') })}
          </motion.p>
        </AnimatePresence>
      </div>
      <FieldError show={show}>{t('brief.err.budget')}</FieldError>
    </div>
  )
}

/** Three-zone "fair price" meter with a springy marker. */
function FairMeter({ budget, low, high }: { budget: number; low: number; high: number }) {
  const t = useT()
  const min = Math.max(0, low * 0.45)
  const max = high * 1.6
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
  return (
    <div className="mt-4" aria-hidden>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <span className="absolute inset-y-0 left-0 bg-[color-mix(in_oklab,var(--warning)_55%,transparent)]" style={{ width: `${pct(low)}%` }} />
        <span className="absolute inset-y-0 bg-[color-mix(in_oklab,var(--success)_60%,transparent)]" style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }} />
        <span className="absolute inset-y-0 right-0 bg-accent-soft" style={{ left: `${pct(high)}%` }} />
      </div>
      <div className="relative h-5">
        <motion.span className="absolute top-0 -ml-[7px] block size-0 border-x-[7px] border-b-[9px] border-x-transparent border-b-[var(--ink)]" initial={false} animate={{ left: `${pct(budget)}%` }} transition={spring.bouncy} />
      </div>
      <div className="flex justify-between text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3">
        <span>{t('brief.project.zone.low')}</span>
        <span className="text-[color-mix(in_oklab,var(--success)_70%,var(--ink))]">{t('brief.project.zone.fair')}</span>
        <span>{t('brief.project.zone.generous')}</span>
      </div>
    </div>
  )
}

// ─────────────────────────── deadline ───────────────────────────

function DeadlineField({ show, errorKey }: { show: boolean; errorKey?: string }) {
  const t = useT()
  const lang = useLang()
  const draft = useWizard((s) => s.draft)
  const set = useWizard((s) => s.set)
  const touch = useWizard((s) => s.touch)
  const designer = useBriefDesigner()
  const jobs = useApp((s) => s.jobs)
  const info = deadlineInfo(draft, designer)
  const first = designer?.name.split(' ')[0] ?? t('brief.common.theDesigner')

  const markers = useMemo(() => {
    const out: Record<string, string> = {}
    if (!designer) return out
    for (const j of jobs) {
      if (j.designerId !== designer.id || ['approved', 'declined', 'cancelled'].includes(j.status)) continue
      out[format(new Date(j.dueAt), 'yyyy-MM-dd')] = 'var(--warning)'
    }
    return out
  }, [jobs, designer])
  const busy = Object.keys(markers).length
  const recIso = dueInDays(info.rec)

  return (
    <div>
      <FieldLabel htmlFor="brief-due" required right={info.days !== null && info.days >= 1 ? <span className="font-mono text-[11.5px] text-ink-3">{t('brief.project.daysAway', { count: info.days })}</span> : undefined}>
        {t('brief.project.fDeadline')}
      </FieldLabel>
      <div data-no-enter>
        <DatePicker
          id="brief-due"
          value={draft.dueAt}
          onChange={(iso) => {
            set({ dueAt: iso })
            touch('dueAt')
          }}
          min={tomorrow()}
          withTime
          markers={markers}
          placeholder={t('brief.project.duePh')}
        />
      </div>
      <FieldError show={show}>{t(errorKey ?? 'brief.err.dueAt')}</FieldError>

      <div className="mt-3 flex flex-col gap-2">
        <div className="tile flex items-center justify-between gap-2 px-3 py-2.5">
          <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-2">
            <CalendarClock className="size-4 shrink-0 text-ink-3" />
            <span className="truncate">{t('brief.project.recommended', { name: first, count: info.rec })}</span>
          </span>
          {(!draft.dueAt || info.tight) && (
            <Button size="xs" variant="soft" onClick={() => (set({ dueAt: recIso }), touch('dueAt'))}>
              {shortDate(recIso, lang)}
            </Button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {designer && designer.availability !== 'available' && (
            <motion.div key="avail" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className={cn('flex items-start gap-2 rounded-2xl px-3 py-2.5 text-[12.5px]', designer.availability === 'booked' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-[color-mix(in_oklab,var(--warning)_60%,var(--ink))]')}>
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{t(`brief.project.avail.${designer.availability}`, { name: first })}</span>
              </div>
            </motion.div>
          )}
          {info.tight && !info.past && (
            <motion.div key="tight" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-start gap-2 rounded-2xl bg-warning-soft px-3 py-2.5 text-[12.5px] text-[color-mix(in_oklab,var(--warning)_60%,var(--ink))]">
                <Loader2 className="mt-0.5 size-4 shrink-0" />
                <span>{t('brief.project.tight', { name: first, count: info.rec })}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {busy > 0 && (
          <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
            <span className="size-1.5 rounded-full bg-[var(--warning)]" />
            {t('brief.project.busyLegend', { name: first, count: busy })}
          </p>
        )}
        {draft.priority === 'urgent' && (
          <Pill tone="danger" size="sm" icon={<Repeat className="size-3" />} className="self-start">
            {t('brief.project.rush')}
          </Pill>
        )}
      </div>
    </div>
  )
}

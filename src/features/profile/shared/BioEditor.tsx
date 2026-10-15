import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { RotateCcw, Shuffle, Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Label } from '@/components/ui/Field'
import { Tooltip } from '@/components/ui/Tooltip'
import { BIO_GREAT, BIO_MAX, BIO_MIN, analyzeBio, type Tone } from './data'

/**
 * Types `target` out over ~1.4s (instant when motion is off / reduced).
 * Calls onFrame with the growing text and onDone at the end.
 */
export function useTypewriter() {
  const reduce = useReducedMotion()
  const motionOff = useApp((s) => s.settings.motion) === 'off'
  const timer = useRef<number | undefined>(undefined)
  const [typing, setTyping] = useState(false)
  useEffect(() => () => window.clearInterval(timer.current), [])
  const run = (target: string, onFrame: (s: string) => void, onDone: () => void) => {
    window.clearInterval(timer.current)
    if (reduce || motionOff) {
      onFrame(target)
      onDone()
      return
    }
    setTyping(true)
    let i = 0
    const step = Math.max(2, Math.ceil(target.length / 85))
    timer.current = window.setInterval(() => {
      // advance to the next word boundary-ish for a natural rhythm
      i = Math.min(target.length, i + step + (Math.random() < 0.3 ? 2 : 0))
      onFrame(target.slice(0, i))
      if (i >= target.length) {
        window.clearInterval(timer.current)
        setTyping(false)
        onDone()
      }
    }, 18)
  }
  const cancel = () => {
    window.clearInterval(timer.current)
    setTyping(false)
  }
  return { typing, run, cancel }
}

const LEVEL_TONE = {
  empty: 'text-ink-3',
  short: 'text-warning',
  ok: 'text-ink-2',
  great: 'text-success',
  long: 'text-danger',
} as const

/**
 * Bio textarea with live quality guidance (length meter + 5 checks) and the
 * "Polish with AI" helper: pick a tone, watch it type, undo or re-roll.
 */
export function BioEditor({
  value,
  onChange,
  onBlur,
  generate,
  label,
  placeholder,
  rows = 7,
  checks = true,
  error,
  className,
}: {
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  /** Template "AI" writer. */
  generate: (tone: Tone, variant: number) => string
  label?: React.ReactNode
  placeholder?: string
  rows?: number
  checks?: boolean
  error?: React.ReactNode
  className?: string
}) {
  const t = useT()
  const id = useId()
  const [tone, setTone] = useState<Tone>('friendly')
  const [variant, setVariant] = useState(0)
  const [display, setDisplay] = useState<string | null>(null)
  const [undo, setUndo] = useState<string | null>(null)
  const tw = useTypewriter()
  const text = display ?? value
  const a = useMemo(() => analyzeBio(text), [text])
  const pct = Math.min(100, (a.chars / BIO_GREAT) * 100)

  const polish = (nextTone = tone, nextVariant = variant) => {
    const before = undo ?? value
    const target = generate(nextTone, nextVariant)
    setUndo(before)
    setDisplay('')
    tw.run(
      target,
      (s) => setDisplay(s),
      () => {
        setDisplay(null)
        onChange(target)
        onBlur?.()
      },
    )
  }

  return (
    <div className={className}>
      <Label htmlFor={id} hint={<span className={cn('font-mono text-[11.5px] tabular-nums', LEVEL_TONE[a.level])}>{t('profile.bio.count', { n: a.chars, max: BIO_MAX })}</span>}>
        {label ?? t('profile.bio.label')}
      </Label>
      <div className="relative">
        <textarea
          id={id}
          value={text}
          rows={rows}
          readOnly={tw.typing}
          placeholder={placeholder ?? t('profile.bio.placeholder')}
          onChange={(e) => {
            setUndo(null)
            onChange(e.target.value)
          }}
          onBlur={onBlur}
          className={cn(
            'w-full resize-y rounded-2xl border border-line bg-[var(--surface)]/70 px-4 py-3 text-[14px] leading-relaxed text-ink outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-ink-3 focus:border-[var(--accent-line)] focus:bg-[var(--surface)] focus:shadow-[0_0_0_4px_var(--accent-softer)]',
            tw.typing && 'border-[var(--accent-line)] shadow-[0_0_0_4px_var(--accent-softer)]',
            error && 'border-danger',
          )}
        />
        <AnimatePresence>
          {tw.typing && (
            <motion.span
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.9 }}
              className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-night px-2.5 py-1 text-[11.5px] font-medium text-on-night shadow-lg"
            >
              <Sparkles className="size-3 animate-pulse text-accent" />
              {t('profile.bio.writing')}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}

      {/* length meter */}
      <div className="mt-2.5 flex items-center gap-3">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: a.level === 'long' ? 'var(--danger)' : a.level === 'great' ? 'var(--success)' : a.chars < BIO_MIN ? 'var(--warning)' : 'var(--accent)' }}
            animate={{ width: `${pct}%` }}
            transition={spring.smooth}
          />
          <span className="absolute inset-y-0 w-px bg-ink/25" style={{ left: `${(BIO_MIN / BIO_GREAT) * 100}%` }} aria-hidden />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={a.level}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={cn('shrink-0 text-[12px] font-medium', LEVEL_TONE[a.level])}
          >
            {t(`profile.bio.level.${a.level}`)}
          </motion.span>
        </AnimatePresence>
      </div>

      {checks && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {a.checks.map((c) => (
            <Tooltip key={c.id} content={t(`profile.bio.check.${c.id}Hint`)}>
              <motion.span
                layout
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors',
                  c.ok ? 'bg-success-soft text-[color-mix(in_oklab,var(--success)_70%,var(--ink))]' : 'bg-[var(--surface-2)] text-ink-3',
                )}
              >
                <motion.span key={String(c.ok)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={spring.bouncy} className={cn('size-1.5 rounded-full', c.ok ? 'bg-success' : 'bg-ink-4')} />
                {t(`profile.bio.check.${c.id}`)}
              </motion.span>
            </Tooltip>
          ))}
        </div>
      )}

      {/* AI helper */}
      <motion.div layout className="mt-4 flex flex-col gap-3 rounded-[20px] bg-night p-3 text-on-night sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink">
            <Wand2 className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[13.5px] font-medium">{t('profile.ai.title')}</div>
            <div className="truncate text-[12px] text-white/55">{t('profile.ai.subtitle')}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Tone>
            size="sm"
            pill="accent"
            value={tone}
            onChange={(v) => setTone(v)}
            className="bg-white/10 [&_button[aria-selected=false]]:text-white/70"
            options={[
              { value: 'friendly', label: t('profile.ai.tone.friendly') },
              { value: 'professional', label: t('profile.ai.tone.professional') },
              { value: 'bold', label: t('profile.ai.tone.bold') },
            ]}
          />
          <Button size="sm" variant="accent" loading={tw.typing} icon={<Sparkles className="size-3.5" />} onClick={() => polish()}>
            {value.trim() ? t('profile.ai.polish') : t('profile.ai.write')}
          </Button>
        </div>
      </motion.div>
      <AnimatePresence initial={false}>
        {undo !== null && !tw.typing && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl bg-accent-softer px-3 py-2 text-[12.5px]">
              <Sparkles className="size-3.5 text-accent-text" />
              <span className="mr-auto text-ink-2">{t('profile.ai.done')}</span>
              <Button
                size="xs"
                variant="ghost"
                icon={<Shuffle className="size-3.5" />}
                onClick={() => {
                  const v = variant + 1
                  setVariant(v)
                  polish(tone, v)
                }}
              >
                {t('profile.ai.another')}
              </Button>
              <Button
                size="xs"
                variant="outline"
                icon={<RotateCcw className="size-3.5" />}
                onClick={() => {
                  onChange(undo)
                  onBlur?.()
                  setUndo(null)
                }}
              >
                {t('core.action.undo')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Download, ListTodo, Plus, Sparkle } from 'lucide-react'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { Glass } from '@/components/ui/Glass'
import { Button, IconButton } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Kbd } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { KINDS, KIND_COLOR, type CalView, type EventKind } from './model'
import { KindIcon } from './ui'

export function Toolbar({
  title,
  subtitle,
  dir,
  view,
  onView,
  onStep,
  onToday,
  isCurrent,
  hidden,
  onToggleKind,
  counts,
  showAuto,
  onToggleAuto,
  autoCount,
  onNew,
  onExport,
}: {
  title: string
  subtitle: string
  dir: number
  view: CalView
  onView: (v: CalView) => void
  onStep: (d: 1 | -1) => void
  onToday: () => void
  isCurrent: boolean
  hidden: EventKind[]
  onToggleKind: (k: EventKind) => void
  counts: Record<EventKind, number>
  showAuto: boolean
  onToggleAuto: () => void
  autoCount: number
  onNew: () => void
  onExport: () => void
}) {
  const t = useT()
  return (
    <Glass className="relative z-[2] p-3 sm:p-4">
      <div className="relative z-[1] flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5">
          <Tooltip content={<span className="flex items-center gap-1.5">{t('calendar.today')} <Kbd className="h-5 min-w-5 text-[10px]">T</Kbd></span>} side="bottom">
            <Button size="sm" variant={isCurrent ? 'glass' : 'soft'} onClick={onToday} className="max-sm:px-3">
              {t('calendar.today')}
            </Button>
          </Tooltip>
          <IconButton label={t('calendar.prev')} variant="soft" size="sm" onClick={() => onStep(-1)}>
            <ChevronLeft className="size-4" />
          </IconButton>
          <IconButton label={t('calendar.next')} variant="soft" size="sm" onClick={() => onStep(1)}>
            <ChevronRight className="size-4" />
          </IconButton>
        </div>

        <div className="relative order-first h-[46px] min-w-0 flex-1 overflow-hidden basis-full sm:order-none sm:basis-auto">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={title}
              custom={dir}
              initial={{ y: dir >= 0 ? 26 : -26, opacity: 0, filter: 'blur(6px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)', transition: { duration: 0.45, ease: EASE_OUT } }}
              exit={{ y: dir >= 0 ? -22 : 22, opacity: 0, filter: 'blur(6px)', transition: { duration: 0.2 } }}
              className="absolute inset-0 flex flex-col justify-center"
            >
              <h2 className="truncate text-[22px] font-medium leading-tight tracking-[-0.03em] sm:text-[24px]">{title}</h2>
              <p className="truncate font-mono text-[11px] text-ink-3">{subtitle}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Segmented
            size="sm"
            value={view}
            onChange={onView}
            layoutId="cal-view"
            options={[
              { value: 'month', label: <span className="max-sm:sr-only">{t('calendar.view.month')}</span>, icon: <CalendarDays className="size-3.5" /> },
              { value: 'week', label: <span className="max-sm:sr-only">{t('calendar.view.week')}</span>, icon: <CalendarRange className="size-3.5" /> },
              { value: 'agenda', label: <span className="max-sm:sr-only">{t('calendar.view.agenda')}</span>, icon: <ListTodo className="size-3.5" /> },
            ]}
          />
          <IconButton label={t('calendar.export')} variant="soft" size="sm" onClick={onExport} className="max-sm:hidden">
            <Download className="size-4" />
          </IconButton>
          <Button size="sm" icon={<Plus className="size-4" />} onClick={onNew} className="max-sm:px-3">
            <span className="max-sm:hidden">{t('calendar.newEvent')}</span>
          </Button>
        </div>
      </div>

      <div className="relative z-[1] -mx-1 mt-3 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 no-scrollbar">
        {KINDS.map((k) => {
          const off = hidden.includes(k)
          return (
            <motion.button
              key={k}
              type="button"
              layout
              whileTap={{ scale: 0.94 }}
              transition={spring.snappy}
              onClick={() => onToggleKind(k)}
              aria-pressed={!off}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors',
                off ? 'border-dashed border-line-2 text-ink-3' : 'border-transparent bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)]',
              )}
            >
              <motion.span
                className="flex size-4 items-center justify-center rounded-full"
                animate={{ scale: off ? 0.6 : 1, background: off ? 'var(--surface-3)' : KIND_COLOR[k] }}
                transition={spring.bouncy}
              >
                {!off && <KindIcon kind={k} className="size-2.5 text-[#0b0b0c]" />}
              </motion.span>
              <span className={cn(off && 'line-through decoration-1')}>{t(`calendar.kind.${k}`)}</span>
              <span className="rounded-full bg-[var(--surface)] px-1.5 font-mono text-[10.5px] text-ink-3">{counts[k]}</span>
            </motion.button>
          )
        })}
        <span className="mx-1 h-5 w-px shrink-0 bg-[var(--line-2)]" />
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onToggleAuto}
          aria-pressed={showAuto}
          className={cn(
            'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors',
            showAuto ? 'bg-accent-soft text-accent-text' : 'border border-dashed border-line-2 text-ink-3',
          )}
        >
          <Sparkle className="size-3.5" />
          {t('calendar.autoToggle')}
          <span className="font-mono text-[10.5px] opacity-70">{autoCount}</span>
        </motion.button>
      </div>
    </Glass>
  )
}

import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { addDays, format, isAfter, startOfDay, startOfWeek, subWeeks } from 'date-fns'
import { cn } from '@/lib/cn'
import { DATE_LOCALES } from '@/lib/dates'
import { useLang } from '@/i18n'
import { useApp } from '@/store'
import { ChartTooltip, useElementSize } from './shared'

export interface HeatmapProps {
  /** Values keyed by day: 'yyyy-MM-dd' → number. */
  values: Record<string, number>
  /** Number of week columns (fewer are shown when the container is narrow). */
  weeks?: number
  /** Last day shown (defaults to today). */
  endDate?: Date
  /** Tooltip value text, e.g. (v) => `${v} hours`. */
  valueLabel?: (v: number) => string
  /** Base colour; levels are mixed from it. Default: theme accent. */
  color?: string
  /** Max cell size in px. */
  maxCell?: number
  /** Content shown left of the "Less … More" legend (e.g. a total). */
  summary?: ReactNode
  onCellClick?: (day: string, value: number) => void
  ariaLabel?: string
  className?: string
}

const L = {
  en: { less: 'Less', more: 'More', none: 'No activity' },
  de: { less: 'Weniger', more: 'Mehr', none: 'Keine Aktivität' },
  tr: { less: 'Az', more: 'Çok', none: 'Etkinlik yok' },
}

const GAP = 3
const LABEL_W = 30

/**
 * GitHub-style activity grid (weeks × weekdays) tinted with the accent.
 * Cells pop in column by column; hovering a cell enlarges it and shows the
 * date + value. Automatically shows fewer weeks on narrow screens.
 */
export function Heatmap({
  values,
  weeks = 26,
  endDate,
  valueLabel = (v) => String(v),
  color = 'var(--accent)',
  maxCell = 20,
  summary,
  onCellClick,
  ariaLabel = 'Activity heatmap',
  className,
}: HeatmapProps) {
  const lang = useLang()
  const locale = DATE_LOCALES[lang]
  const weekStartsOn = useApp((s) => s.settings.weekStartsOn)
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<{ key: string; x: number; y: number; v: number; date: Date } | null>(null)
  const s = L[lang]

  const minCell = 9
  const fit = width ? Math.max(4, Math.floor((width - LABEL_W + GAP) / (minCell + GAP))) : weeks
  const shownWeeks = Math.min(weeks, fit)
  const cell = width ? Math.max(minCell, Math.min(maxCell, Math.floor((width - LABEL_W - (shownWeeks - 1) * GAP) / shownWeeks))) : maxCell

  const end = useMemo(() => startOfDay(endDate ?? new Date()), [endDate])
  const { columns, max } = useMemo(() => {
    const start = startOfWeek(subWeeks(end, shownWeeks - 1), { weekStartsOn })
    const cols: { date: Date; key: string; v: number }[][] = []
    let mx = 0
    for (let w = 0; w < shownWeeks; w++) {
      const col: { date: Date; key: string; v: number }[] = []
      for (let d = 0; d < 7; d++) {
        const date = addDays(start, w * 7 + d)
        if (isAfter(date, end)) break
        const key = format(date, 'yyyy-MM-dd')
        const v = values[key] ?? 0
        if (v > mx) mx = v
        col.push({ date, key, v })
      }
      cols.push(col)
    }
    return { columns: cols, max: mx }
  }, [end, shownWeeks, weekStartsOn, values])

  const level = (v: number) => (v <= 0 || max <= 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)))
  const fill = (lv: number) =>
    lv === 0 ? 'var(--surface-3)' : lv === 4 ? color : `color-mix(in oklab, ${color} ${[0, 32, 56, 80][lv]}%, var(--surface-3))`

  const gridW = shownWeeks * cell + (shownWeeks - 1) * GAP
  const monthLabels = useMemo(() => {
    const raw = columns.map((col, i) => {
      const first = col.find((c) => c.date.getDate() === 1) ?? (i === 0 ? col[0] : undefined)
      return first ? format(first.date, 'MMM', { locale }) : ''
    })
    // drop labels that would collide with the next one (needs ~3 columns of room)
    return raw.map((m, i) => {
      if (!m) return ''
      const next = raw.findIndex((x, j) => j > i && !!x)
      if (next !== -1 && next - i < 3) return ''
      if (i > raw.length - 3) return ''
      return m
    })
  }, [columns, locale])
  // weekday labels on rows 1, 3, 5
  const weekdayLabels = [0, 1, 2, 3, 4, 5, 6].map((d) => format(addDays(startOfWeek(end, { weekStartsOn }), d), 'EEEEEE', { locale }))

  return (
    <div className={cn('w-full', className)}>
      <div ref={ref} className="relative w-full" role="group" aria-label={ariaLabel}>
        {width > 0 && (
          <>
            <div className="relative mb-1.5 h-4" style={{ marginLeft: LABEL_W, width: gridW }}>
              {monthLabels.map((m, i) =>
                m ? (
                  <span key={i} className="absolute top-0 font-mono text-[10.5px] text-ink-3" style={{ left: i * (cell + GAP) }}>
                    {m}
                  </span>
                ) : null,
              )}
            </div>
            <div className="flex">
              <div className="flex shrink-0 flex-col" style={{ width: LABEL_W, gap: GAP }}>
                {weekdayLabels.map((l, d) => (
                  <span key={d} className="font-mono text-[10px] leading-none text-ink-3" style={{ height: cell, lineHeight: `${cell}px` }}>
                    {d % 2 === 1 ? l : ''}
                  </span>
                ))}
              </div>
              <div className="flex" style={{ gap: GAP }} onPointerLeave={() => setHover(null)}>
                {columns.map((col, w) => (
                  <div key={w} className="flex flex-col" style={{ gap: GAP }}>
                    {col.map((c, d) => {
                      const lv = level(c.v)
                      const isHover = hover?.key === c.key
                      return (
                        <motion.button
                          type="button"
                          key={c.key}
                          aria-label={`${format(c.date, 'PPP', { locale })}: ${c.v ? valueLabel(c.v) : s.none}`}
                          className="block rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]"
                          style={{ width: cell, height: cell, background: fill(lv), cursor: onCellClick ? 'pointer' : 'default' }}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: isHover ? 1.45 : 1, opacity: 1, zIndex: isHover ? 2 : 0 }}
                          transition={{
                            scale: isHover
                              ? { type: 'spring', stiffness: 600, damping: 22 }
                              : { type: 'spring', stiffness: 380, damping: 20, delay: hover ? 0 : 0.15 + w * 0.018 + d * 0.012 },
                            opacity: { duration: 0.3, delay: 0.15 + w * 0.018 + d * 0.012 },
                          }}
                          onPointerEnter={() => setHover({ key: c.key, x: LABEL_W + w * (cell + GAP) + cell / 2, y: 22 + d * (cell + GAP), v: c.v, date: c.date })}
                          onFocus={() => setHover({ key: c.key, x: LABEL_W + w * (cell + GAP) + cell / 2, y: 22 + d * (cell + GAP), v: c.v, date: c.date })}
                          onBlur={() => setHover(null)}
                          onClick={() => onCellClick?.(c.key, c.v)}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        <ChartTooltip open={!!hover} placement="above" x={hover?.x ?? 0} y={hover?.y ?? 0} containerWidth={width} className="min-w-0 px-2.5 py-1.5">
          {hover && (
            <div className="flex flex-col">
              <span className="font-mono text-[12px] font-semibold text-ink">{hover.v ? valueLabel(hover.v) : s.none}</span>
              <span className="text-[11px] text-ink-3">{format(hover.date, 'EEE, PP', { locale })}</span>
            </div>
          )}
        </ChartTooltip>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-ink-3">
        <div className="min-w-0">{summary}</div>
        <div className="flex items-center gap-1.5">
          <span>{s.less}</span>
          {[0, 1, 2, 3, 4].map((lv) => (
            <span key={lv} className="size-[11px] rounded-[3px]" style={{ background: fill(lv) }} />
          ))}
          <span>{s.more}</span>
        </div>
      </div>
    </div>
  )
}

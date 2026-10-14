import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { DISCIPLINE_LIST } from '@/theme/disciplines'
import { DisciplineIcon } from '../ui/Badge'

/**
 * The creative-discipline tabs. Selecting one filters every page AND
 * re-themes the whole app (Photoshop blue, Premiere violet, …).
 */
export function DisciplineTabs({ className }: { className?: string }) {
  const t = useT()
  const discipline = useApp((s) => s.settings.discipline)
  const setDiscipline = useApp((s) => s.setDiscipline)
  const scroller = useRef<HTMLDivElement>(null)

  // keep the active tab visible on small screens
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-id="${discipline}"]`)
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [discipline])

  return (
    <div className={cn('glass glass-pill relative max-w-full overflow-hidden p-1', className)}>
      <div ref={scroller} role="tablist" aria-label="Disciplines" className="relative z-[1] flex gap-0.5 overflow-x-auto no-scrollbar">
        {DISCIPLINE_LIST.map((d) => {
          const active = d.id === discipline
          return (
            <button
              key={d.id}
              data-id={d.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setDiscipline(d.id)}
              className={cn(
                'group relative flex h-10 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-[13.5px] font-medium transition-colors duration-300',
                active ? 'text-accent-ink' : 'text-ink-2 hover:text-ink',
              )}
              title={d.id === 'all' ? undefined : t('core.discipline.inspired', { app: d.inspiredBy })}
            >
              {active && (
                <motion.span
                  layoutId="discipline-pill"
                  className="absolute inset-0 rounded-full bg-accent shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_8px_22px_-8px_var(--accent)]"
                  transition={spring.pill}
                />
              )}
              <motion.span className="relative z-[1]" whileHover={{ rotate: -8, scale: 1.1 }} animate={active ? { rotate: [0, -12, 8, 0] } : {}} transition={{ duration: 0.5 }}>
                <DisciplineIcon id={d.id} size={28} />
              </motion.span>
              <span className="relative z-[1] whitespace-nowrap">{t(d.labelKey)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

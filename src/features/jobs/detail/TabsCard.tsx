import { forwardRef, useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FileText, FolderOpen, History, Layers, Palette, Repeat2, Wallet, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { TABS, useJobCtx, type TabId } from './context'
import { useTabParam } from './hooks'
import { Card, TabCount } from './ui'
import { OverviewTab } from './tabs/OverviewTab'
import { DesignTab } from './tabs/DesignTab'
import { AssetsTab } from './tabs/AssetsTab'
import { DeliveriesTab } from './tabs/DeliveriesTab'
import { RevisionsTab } from './tabs/RevisionsTab'
import { TimelineTab } from './tabs/TimelineTab'
import { PaymentsTab } from './tabs/PaymentsTab'

const ICON: Record<TabId, LucideIcon> = {
  overview: FileText,
  design: Palette,
  assets: FolderOpen,
  deliveries: Layers,
  revisions: Repeat2,
  timeline: History,
  payments: Wallet,
}

const PANEL: Record<TabId, () => ReactNode> = {
  overview: () => <OverviewTab />,
  design: () => <DesignTab />,
  assets: () => <AssetsTab />,
  deliveries: () => <DeliveriesTab />,
  revisions: () => <RevisionsTab />,
  timeline: () => <TimelineTab />,
  payments: () => <PaymentsTab />,
}

/** The big tabbed card: sliding pill tabs (remembered in ?tab=) + focus-pull panels. */
export const TabsCard = forwardRef<HTMLDivElement>(function TabsCard(_, ref) {
  const t = useT()
  const { job, tab } = useJobCtx()
  // the bar itself switches without scrolling — it is already on screen
  const [, setTabParam] = useTabParam()
  const openRevisions = job.revisions.filter((r) => r.status !== 'resolved').length
  const openPins = job.versions[job.versions.length - 1]?.annotations.filter((a) => !a.resolved).length ?? 0

  const counts: Partial<Record<TabId, number>> = {
    assets: job.assets.length,
    deliveries: job.versions.length,
    revisions: job.revisions.length,
    timeline: job.timeline.length,
  }
  const alert: Partial<Record<TabId, boolean>> = {
    revisions: openRevisions > 0,
    deliveries: openPins > 0 || job.status === 'in_review',
  }

  return (
    <Card ref={ref} pad={false} className="scroll-mt-4 overflow-visible">
      <TabBar tab={tab} onChange={setTabParam} counts={counts} alert={alert} label={(id) => t(`job.tab.${id}`)} ariaLabel={t('job.tab.aria')} />
      <div className="@container relative px-3.5 pb-4 pt-3 sm:px-5 sm:pb-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            role="tabpanel"
            id={`job-panel-${tab}`}
            aria-labelledby={`job-tab-${tab}`}
            initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.42, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: -6, filter: 'blur(6px)', transition: { duration: 0.14, ease: EASE_OUT } }}
          >
            {PANEL[tab]()}
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  )
})

function TabBar({
  tab,
  onChange,
  counts,
  alert,
  label,
  ariaLabel,
}: {
  ariaLabel: string
  tab: TabId
  onChange: (t: TabId) => void
  counts: Partial<Record<TabId, number>>
  alert: Partial<Record<TabId, boolean>>
  label: (id: TabId) => string
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const refs = useRef(new Map<TabId, HTMLButtonElement>())

  // keep the active tab visible on narrow screens
  useEffect(() => {
    const el = refs.current.get(tab)
    const box = scroller.current
    if (!el || !box) return
    const l = el.offsetLeft - 16
    const r = el.offsetLeft + el.offsetWidth + 16
    if (l < box.scrollLeft) box.scrollTo({ left: l, behavior: 'smooth' })
    else if (r > box.scrollLeft + box.clientWidth) box.scrollTo({ left: r - box.clientWidth, behavior: 'smooth' })
  }, [tab])

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length]
    onChange(next)
    refs.current.get(next)?.focus()
  }

  return (
    <div className="@container sticky top-0 z-20 rounded-t-[inherit] border-b border-line bg-[color-mix(in_oklab,var(--surface)_72%,transparent)] px-2 pt-2 backdrop-blur-xl sm:px-3 sm:pt-3">
      <div ref={scroller} role="tablist" aria-label={ariaLabel} className="no-scrollbar -mb-px flex gap-0.5 overflow-x-auto pb-2 sm:pb-3">
        {TABS.map((id, i) => {
          const Icon = ICON[id]
          const active = id === tab
          return (
            <motion.button
              key={id}
              layout
              transition={spring.pill}
              title={label(id)}
              ref={(el) => {
                if (el) refs.current.set(id, el)
                else refs.current.delete(id)
              }}
              id={`job-tab-${id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`job-panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(id)}
              onKeyDown={(e) => onKey(e, i)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'group/tab relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-[13.5px] @min-[880px]:px-3.5 font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                active ? 'text-[var(--surface)] dark:text-ink' : 'text-ink-2 hover:bg-[var(--surface-2)] hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId="job-tab-pill"
                  className="absolute inset-0 rounded-full bg-ink shadow-[0_8px_22px_-10px_rgba(0,0,0,.55)] dark:bg-[var(--surface-3)]"
                  transition={spring.pill}
                />
              )}
              <motion.span layout="position" className="relative z-[1] inline-flex items-center gap-2">
                <motion.span
                  className="inline-flex"
                  animate={active ? { rotate: [0, -12, 8, 0], scale: [1, 1.18, 1] } : { rotate: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                >
                  <Icon className="size-4" />
                </motion.span>
                <span className={cn('whitespace-nowrap', active ? 'inline' : 'hidden @min-[880px]:inline')}>{label(id)}</span>
                {counts[id] !== undefined && <TabCount value={counts[id]!} active={active} />}
                {alert[id] && !active && (
                  <span className="absolute -right-1.5 -top-1 size-2 rounded-full bg-accent ring-2 ring-[var(--surface)]" aria-hidden />
                )}
              </motion.span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

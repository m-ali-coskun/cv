import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownUp, Check, Layers, LayoutGrid, Search, SlidersHorizontal, Sparkles, Star, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { Segmented } from '@/components/ui/Segmented'
import { Menu } from '@/components/ui/Menu'
import { Drawer } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { useDiscoverUI, type DiscoverMode } from './discoverStore'
import { useIsMobile, type usePool } from './hooks'
import { FilterPanel } from './FilterPanel'
import { activeFilterCount, type SortKey } from './model'

type Pool = ReturnType<typeof usePool>

const SORTS: SortKey[] = ['match', 'rating', 'price', 'newest']

export function Toolbar({ pool, mode, onMode }: { pool: Pool; mode: DiscoverMode; onMode: (m: DiscoverMode) => void }) {
  const t = useT()
  const query = useDiscoverUI((s) => s.query)
  const setQuery = useDiscoverUI((s) => s.setQuery)
  const setFilters = useDiscoverUI((s) => s.setFilters)
  const filterCount = activeFilterCount(pool.filters, pool.kind)
  const searchRef = useRef<HTMLInputElement>(null)

  // "/" focuses the search field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, [contenteditable="true"]')) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const left = pool.deck.length
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5 }}
      className="card relative z-30 flex flex-wrap items-center gap-2 p-2 sm:gap-2.5 sm:p-2.5"
    >
      <Segmented<DiscoverMode>
        value={mode}
        onChange={onMode}
        layoutId="discover-mode"
        className="relative z-[1] w-full sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none"
        options={[
          { value: 'swipe', label: t('discover.mode.swipe'), icon: <Layers className="size-4" /> },
          { value: 'grid', label: t('discover.mode.grid'), icon: <LayoutGrid className="size-4" /> },
          { value: 'new', label: t('discover.mode.new'), icon: <Sparkles className="size-4" />, count: pool.fresh.length },
        ]}
      />

      <label className="relative z-[1] flex h-10 min-w-0 flex-1 basis-[180px] items-center gap-2 rounded-full bg-[var(--surface-2)] pl-3.5 pr-1.5 transition-shadow focus-within:shadow-[0_0_0_4px_var(--accent-softer)]">
        <Search className="size-4 shrink-0 text-ink-3" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          placeholder={t(pool.kind === 'designer' ? 'discover.search.designers' : 'discover.search.clients')}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-3"
          aria-label={t('core.action.search')}
        />
        <AnimatePresence initial={false} mode="wait">
          {query ? (
            <motion.button
              key="x"
              type="button"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              onClick={() => setQuery('')}
              className="flex size-7 items-center justify-center rounded-full bg-[var(--surface-3)] text-ink-2"
              aria-label={t('discover.search.clear')}
            >
              <X className="size-3.5" />
            </motion.button>
          ) : (
            <motion.kbd
              key="k"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mr-1 hidden h-6 min-w-6 items-center justify-center rounded-md bg-accent px-1.5 font-mono text-[11px] font-semibold text-accent-ink sm:inline-flex"
            >
              /
            </motion.kbd>
          )}
        </AnimatePresence>
      </label>

      <div className="relative z-[1] flex items-center gap-2">
        <FilterButton pool={pool} count={filterCount} />
        <Menu
          width={220}
          className="bg-[color-mix(in_oklab,var(--surface)_95%,transparent)]"
          trigger={({ onClick, open }) => (
            <motion.button
              type="button"
              onClick={onClick}
              whileTap={{ scale: 0.95 }}
              aria-expanded={open}
              className={cn(
                'flex h-10 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-medium transition-colors',
                open ? 'bg-ink text-[var(--surface)] dark:bg-[var(--surface-3)] dark:text-ink' : 'bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)]',
              )}
            >
              <ArrowDownUp className="size-4" />
              <span className="hidden md:inline">{t(`discover.sort.${pool.filters.sort}`)}</span>
            </motion.button>
          )}
          items={SORTS.map((s) => ({
            label: t(`discover.sort.${s}`),
            active: pool.filters.sort === s,
            icon: pool.filters.sort === s ? <Check /> : <span className="block size-4" />,
            onClick: () => setFilters(pool.role, { sort: s }),
          }))}
        />
      </div>

      <div className="relative z-[1] flex w-full items-center justify-between gap-3 px-1.5 sm:w-auto sm:justify-end lg:ml-auto">
        <div className="flex items-baseline gap-1.5 whitespace-nowrap text-[13px] text-ink-2">
          <span className="text-[18px] font-medium tracking-[-0.02em] text-ink">
            <AnimatedCounter value={left} startOnView={false} />
          </span>
          {t('discover.left', { count: left })}
        </div>
        <SuperLikes />
      </div>
    </motion.div>
  )
}

function FilterButton({ pool, count }: { pool: Pool; count: number }) {
  const t = useT()
  const mobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [alignLeft, setAlignLeft] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || mobile) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, mobile])

  const button = (
    <motion.button
      type="button"
      onClick={() => {
        const r = ref.current?.getBoundingClientRect()
        if (r) setAlignLeft(r.right < 424)
        setOpen((o) => !o)
      }}
      whileTap={{ scale: 0.95 }}
      aria-expanded={open}
      className={cn(
        'relative flex h-10 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-medium transition-colors',
        open || count ? 'bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)]',
      )}
    >
      <SlidersHorizontal className="size-4" />
      <span className="hidden md:inline">{t('discover.filters.title')}</span>
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 20 }}
            className="flex size-5 items-center justify-center rounded-full bg-accent font-mono text-[10.5px] font-bold text-accent-ink dark:bg-ink dark:text-[var(--surface)]"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )

  if (mobile)
    return (
      <>
        {button}
        <Drawer open={open} onClose={() => setOpen(false)} side="bottom" title={t('discover.filters.title')}>
          <FilterPanel pool={pool} onDone={() => setOpen(false)} showTitle={false} />
        </Drawer>
      </>
    )

  return (
    <div ref={ref} className="relative">
      {button}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t('discover.filters.title')}
            initial={{ opacity: 0, scale: 0.9, y: -8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: -6, filter: 'blur(4px)', transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 32 }}
            className={cn(
              'glass absolute top-[calc(100%+10px)] z-[70] w-[min(400px,calc(100vw-24px))] overflow-hidden rounded-[26px] shadow-[0_30px_60px_-20px_rgba(0,0,0,.35)] bg-[color-mix(in_oklab,var(--surface)_95%,transparent)]',
              alignLeft ? 'left-0 origin-top-left' : 'right-0 origin-top-right',
            )}
          >
            <div className="relative z-[1] max-h-[min(70dvh,640px)] overflow-y-auto">
              <FilterPanel pool={pool} onDone={() => setOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Three stars that empty as super likes are used. Click for details + demo refill. */
function SuperLikes() {
  const t = useT()
  const left = useApp((s) => s.superLikesLeft)
  return (
    <Menu
      width={260}
      className="bg-[color-mix(in_oklab,var(--surface)_95%,transparent)]"
      trigger={({ onClick }) => (
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1.5 transition-colors hover:bg-[var(--surface-3)]"
          aria-label={t('discover.superLeft', { count: left })}
          title={t('discover.superLeft', { count: left })}
        >
          {[0, 1, 2].map((i) => {
            const full = i < left
            return (
              <motion.span
                key={i}
                animate={full ? { scale: 1, rotate: 0, opacity: 1 } : { scale: [1, 1.5, 0.85], rotate: [0, -30, 0], opacity: 0.9 }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
                className="relative"
              >
                <Star className={cn('size-4 transition-colors duration-300', full ? 'fill-[#3e8ef7] text-[#3e8ef7] drop-shadow-[0_0_6px_#3e8ef7aa]' : 'text-ink-4')} />
              </motion.span>
            )
          })}
        </button>
      )}
    >
      {(close) => (
        <div className="p-3">
          <div className="flex items-center gap-2 text-[14px] font-medium">
            <Star className="size-4 fill-[#3e8ef7] text-[#3e8ef7]" />
            {t('discover.superLeft', { count: left })}
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">{t('discover.superInfo')}</p>
          <Button
            size="sm"
            variant="soft"
            className="mt-3"
            block
            disabled={left >= 3}
            onClick={() => {
              useApp.setState({ superLikesLeft: 3 })
              close()
            }}
          >
            {t('discover.superRefill')}
          </Button>
        </div>
      )}
    </Menu>
  )
}

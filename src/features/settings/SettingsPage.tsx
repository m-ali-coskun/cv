import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronRight, CornerDownLeft, Search, SearchX, UserRound, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_IOS, EASE_OUT, spring, stagger } from '@/lib/motion'
import { useT, type TFn } from '@/i18n'
import { useApp } from '@/store'
import { useMe } from '@/store/selectors'
import { Avatar } from '@/components/ui/Avatar'
import { Pill } from '@/components/ui/Badge'
import { FlashContext } from './ui'
import { isSection, SEARCH_INDEX, SECTIONS, type SectionId } from './sections'
import { fuzzy, Highlight, type Range } from './lib/fuzzy'
import { usePrefs } from './lib/prefs'
import { AppearanceSection } from './sections/Appearance'
import { ThemesSection } from './sections/Themes'
import { LanguageSection } from './sections/Language'
import { NotificationsSection } from './sections/Notifications'
import { WorkspaceSection } from './sections/Workspace'
import { DataSection } from './sections/Data'
import { AboutSection, APP_VERSION } from './sections/About'

const RENDER: Record<SectionId, () => ReactNode> = {
  appearance: () => <AppearanceSection />,
  themes: () => <ThemesSection />,
  language: () => <LanguageSection />,
  notifications: () => <NotificationsSection />,
  workspace: () => <WorkspaceSection />,
  data: () => <DataSection />,
  about: () => <AboutSection />,
}

interface SearchHit {
  section: SectionId
  anchor: string
  label: string
  ranges: Range[]
  score: number
}

function searchSettings(query: string, t: TFn): SearchHit[] {
  if (!query.trim()) return []
  const hits: SearchHit[] = []
  for (const e of SEARCH_INDEX) {
    const label = t(e.labelKey)
    const m = fuzzy(query, label)
    const sec = fuzzy(query, `${t(`settings.nav.${e.section}`)} ${e.kw}`, { loose: false })
    if (!m && !sec) continue
    hits.push({ section: e.section, anchor: e.anchor, label, ranges: m?.ranges ?? [], score: Math.max(m?.score ?? 0, (sec?.score ?? 0) * 0.6) })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 8)
}

/** Ticks up whenever a preference changes — drives the "Saved" indicator. */
function useSavedPulse() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const a = useApp.subscribe((s, p) => s.settings !== p.settings && setN((x) => x + 1))
    const b = usePrefs.subscribe((s, p) => (s.muted !== p.muted || s.dnd !== p.dnd || s.digest !== p.digest) && setN((x) => x + 1))
    return () => {
      a()
      b()
    }
  }, [])
  return n
}

function SavedState({ pulse }: { pulse: number }) {
  const t = useT()
  return (
    <div className="flex items-center gap-2 text-[12px] text-ink-3">
      <motion.span
        key={pulse}
        initial={pulse ? { scale: 0.3, rotate: -60 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={spring.bouncy}
        className={cn('flex size-5 items-center justify-center rounded-full', pulse ? 'bg-accent text-accent-ink' : 'bg-[var(--surface-3)] text-ink-3')}
      >
        <Check className="size-3" strokeWidth={3} />
      </motion.span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={pulse ? 'saved' + pulse : 'auto'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {pulse ? t('settings.saved') : t('settings.autosave')}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

function SearchBox({ value, onChange, onEnter, autoFocus }: { value: string; onChange: (v: string) => void; onEnter: () => void; autoFocus?: boolean }) {
  const t = useT()
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnter()
          if (e.key === 'Escape') onChange('')
        }}
        placeholder={t('settings.search')}
        aria-label={t('settings.search')}
        className="h-11 w-full rounded-full border border-line bg-[var(--surface-2)] pl-10 pr-10 text-[14px] text-ink outline-none transition-[border-color,box-shadow,background-color] placeholder:text-ink-3 focus:border-[var(--accent-line)] focus:bg-[var(--surface)] focus:shadow-[0_0_0_4px_var(--accent-softer)]"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            type="button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => onChange('')}
            aria-label={t('core.action.close')}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--surface-3)] text-ink-2"
          >
            <X className="size-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

function SearchResults({ hits, query, onPick }: { hits: SearchHit[]; query: string; onPick: (h: SearchHit) => void }) {
  const t = useT()
  if (!hits.length)
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2 px-3 py-8 text-center">
        <SearchX className="size-6 text-ink-4" />
        <p className="text-[13px] text-ink-3">{t('settings.searchEmpty', { query })}</p>
      </motion.div>
    )
  return (
    <motion.ul initial="hidden" animate="show" variants={stagger(0.03)} className="flex flex-col gap-0.5">
      {hits.map((h, i) => {
        const meta = SECTIONS.find((s) => s.id === h.section)!
        return (
          <motion.li key={h.section + h.anchor} variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: EASE_OUT } } }}>
            <button
              type="button"
              onClick={() => onPick(h)}
              className="group flex w-full items-center gap-3 rounded-[16px] px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[11px]" style={{ background: `color-mix(in oklab, ${meta.color} 16%, transparent)`, color: meta.color }}>
                <meta.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <Highlight text={h.label} ranges={h.ranges} className="block truncate text-[13.5px] font-medium text-ink" />
                <span className="block truncate text-[11.5px] text-ink-3">{t(`settings.nav.${h.section}`)}</span>
              </span>
              {i === 0 ? <CornerDownLeft className="size-3.5 text-ink-3" /> : <ChevronRight className="size-3.5 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" />}
            </button>
          </motion.li>
        )
      })}
    </motion.ul>
  )
}

function NavRail({ section, go, pulse }: { section: SectionId; go: (id: SectionId, anchor?: string) => void; pulse: number }) {
  const t = useT()
  const navigate = useNavigate()
  const me = useMe()
  const role = useApp((s) => s.settings.role)
  const [query, setQuery] = useState('')
  const hits = useMemo(() => searchSettings(query, t), [query, t])

  return (
    <div className="card flex flex-col gap-3 p-3">
      <button
        type="button"
        onClick={() => navigate('/profile')}
        className="relative z-[1] flex items-center gap-3 rounded-[20px] bg-[var(--surface-2)] p-2.5 text-left transition-colors hover:bg-[var(--surface-3)]"
      >
        {role === 'client' && me.client ? (
          <Avatar kind="brand" name={me.client.name} color={me.client.logoColor} seed={me.client.avatarSeed} size={40} />
        ) : (
          <Avatar seed="ali" media={me.designer?.avatar} size={40} status="online" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-ink">{role === 'client' ? me.client?.name ?? me.name : me.name}</span>
          <span className="block truncate text-[12px] text-ink-3">{t(role === 'client' ? 'core.role.clientWorkspace' : 'core.role.designerStudio')}</span>
        </span>
        <UserRound className="size-4 text-ink-3" />
      </button>

      <div className="relative z-[1]">
        <SearchBox
          value={query}
          onChange={setQuery}
          onEnter={() => {
            const h = hits[0]
            if (h) {
              go(h.section, h.anchor)
              setQuery('')
            }
          }}
        />
      </div>

      <div className="relative z-[1] min-h-[300px]">
        <AnimatePresence mode="wait" initial={false}>
          {query ? (
            <motion.div key="results" initial={{ opacity: 0, filter: 'blur(4px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <SearchResults
                hits={hits}
                query={query}
                onPick={(h) => {
                  go(h.section, h.anchor)
                  setQuery('')
                }}
              />
            </motion.div>
          ) : (
            <motion.nav key="nav" initial={{ opacity: 0, filter: 'blur(4px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="flex flex-col gap-0.5">
              {SECTIONS.map((s) => {
                const active = s.id === section
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => go(s.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn('group relative flex items-center gap-3 rounded-[16px] px-2.5 py-2 text-left transition-colors', active ? 'text-ink' : 'text-ink-2 hover:text-ink')}
                  >
                    {active && <motion.span layoutId="settings-nav-pill" className="absolute inset-0 rounded-[16px] bg-[var(--surface-2)]" transition={spring.pill} />}
                    {active && <motion.span layoutId="settings-nav-bar" className="absolute -left-3 top-2 bottom-2 w-1 rounded-full bg-accent" transition={spring.pill} />}
                    <motion.span
                      className="relative flex size-8 items-center justify-center rounded-[11px] transition-colors duration-300"
                      style={active ? { background: s.color, color: '#fff' } : { background: 'var(--surface-2)' }}
                      whileHover={{ rotate: -10, scale: 1.08 }}
                      transition={spring.snappy}
                    >
                      <s.icon className="size-4" />
                    </motion.span>
                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{t(`settings.nav.${s.id}`)}</span>
                      <span className="block truncate text-[11.5px] text-ink-3">{t(`settings.nav.${s.id}Hint`)}</span>
                    </span>
                    <ChevronRight className={cn('relative size-4 transition-all', active ? 'translate-x-0 text-ink-3' : '-translate-x-1 text-ink-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100')} />
                  </button>
                )
              })}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-[1] flex items-center justify-between gap-2 border-t border-line px-1.5 pt-3">
        <SavedState pulse={pulse} />
        <span className="font-mono text-[11px] text-ink-4">v{APP_VERSION}</span>
      </div>
    </div>
  )
}

function MobileBar({ section, go }: { section: SectionId; go: (id: SectionId, anchor?: string) => void }) {
  const t = useT()
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const hits = useMemo(() => searchSettings(query, t), [query, t])
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.querySelector<HTMLElement>(`[data-id="${section}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [section])

  const pick = (h: SearchHit) => {
    go(h.section, h.anchor)
    setQuery('')
    setSearching(false)
  }

  return (
    <div className="sticky top-2 z-20 flex flex-col gap-2 lg:hidden">
      <div className="glass glass-strong glass-pill flex items-center gap-1 p-1">
        <button
          type="button"
          onClick={() => setSearching((v) => !v)}
          aria-label={t('settings.search')}
          className={cn('relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-full transition-colors', searching ? 'bg-ink text-[var(--surface)]' : 'bg-[var(--surface-2)] text-ink-2')}
        >
          {searching ? <X className="size-4" /> : <Search className="size-4" />}
        </button>
        <div ref={scroller} className="relative z-[1] flex min-w-0 flex-1 gap-0.5 overflow-x-auto no-scrollbar">
          {SECTIONS.map((s) => {
            const active = s.id === section
            return (
              <button
                key={s.id}
                data-id={s.id}
                type="button"
                onClick={() => go(s.id)}
                className={cn('relative flex h-10 shrink-0 items-center gap-1.5 rounded-full pl-2 pr-3.5 text-[13px] font-medium transition-colors', active ? 'text-[var(--surface)] dark:text-ink' : 'text-ink-2')}
              >
                {active && <motion.span layoutId="settings-mobile-pill" className="absolute inset-0 rounded-full bg-ink dark:bg-[var(--surface-3)]" transition={spring.pill} />}
                <span className="relative flex size-6 items-center justify-center rounded-full" style={{ background: active ? s.color : 'transparent', color: active ? '#fff' : undefined }}>
                  <s.icon className="size-3.5" />
                </span>
                <span className="relative whitespace-nowrap">{t(`settings.nav.${s.id}`)}</span>
              </button>
            )
          })}
        </div>
      </div>
      <AnimatePresence>
        {searching && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.16, ease: EASE_IOS } }}
            transition={spring.snappy}
            className="glass glass-strong origin-top rounded-[24px] p-2"
          >
            <div className="relative z-[1]">
              <SearchBox value={query} onChange={setQuery} onEnter={() => hits[0] && pick(hits[0])} autoFocus />
              {query && (
                <div className="mt-2 max-h-[50dvh] overflow-y-auto">
                  <SearchResults hits={hits} query={query} onPick={pick} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Floating "Saved" capsule for phones (the rail with the indicator is hidden there). */
function MobileSaved({ pulse }: { pulse: number }) {
  const t = useT()
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!pulse) return
    setShow(true)
    const id = window.setTimeout(() => setShow(false), 1400)
    return () => window.clearTimeout(id)
  }, [pulse])
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={spring.bouncy}
          className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center lg:hidden"
        >
          <Pill tone="night" size="md" icon={<Check className="size-3.5 text-accent" strokeWidth={3} />}>
            {t('settings.saved')}
          </Pill>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('section')
  const section: SectionId = isSection(raw) ? raw : 'appearance'
  const [flash, setFlash] = useState<{ anchor: string | null; nonce: number }>({ anchor: null, nonce: 0 })
  const content = useRef<HTMLDivElement>(null)
  const pulse = useSavedPulse()

  const go = (id: SectionId, anchor?: string) => {
    if (id !== section) {
      setParams(
        (p) => {
          const next = new URLSearchParams(p)
          next.set('section', id)
          return next
        },
        { replace: true },
      )
    }
    if (anchor) setFlash({ anchor, nonce: Date.now() })
    else {
      const top = content.current?.getBoundingClientRect().top ?? 0
      if (top < 0) window.scrollTo({ top: window.scrollY + top - 90, behavior: 'smooth' })
    }
  }

  return (
    <FlashContext.Provider value={flash}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[296px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <motion.div className="sticky top-4" initial={{ opacity: 0, x: -16, filter: 'blur(6px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} transition={{ duration: 0.6, ease: EASE_OUT }}>
            <NavRail section={section} go={go} pulse={pulse} />
          </motion.div>
        </aside>
        <MobileBar section={section} go={go} />
        <div ref={content} className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={section}
              className="flex min-w-0 flex-col gap-4"
              initial="hidden"
              animate="show"
              exit="exit"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
                exit: { opacity: 0, y: -8, filter: 'blur(6px)', transition: { duration: 0.18, ease: EASE_IOS } },
              }}
            >
              {RENDER[section]()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <MobileSaved pulse={pulse} />
    </FlashContext.Provider>
  )
}

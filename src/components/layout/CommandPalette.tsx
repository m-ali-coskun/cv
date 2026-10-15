import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowLeft,
  ArrowLeftRight,
  Bell,
  CheckCheck,
  ChevronRight,
  Clock3,
  CornerDownLeft,
  FileDown,
  Heart,
  Inbox,
  Languages,
  Link2,
  Moon,
  PanelLeft,
  PenLine,
  ImagePlus,
  PlayCircle,
  RotateCcw,
  Rows3,
  Search,
  SearchX,
  Send,
  Sparkles,
  SwatchBook,
  Sun,
  Wand2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_IOS, EASE_OUT, spring, FILTER_TWEEN } from '@/lib/motion'
import { dueLabel } from '@/lib/dates'
import { LANGUAGES, useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useConversations, useMyJobs, useMyMatches, useMyNotifications } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { useUI } from '@/store/ui'
import { ME_CLIENT_ID, ME_DESIGNER_ID, type Client, type Designer } from '@/store/types'
import { DISCIPLINE_LIST } from '@/theme/disciplines'
import { useActiveTheme, useIsDark } from '@/theme/ThemeProvider'
import { Avatar } from '../ui/Avatar'
import { DisciplineIcon, StatusBadge } from '../ui/Badge'
import { useConfirm } from '../ui/ConfirmDialog'
import { NAV } from './nav'
import { openWelcomeTour } from '../onboarding/openWelcome'
import { fuzzy, Highlight, type Range } from '@/features/settings/lib/fuzzy'
import { usePrefs } from '@/features/settings/lib/prefs'
import { exportData } from '@/features/settings/lib/dataIO'
import { replayMatch, sendTestNotification, simulateIncomingRequest } from '@/features/settings/lib/demo'
import { SECTIONS } from '@/features/settings/sections'

type Group = 'recent' | 'pages' | 'settings' | 'actions' | 'jobs' | 'people' | 'conversations' | 'themes' | 'languages'
type Scope = 'all' | 'pages' | 'actions' | 'jobs' | 'people' | 'conversations'
type Page = 'root' | 'themes' | 'languages'

interface PItem {
  key: string
  group: Group
  title: string
  subtitle?: string
  /** Extra searchable text (not highlighted). */
  keywords?: string
  leading: ReactNode
  trailing?: ReactNode
  run: () => void
  /** Keep the palette open (navigates into a sub-list). */
  stay?: boolean
  danger?: boolean
  /** Shown in the empty state. */
  suggested?: boolean
}

interface Hit {
  item: PItem
  ranges: Range[]
  /** Matched ranges inside the subtitle (e.g. a job ID). */
  subRanges?: Range[]
  score: number
}

const PREFIX: Record<string, Scope> = { '>': 'actions', '#': 'jobs', '@': 'people', '/': 'pages' }
const LIMIT: Record<Group, number> = { recent: 5, pages: 5, settings: 4, actions: 7, jobs: 6, people: 5, conversations: 4, themes: 20, languages: 5 }

function Tile({ children, className, style }: { children?: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--surface-2)] text-ink-2 [&_svg]:size-[17px]', className)} style={style}>
      {children}
    </span>
  )
}

function rank(items: PItem[], q: string): Hit[] {
  if (!q.trim()) return items.map((item, i) => ({ item, ranges: [], score: -i }))
  const out: Hit[] = []
  for (const item of items) {
    const m = fuzzy(q, item.title)
    const k = fuzzy(q, `${item.subtitle ?? ''} ${item.keywords ?? ''}`, { loose: false })
    if (!m && !k) continue
    const sub = !m && item.subtitle ? fuzzy(q, item.subtitle, { loose: false }) : null
    out.push({ item, ranges: m?.ranges ?? [], subRanges: sub?.ranges, score: Math.max(m?.score ?? -1, k ? k.score * 0.72 : -1) })
  }
  return out.sort((a, b) => b.score - a.score)
}

/** ⌘K command palette — pages, actions, jobs, people and chats with fuzzy search. */
export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen)
  const setUI = useUI((s) => s.set)
  const close = useCallback(() => setUI({ paletteOpen: false }), [setUI])
  const [confirm, confirmDialog] = useConfirm()
  return (
    <>
      {createPortal(<AnimatePresence>{open && <Palette key="palette" onClose={close} confirm={confirm} />}</AnimatePresence>, document.body)}
      {confirmDialog}
    </>
  )
}

function Palette({ onClose, confirm }: { onClose: () => void; confirm: ReturnType<typeof useConfirm>[0] }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const dark = useIsDark()
  const activeTheme = useActiveTheme()
  const settings = useApp((s) => s.settings)
  const setSettings = useApp((s) => s.setSettings)
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const jobs = useMyJobs({ ignoreDiscipline: true })
  const convs = useConversations()
  const matches = useMyMatches()
  const notifications = useMyNotifications()
  const recents = usePrefs((s) => s.recents)
  const pushRecent = usePrefs((s) => s.pushRecent)
  const clearRecents = usePrefs((s) => s.clearRecents)

  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [page, setPage] = useState<Page>('root')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const pointerMoved = useRef(false)

  const role = settings.role
  const unread = notifications.filter((n) => !n.read).length
  const go = useCallback((path: string) => navigate(path), [navigate])

  // ───────── item sources ─────────
  const pages = useMemo<PItem[]>(
    () =>
      NAV[role].map((n) => ({
        key: `page:${n.path}`,
        group: 'pages',
        title: t(n.labelKey),
        keywords: n.path,
        leading: (
          <Tile>
            <n.icon />
          </Tile>
        ),
        trailing: <span className="hidden font-mono text-[11px] text-ink-4 sm:inline">{n.path}</span>,
        run: () => go(n.path),
        suggested: true,
      })),
    [role, t, go],
  )

  const settingsItems = useMemo<PItem[]>(
    () =>
      SECTIONS.map((s) => ({
        key: `settings:${s.id}`,
        group: 'settings',
        title: t(`settings.nav.${s.id}`),
        subtitle: `${t('core.nav.settings')} · ${t(`settings.nav.${s.id}Hint`)}`,
        keywords: `settings ${s.id}`,
        leading: (
          <Tile style={{ background: `color-mix(in oklab, ${s.color} 16%, transparent)`, color: s.color }}>
            <s.icon />
          </Tile>
        ),
        run: () => go(`/settings?section=${s.id}`),
      })),
    [t, go],
  )

  const actions = useMemo<PItem[]>(() => {
    const other = role === 'client' ? 'designer' : 'client'
    const list: PItem[] = [
      role === 'client'
        ? {
            key: 'action:new-brief',
            group: 'actions',
            title: t('core.nav.newBrief'),
            subtitle: t('settings.palette.a.newBriefDesc'),
            keywords: 'create brief job hire',
            leading: (
              <Tile className="bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink">
                <PenLine />
              </Tile>
            ),
            run: () => go('/brief/new'),
            suggested: true,
          }
        : {
            key: 'action:add-work',
            group: 'actions',
            title: t('settings.palette.a.addWork'),
            subtitle: t('settings.palette.a.addWorkDesc'),
            keywords: 'portfolio upload project',
            leading: (
              <Tile className="bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink">
                <ImagePlus />
              </Tile>
            ),
            run: () => go('/profile?add=1'),
            suggested: true,
          },
      {
        key: 'action:switch-role',
        group: 'actions',
        title: t('settings.palette.a.switchTo', { role: t(`core.role.${other}`) }),
        subtitle: t(other === 'client' ? 'core.role.clientWorkspace' : 'core.role.designerStudio'),
        keywords: 'role workspace studio client designer switch',
        leading: (
          <Tile className="bg-accent-soft text-accent-text">
            <ArrowLeftRight />
          </Tile>
        ),
        run: () => {
          useApp.getState().setRole(other)
          go('/overview')
          toast({ title: t('core.role.switchedTo', { role: t(`core.role.${other}`) }), tone: 'success' })
        },
        suggested: true,
      },
      {
        key: 'action:toggle-theme',
        group: 'actions',
        title: dark ? t('settings.palette.a.lightMode') : t('settings.palette.a.darkMode'),
        keywords: 'dark light theme mode appearance night',
        leading: <Tile>{dark ? <Sun /> : <Moon />}</Tile>,
        run: () => setSettings({ theme: dark ? 'light' : 'dark' }),
        suggested: true,
      },
      {
        key: 'action:theme',
        group: 'actions',
        title: t('settings.palette.a.theme'),
        subtitle: `${t(activeTheme.labelKey)} · ${activeTheme.inspiredBy}`,
        keywords: 'discipline colour color accent palette tab',
        leading: (
          <Tile>
            <SwatchBook />
          </Tile>
        ),
        trailing: <ChevronRight className="size-4 text-ink-3" />,
        run: () => {
          setPage('themes')
          setQuery('')
        },
        stay: true,
        suggested: true,
      },
      {
        key: 'action:language',
        group: 'actions',
        title: t('settings.palette.a.language'),
        subtitle: LANGUAGES.find((l) => l.id === lang)?.native,
        keywords: 'language english deutsch türkçe german turkish sprache dil',
        leading: (
          <Tile>
            <Languages />
          </Tile>
        ),
        trailing: <ChevronRight className="size-4 text-ink-3" />,
        run: () => {
          setPage('languages')
          setQuery('')
        },
        stay: true,
        suggested: true,
      },
      {
        key: 'action:simulate',
        group: 'actions',
        title: t('settings.demo.request'),
        subtitle: t('settings.demo.requestDesc'),
        keywords: 'simulate demo incoming request job',
        leading: (
          <Tile>
            <Inbox />
          </Tile>
        ),
        run: () => simulateIncomingRequest(t, go),
        suggested: true,
      },
      {
        key: 'action:tour',
        group: 'actions',
        title: t('settings.workspace.tourCta'),
        subtitle: t('settings.palette.a.tourDesc'),
        keywords: 'welcome onboarding intro help tour',
        leading: (
          <Tile>
            <PlayCircle />
          </Tile>
        ),
        run: openWelcomeTour,
        suggested: true,
      },
      {
        key: 'action:notifications',
        group: 'actions',
        title: t('settings.palette.a.openNotifications'),
        keywords: 'notifications inbox bell alerts',
        leading: (
          <Tile>
            <Bell />
          </Tile>
        ),
        trailing: unread ? <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] text-accent-ink">{unread}</span> : undefined,
        run: () => useUI.getState().set({ notificationsOpen: true }),
      },
      {
        key: 'action:mark-read',
        group: 'actions',
        title: t('core.action.markAllRead'),
        keywords: 'notifications read clear inbox',
        leading: (
          <Tile>
            <CheckCheck />
          </Tile>
        ),
        run: () => {
          useApp.getState().markAllNotificationsRead()
          toast({ title: t('settings.notif.allRead'), tone: 'success' })
        },
      },
      {
        key: 'action:test-notification',
        group: 'actions',
        title: t('settings.notifications.sendTest'),
        keywords: 'test notification demo toast',
        leading: (
          <Tile>
            <Send />
          </Tile>
        ),
        run: sendTestNotification,
      },
      {
        key: 'action:match',
        group: 'actions',
        title: t('settings.demo.match'),
        keywords: 'match celebration confetti demo',
        leading: (
          <Tile>
            <Heart />
          </Tile>
        ),
        run: () => replayMatch(t),
      },
      {
        key: 'action:motion',
        group: 'actions',
        title: settings.motion === 'off' ? t('settings.palette.a.motionOn') : t('settings.palette.a.motionOff'),
        keywords: 'motion animation reduce accessibility',
        leading: (
          <Tile>
            <Wand2 />
          </Tile>
        ),
        run: () => setSettings({ motion: settings.motion === 'off' ? 'expressive' : 'off' }),
      },
      {
        key: 'action:compact',
        group: 'actions',
        title: settings.compact ? t('settings.palette.a.comfortable') : t('settings.palette.a.compact'),
        keywords: 'density compact spacing',
        leading: (
          <Tile>
            <Rows3 />
          </Tile>
        ),
        run: () => setSettings({ compact: !settings.compact }),
      },
      {
        key: 'action:ai',
        group: 'actions',
        title: settings.aiAssistant ? t('settings.palette.a.aiOff') : t('settings.palette.a.aiOn'),
        keywords: 'ai assistant insights',
        leading: (
          <Tile>
            <Sparkles />
          </Tile>
        ),
        run: () => setSettings({ aiAssistant: !settings.aiAssistant }),
      },
      {
        key: 'action:sidebar',
        group: 'actions',
        title: settings.sidebarCollapsed ? t('core.nav.expand') : t('core.nav.collapse'),
        keywords: 'sidebar navigation collapse expand',
        leading: (
          <Tile>
            <PanelLeft />
          </Tile>
        ),
        run: () => setSettings({ sidebarCollapsed: !settings.sidebarCollapsed }),
      },
      {
        key: 'action:export',
        group: 'actions',
        title: t('settings.data.exportCta'),
        keywords: 'export backup download json data',
        leading: (
          <Tile>
            <FileDown />
          </Tile>
        ),
        run: () => {
          exportData()
          toast({ title: t('settings.data.exported'), tone: 'success' })
        },
      },
      {
        key: 'action:copy-link',
        group: 'actions',
        title: t('settings.palette.a.copyLink'),
        keywords: 'copy link url share',
        leading: (
          <Tile>
            <Link2 />
          </Tile>
        ),
        run: () => {
          void navigator.clipboard?.writeText(window.location.href).catch(() => undefined)
          toast({ title: t('core.action.copied'), description: window.location.href, tone: 'success' })
        },
      },
      {
        key: 'action:reset',
        group: 'actions',
        title: t('settings.palette.a.reset'),
        subtitle: t('settings.palette.a.resetDesc'),
        keywords: 'reset demo data wipe fresh',
        leading: (
          <Tile className="bg-danger-soft text-danger">
            <RotateCcw />
          </Tile>
        ),
        danger: true,
        run: async () => {
          const ok = await confirm({
            title: t('settings.data.resetConfirmTitle'),
            description: t('settings.data.resetConfirmDesc'),
            confirmLabel: t('settings.data.resetCta'),
            tone: 'danger',
            icon: <RotateCcw />,
          })
          if (!ok) return
          await useApp.getState().resetDemo()
          usePrefs.getState().clearRecents()
          go('/overview')
          toast({ title: t('settings.data.resetDone'), description: t('settings.data.resetDoneDesc'), tone: 'success' })
        },
      },
    ]
    return list
  }, [role, t, dark, activeTheme, lang, unread, settings.motion, settings.compact, settings.aiAssistant, settings.sidebarCollapsed, setSettings, go, confirm])

  const jobItems = useMemo<PItem[]>(() => {
    const nameOf = (id: string) => (role === 'client' ? designers.find((d) => d.id === id)?.name : clients.find((c) => c.id === id)?.name) ?? ''
    const closed = (s: string) => (['approved', 'declined', 'cancelled'].includes(s) ? 1 : 0)
    return [...jobs]
      .sort((a, b) => closed(a.status) - closed(b.status) || b.updatedAt.localeCompare(a.updatedAt))
      .map((j) => {
        const other = nameOf(role === 'client' ? j.designerId : j.clientId)
        return {
          key: `job:${j.id}`,
          group: 'jobs' as const,
          title: j.title,
          subtitle: `${j.id} · ${other} · ${dueLabel(j.dueAt, lang)}`,
          keywords: `${j.id} ${other} ${j.tags.join(' ')} ${j.discipline}`,
          leading: <DisciplineIcon id={j.discipline} size={36} />,
          trailing: <StatusBadge status={j.status} size="xs" />,
          run: () => go(`/jobs/${j.id}`),
        }
      })
  }, [jobs, role, designers, clients, lang, go])

  const peopleItems = useMemo<PItem[]>(() => {
    const matched = new Set(matches.map((m) => (role === 'client' ? m.match.designerId : m.match.clientId)))
    const pool: (Designer | Client)[] = role === 'client' ? designers.filter((d) => d.id !== ME_DESIGNER_ID) : clients.filter((c) => c.id !== ME_CLIENT_ID)
    return pool
      .map((p) => {
        const isClient = 'contactName' in p
        return {
          key: `person:${p.id}`,
          group: 'people' as const,
          title: p.name,
          subtitle: isClient ? `${p.industry} · ${p.location}` : `${p.headline} · ${p.location}`,
          keywords: isClient ? `${p.contactName} ${p.disciplinesNeeded.join(' ')}` : `${p.handle} ${p.skills.join(' ')} ${p.disciplines.join(' ')}`,
          leading: isClient ? (
            <Avatar kind="brand" name={p.name} color={p.logoColor} seed={p.avatarSeed} size={36} />
          ) : (
            <Avatar seed={p.avatarSeed} media={p.avatar} size={36} />
          ),
          trailing: matched.has(p.id) ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-text">
              <Heart className="size-3" /> {t('settings.palette.matched')}
            </span>
          ) : undefined,
          run: () => go(`/network/${p.id}`),
          order: matched.has(p.id) ? 0 : 1,
        }
      })
      .sort((a, b) => a.order - b.order)
  }, [role, designers, clients, matches, t, go])

  const convItems = useMemo<PItem[]>(
    () =>
      convs.map((c) => {
        const p = c.counterpart
        const isClient = p && 'contactName' in p
        return {
          key: `conv:${c.conversation.id}`,
          group: 'conversations' as const,
          title: p?.name ?? '—',
          subtitle: c.last?.text || t('settings.palette.noMessages'),
          leading: p ? (
            isClient ? (
              <Avatar kind="brand" name={p.name} color={(p as Client).logoColor} seed={p.avatarSeed} size={36} />
            ) : (
              <Avatar seed={p.avatarSeed} media={(p as Designer).avatar} size={36} />
            )
          ) : (
            <Tile />
          ),
          trailing: c.unread ? <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] text-accent-ink">{c.unread}</span> : undefined,
          run: () => go(`/messages/${c.conversation.id}`),
        }
      }),
    [convs, t, go],
  )

  const themeItems = useMemo<PItem[]>(
    () =>
      DISCIPLINE_LIST.map((d) => ({
        key: `theme:${d.id}`,
        group: 'themes',
        title: t(d.labelKey),
        subtitle: d.id === 'all' ? t('settings.themes.signature') : t('core.discipline.inspired', { app: d.inspiredBy }),
        keywords: `${d.inspiredBy} ${d.code}`,
        leading: <DisciplineIcon id={d.id} size={36} />,
        trailing:
          activeTheme.id === d.id ? (
            <span className="flex size-6 items-center justify-center rounded-full bg-accent text-accent-ink">
              <CheckCheck className="size-3.5" />
            </span>
          ) : (
            <span className="size-3 rounded-full" style={{ background: d.accent }} />
          ),
        run: () => {
          if (useApp.getState().settings.accentMode === 'fixed') setSettings({ fixedAccent: d.id })
          else useApp.getState().setDiscipline(d.id)
          toast({ title: t('settings.palette.themeApplied', { name: t(d.labelKey) }), tone: 'success', duration: 2000 })
        },
      })),
    [t, activeTheme.id, setSettings],
  )

  const langItems = useMemo<PItem[]>(
    () =>
      LANGUAGES.map((l) => ({
        key: `lang:${l.id}`,
        group: 'languages',
        title: l.native,
        subtitle: l.label,
        keywords: l.id,
        leading: <Tile className="text-[20px]">{l.flag}</Tile>,
        trailing:
          lang === l.id ? (
            <span className="flex size-6 items-center justify-center rounded-full bg-accent text-accent-ink">
              <CheckCheck className="size-3.5" />
            </span>
          ) : (
            <span className="font-mono text-[11px] uppercase text-ink-4">{l.id}</span>
          ),
        run: () => useApp.getState().setLang(l.id),
      })),
    [lang],
  )

  const openJobKeys = useMemo(() => new Set(jobs.filter((j) => !['approved', 'declined', 'cancelled'].includes(j.status)).map((j) => `job:${j.id}`)), [jobs])

  // ───────── results ─────────
  const sections = useMemo<{ group: Group; hits: Hit[] }[]>(() => {
    if (page === 'themes') return [{ group: 'themes', hits: rank(themeItems, query) }]
    if (page === 'languages') return [{ group: 'languages', hits: rank(langItems, query) }]
    const q = query.trim()
    const byScope: Record<Exclude<Scope, 'all'>, PItem[]> = {
      pages: [...pages, ...settingsItems],
      actions,
      jobs: jobItems,
      people: peopleItems,
      conversations: convItems,
    }
    if (scope !== 'all') {
      const hits = rank(byScope[scope], q)
      return [{ group: scope === 'pages' ? 'pages' : scope, hits: hits.slice(0, 40) }]
    }
    if (!q) {
      const all = [...pages, ...settingsItems, ...actions, ...jobItems, ...peopleItems, ...convItems, ...themeItems, ...langItems]
      const map = new Map(all.map((i) => [i.key, i]))
      const recent = recents
        .map((k) => map.get(k))
        .filter((x): x is PItem => !!x)
        .slice(0, LIMIT.recent)
        .map((item, i) => ({ item: { ...item, group: 'recent' as const }, ranges: [], score: -i }))
      return [
        { group: 'recent' as const, hits: recent },
        { group: 'actions' as const, hits: rank(actions.filter((a) => a.suggested), '') },
        { group: 'jobs' as const, hits: rank(jobItems.filter((j) => openJobKeys.has(j.key)).slice(0, 4), '') },
        { group: 'pages' as const, hits: rank(pages, '') },
      ].filter((s) => s.hits.length)
    }
    const groups: { group: Group; hits: Hit[] }[] = [
      { group: 'pages', hits: rank(pages, q).slice(0, LIMIT.pages) },
      { group: 'actions', hits: rank(actions, q).slice(0, LIMIT.actions) },
      { group: 'jobs', hits: rank(jobItems, q).slice(0, LIMIT.jobs) },
      { group: 'people', hits: rank(peopleItems, q).slice(0, LIMIT.people) },
      { group: 'conversations', hits: rank(convItems, q).slice(0, LIMIT.conversations) },
      { group: 'settings', hits: rank(settingsItems, q).slice(0, LIMIT.settings) },
    ]
    return groups.filter((g) => g.hits.length).sort((a, b) => b.hits[0]!.score - a.hits[0]!.score)
  }, [page, query, scope, pages, settingsItems, actions, jobItems, peopleItems, convItems, themeItems, langItems, recents, openJobKeys])

  const flat = useMemo(() => sections.flatMap((s) => s.hits), [sections])

  useEffect(() => setActive(0), [query, scope, page])
  useEffect(() => {
    inputRef.current?.focus()
  }, [page])
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])
  // Esc while focus is outside the input (e.g. after clicking a chip)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.activeElement !== inputRef.current) onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const execute = (it: PItem) => {
    if (!it.stay) {
      pushRecent(it.key)
      onClose()
    }
    it.run()
  }

  const onInput = (v: string) => {
    if (page === 'root' && scope === 'all' && v.length === 1 && PREFIX[v]) {
      setScope(PREFIX[v]!)
      setQuery('')
      return
    }
    setQuery(v)
  }

  const back = () => {
    if (page !== 'root') {
      setPage('root')
      setQuery('')
      return true
    }
    if (scope !== 'all') {
      setScope('all')
      return true
    }
    return false
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    pointerMoved.current = false
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (flat.length ? (a + 1) % flat.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (flat.length ? (a - 1 + flat.length) % flat.length : 0))
    } else if (e.key === 'Home') {
      setActive(0)
    } else if (e.key === 'End') {
      setActive(Math.max(0, flat.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = flat[active]
      if (hit) execute(hit.item)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (query) setQuery('')
      else if (!back()) onClose()
    } else if (e.key === 'Backspace' && !query) {
      if (back()) e.preventDefault()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // jump to the first item of the next group
      let idx = 0
      const starts = sections.map((s) => {
        const start = idx
        idx += s.hits.length
        return start
      })
      const next = starts.find((s) => s > active) ?? 0
      setActive(e.shiftKey ? [...starts].reverse().find((s) => s < active) ?? starts[starts.length - 1] ?? 0 : next)
    }
  }

  const scopes: { id: Scope; label: string; prefix?: string }[] = [
    { id: 'all', label: t('core.common.all') },
    { id: 'pages', label: t('core.palette.pages'), prefix: '/' },
    { id: 'actions', label: t('core.palette.actions'), prefix: '>' },
    { id: 'jobs', label: t('core.palette.jobs'), prefix: '#' },
    { id: 'people', label: t('core.palette.people'), prefix: '@' },
    { id: 'conversations', label: t('settings.palette.chats') },
  ]

  const crumb = page === 'themes' ? t('settings.palette.a.theme') : page === 'languages' ? t('settings.palette.a.language') : null
  let index = -1

  return (
    <div className="fixed inset-0 z-[85] flex items-start justify-center p-2 sm:px-4 sm:pt-[9vh]" role="dialog" aria-modal aria-label={t('core.action.search')}>
      <motion.div
        className="absolute inset-0 bg-black/25 backdrop-blur-[6px] dark:bg-black/55"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        onClick={onClose}
      />
      <motion.div
        className="glass glass-strong relative flex max-h-[calc(100dvh-16px)] w-full max-w-[700px] origin-top flex-col overflow-hidden rounded-[28px] sm:max-h-[min(640px,80vh)]"
        initial={{ opacity: 0, y: -18, scale: 0.95, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 420, damping: 32, filter: FILTER_TWEEN } }}
        exit={{ opacity: 0, y: -10, scale: 0.97, filter: 'blur(6px)', transition: { duration: 0.16, ease: EASE_IOS } }}
      >
        {/* input row */}
        <div className="relative z-[1] flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {crumb ? (
              <motion.button
                key="crumb"
                type="button"
                onClick={back}
                initial={{ opacity: 0, x: -10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.9 }}
                transition={spring.snappy}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent pl-2 pr-3 text-[12.5px] font-medium text-accent-ink"
              >
                <ArrowLeft className="size-3.5" />
                {crumb}
              </motion.button>
            ) : (
              <motion.span key="icon" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} className="flex size-9 shrink-0 items-center justify-center text-ink-3">
                <Search className="size-[19px]" />
              </motion.span>
            )}
          </AnimatePresence>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={page === 'root' ? t('core.palette.placeholder') : t('settings.palette.filter')}
            aria-label={t('core.palette.placeholder')}
            aria-activedescendant={flat[active] ? `pal-${active}` : undefined}
            aria-controls="palette-list"
            autoComplete="off"
            spellCheck={false}
            className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label={t('core.action.close')} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-2">
              <X className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 shrink-0 items-center rounded-[10px] border border-line-2 px-2 font-mono text-[11px] font-medium text-ink-3 transition-colors hover:text-ink"
            >
              esc
            </button>
          )}
        </div>

        {/* scope chips */}
        {page === 'root' && (
          <div className="relative z-[1] flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2 no-scrollbar sm:px-4">
            {scopes.map((s) => {
              const on = s.id === scope
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setScope(s.id)
                    inputRef.current?.focus()
                  }}
                  className={cn('relative flex h-7.5 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors', on ? 'text-[var(--surface)] dark:text-accent-ink' : 'text-ink-2 hover:text-ink')}
                >
                  {on && <motion.span layoutId="palette-scope" className="absolute inset-0 rounded-full bg-ink dark:bg-accent" transition={spring.pill} />}
                  <span className="relative">{s.label}</span>
                  {s.prefix && <span className={cn('relative font-mono text-[10.5px]', on ? 'opacity-60' : 'text-ink-4')}>{s.prefix}</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* results */}
        <div
          ref={listRef}
          id="palette-list"
          role="listbox"
          className="relative z-[1] min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:max-h-[440px]"
          onPointerMove={() => (pointerMoved.current = true)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page}
              initial={{ opacity: 0, x: page === 'root' ? -24 : 24, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.28, ease: EASE_OUT } }}
              exit={{ opacity: 0, x: page === 'root' ? 24 : -24, transition: { duration: 0.14 } }}
            >
              {flat.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <motion.span
                    initial={{ scale: 0.5, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={spring.bouncy}
                    className="mb-3 flex size-14 items-center justify-center rounded-[18px] bg-accent-soft text-accent-text"
                  >
                    <SearchX className="size-6" />
                  </motion.span>
                  <p className="text-[14.5px] font-medium text-ink">{t('core.palette.noResults', { query })}</p>
                  <p className="mt-1 text-[12.5px] text-ink-3">{t('settings.palette.tryThese')}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {[t('core.nav.newBrief'), 'dark', 'DT-28', t('core.nav.messages')].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setScope('all')
                          setQuery(s)
                          inputRef.current?.focus()
                        }}
                        className="rounded-full border border-line-2 px-3 py-1 text-[12.5px] text-ink-2 transition-colors hover:bg-[var(--surface-2)] hover:text-ink"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                sections.map((s) => (
                  <div key={s.group} className="mb-1.5 last:mb-0" role="group" aria-label={t(`settings.palette.group.${s.group}`)}>
                    <div className="flex items-center justify-between px-3 pb-1 pt-2">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3">
                        {s.group === 'recent' && <Clock3 className="size-3" />}
                        {t(`settings.palette.group.${s.group}`)}
                      </span>
                      {s.group === 'recent' ? (
                        <button type="button" onClick={clearRecents} className="text-[11.5px] text-ink-3 transition-colors hover:text-ink">
                          {t('settings.palette.clearRecent')}
                        </button>
                      ) : (
                        <span className="font-mono text-[10.5px] text-ink-4">{s.hits.length}</span>
                      )}
                    </div>
                    {s.hits.map((h) => {
                      index++
                      const i = index
                      const on = i === active
                      return (
                        <motion.div
                          key={h.item.key + s.group}
                          id={`pal-${i}`}
                          data-index={i}
                          role="option"
                          aria-selected={on}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: EASE_OUT, delay: Math.min(i, 10) * 0.012 }}
                          onPointerMove={() => pointerMoved.current && !on && setActive(i)}
                          onClick={() => execute(h.item)}
                          className={cn('relative flex cursor-pointer items-center gap-3 rounded-[16px] px-2.5 py-2 transition-colors', on ? 'text-ink' : 'text-ink-2')}
                        >
                          {on && (
                            <motion.span
                              layoutId="palette-active"
                              className="absolute inset-0 rounded-[16px] bg-[var(--surface-2)] shadow-[inset_0_0_0_1px_var(--line)]"
                              transition={{ type: 'spring', stiffness: 600, damping: 40 }}
                            >
                              <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-accent" />
                            </motion.span>
                          )}
                          <span className="relative">{h.item.leading}</span>
                          <span className="relative min-w-0 flex-1">
                            <Highlight text={h.item.title} ranges={h.ranges} className={cn('block truncate text-[14px] font-medium', h.item.danger ? 'text-danger' : 'text-ink')} />
                            {h.item.subtitle && <Highlight text={h.item.subtitle} ranges={h.subRanges} className="block truncate text-[12px] text-ink-3" />}
                          </span>
                          <span className="relative flex shrink-0 items-center gap-2">
                            {h.item.trailing}
                            <AnimatePresence>
                              {on && (
                                <motion.span
                                  initial={{ opacity: 0, x: -6, scale: 0.8 }}
                                  animate={{ opacity: 1, x: 0, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}
                                  className="hidden h-7 items-center gap-1 rounded-[9px] bg-ink px-2 text-[11px] font-medium text-[var(--surface)] sm:flex dark:bg-accent dark:text-accent-ink"
                                >
                                  {h.item.stay ? <ChevronRight className="size-3" /> : <CornerDownLeft className="size-3" />}
                                  {h.item.stay ? t('settings.palette.browse') : h.item.group === 'actions' || h.item.group === 'themes' || h.item.group === 'languages' ? t('settings.palette.run') : t('core.action.open')}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </span>
                        </motion.div>
                      )
                    })}
                  </div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* footer */}
        <div className="relative z-[1] flex shrink-0 items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[11.5px] text-ink-3">
          <span className="hidden items-center gap-1.5 sm:flex">
            <kbd className="rounded-[6px] border border-line-2 px-1.5 font-mono text-[10.5px]">↑</kbd>
            <kbd className="rounded-[6px] border border-line-2 px-1.5 font-mono text-[10.5px]">↓</kbd>
            <kbd className="rounded-[6px] border border-line-2 px-1.5 font-mono text-[10.5px]">↵</kbd>
            <span className="ml-1">{t('core.palette.hint')}</span>
          </span>
          <span className="sm:hidden">{t('settings.palette.results', { count: flat.length })}</span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded-[6px] border border-line-2 px-1.5 font-mono text-[10.5px]">tab</kbd>
            <span className="hidden sm:inline">{t('settings.palette.nextGroup')}</span>
            <span className="mx-1 hidden h-3 w-px bg-[var(--line-2)] sm:inline-block" />
            <span className="hidden font-mono sm:inline">&gt; # @ /</span>
          </span>
        </div>
      </motion.div>
    </div>
  )
}

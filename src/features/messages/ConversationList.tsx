import { memo, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react'
import { Archive, ArchiveRestore, BellOff, CheckCheck, Inbox, Keyboard, MoreHorizontal, Pin, PinOff, Search, SquarePen, Volume2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { chatTime } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useConversations, useDiscipline, useMeId, type ConversationView } from '@/store/selectors'
import { useUI } from '@/store/ui'
import { disciplineTheme } from '@/theme/disciplines'
import { Button, IconButton } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Menu } from '@/components/ui/Menu'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Job } from '@/store/types'
import { CLOSED, conversationMatchesDiscipline, personLine, presenceOf, previewOf } from './model'
import { useMediaQuery, useNow } from './hooks'
import { useMessagesPrefs, type InboxFilter } from './store'
import { highlight, JobChip, PersonAvatar, POPOVER_SURFACE, TypingDots } from './ui'

export function ConversationList({
  activeId,
  onSelect,
  onNew,
  onShortcuts,
  className,
}: {
  activeId?: string
  onSelect: (id: string) => void
  onNew: () => void
  onShortcuts?: () => void
  className?: string
}) {
  const t = useT()
  const meId = useMeId()
  const all = useConversations({ includeArchived: true })
  const typing = useUI((s) => s.typing)
  const discipline = useDiscipline()
  const setDiscipline = useApp((s) => s.setDiscipline)
  const markRead = useApp((s) => s.markConversationRead)
  const jobs = useApp((s) => s.jobs)
  const filter = useMessagesPrefs((s) => s.filter)
  const setFilter = useMessagesPrefs((s) => s.setFilter)
  const [query, setQuery] = useState('')
  const coarse = useMediaQuery('(pointer: coarse)')
  const now = useNow(30_000)

  const jobById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs])
  const scoped = useMemo(
    () => all.filter((v) => v.conversation.id === activeId || conversationMatchesDiscipline(v, discipline, jobById)),
    [all, discipline, jobById, activeId],
  )
  const counts = useMemo(() => {
    const live = scoped.filter((v) => !v.conversation.archived)
    return {
      all: live.length,
      unread: live.filter((v) => v.unread > 0).length,
      unreadMsgs: live.reduce((n, v) => n + (v.conversation.muted ? 0 : v.unread), 0),
      pinned: live.filter((v) => v.conversation.pinned).length,
      archived: scoped.filter((v) => v.conversation.archived).length,
    }
  }, [scoped])

  const q = query.trim().toLowerCase()
  const shown = useMemo(() => {
    const byFilter = scoped.filter((v) => {
      const c = v.conversation
      if (filter === 'archived') return c.archived
      if (c.archived) return false
      if (filter === 'unread') return v.unread > 0 || c.id === activeId
      if (filter === 'pinned') return c.pinned
      return true
    })
    if (!q) return byFilter.map((v) => ({ view: v, hit: undefined as string | undefined }))
    const out: { view: ConversationView; hit: string | undefined }[] = []
    for (const v of byFilter) {
      const p = v.counterpart
      const linked = v.conversation.jobIds.map((id) => jobById.get(id)).filter(Boolean) as Job[]
      const hay = [p?.name, personLine(p), p && 'contactName' in p ? p.contactName : '', ...linked.flatMap((j) => [j.id, j.title])].join(' ').toLowerCase()
      if (hay.includes(q)) {
        out.push({ view: v, hit: undefined })
        continue
      }
      const msg = [...v.messages].reverse().find((m) => m.text.toLowerCase().includes(q))
      if (msg) out.push({ view: v, hit: msg.text.replace(/\s+/g, ' ') })
    }
    return out
  }, [scoped, filter, q, activeId, jobById])

  const onlineNow = useMemo(() => {
    if (filter !== 'all' || q) return []
    return scoped
      .filter((v) => !v.conversation.archived)
      .filter((v) => {
        let lastFromThem: string | undefined
        for (let i = v.messages.length - 1; i >= 0; i--)
          if (v.messages[i].senderId === v.counterpartId) {
            lastFromThem = v.messages[i].createdAt
            break
          }
        return presenceOf(v.counterpartId, lastFromThem, !!typing[v.conversation.id], now) === 'online'
      })
      .slice(0, 12)
  }, [scoped, filter, q, typing, now])

  const pinned = filter === 'all' && !q ? shown.filter((x) => x.view.conversation.pinned) : []
  const rest = filter === 'all' && !q ? shown.filter((x) => !x.view.conversation.pinned) : shown

  const markAllRead = () => {
    all.filter((v) => v.unread > 0).forEach((v) => markRead(v.conversation.id))
  }

  const renderRows = (rows: typeof shown, offset = 0) =>
    rows.map((x, i) => (
      <ConversationRow
        key={x.view.conversation.id}
        view={x.view}
        hit={x.hit}
        query={q}
        index={offset + i}
        active={x.view.conversation.id === activeId}
        typing={!!typing[x.view.conversation.id]}
        meId={meId}
        now={now}
        coarse={coarse}
        jobById={jobById}
        onSelect={onSelect}
      />
    ))

  const filterOptions: { value: InboxFilter; label: ReactNode; count?: number }[] = [
    { value: 'all', label: t('messages.filter.all') },
    { value: 'unread', label: t('messages.filter.unread'), count: counts.unread || undefined },
    { value: 'pinned', label: t('messages.filter.pinned') },
    { value: 'archived', label: t('messages.filter.archived') },
  ]

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="relative z-[2] space-y-3 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[19px] font-medium tracking-[-0.02em]">{t('messages.list.title')}</h2>
            <AnimatePresence>
              {counts.unreadMsgs > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={spring.bouncy}
                  className="inline-flex h-6 items-center rounded-full bg-accent px-2 font-mono text-[11.5px] font-semibold text-accent-ink"
                >
                  <motion.span key={counts.unreadMsgs} initial={{ y: -8, opacity: 0, filter: 'blur(3px)' }} animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}>
                    {counts.unreadMsgs}
                  </motion.span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1.5">
            <Menu
              width={230}
              className={POPOVER_SURFACE}
              trigger={({ onClick }) => (
                <IconButton label={t('messages.list.more')} variant="soft" size="sm" onClick={onClick}>
                  <MoreHorizontal className="size-4" />
                </IconButton>
              )}
              items={[
                { label: t('messages.list.markAllRead'), icon: <CheckCheck />, onClick: markAllRead, disabled: counts.unread === 0 },
                { divider: true, label: '' },
                { label: t('messages.filter.unread'), icon: <Inbox />, onClick: () => setFilter('unread'), active: filter === 'unread' },
                { label: t('messages.filter.pinned'), icon: <Pin />, onClick: () => setFilter('pinned'), active: filter === 'pinned' },
                { label: t('messages.filter.archived'), icon: <Archive />, onClick: () => setFilter('archived'), active: filter === 'archived' },
                ...(onShortcuts ? [{ divider: true, label: '' }, { label: t('messages.keys.title'), icon: <Keyboard />, onClick: onShortcuts, hint: '?' }] : []),
              ]}
            />
            <Button size="sm" icon={<SquarePen className="size-4" />} onClick={onNew} aria-label={t('messages.list.new')}>
              <span className="hidden sm:inline md:hidden lg:inline">{t('messages.list.newShort')}</span>
            </Button>
          </div>
        </div>

        <label className="group relative flex h-10 items-center gap-2 rounded-full bg-[var(--surface-2)] pl-3.5 pr-1.5 transition-shadow focus-within:shadow-[0_0_0_4px_var(--accent-softer)]">
          <Search className="size-4 shrink-0 text-ink-3 transition-colors group-focus-within:text-ink" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            placeholder={t('messages.list.search')}
            data-msg-search
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3 sm:text-[13.5px]"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                onClick={() => setQuery('')}
                className="flex size-7 items-center justify-center rounded-full bg-[var(--surface-3)] text-ink-2"
                aria-label={t('messages.action.clear')}
              >
                <X className="size-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </label>

        <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
          <Segmented size="sm" value={filter} onChange={setFilter} options={filterOptions} layoutId="msg-filter" className="flex min-w-full [&>button]:flex-1 [&>button]:px-1.5" />
        </div>

        <AnimatePresence>
          {discipline !== 'all' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-[12px]" style={{ background: `color-mix(in oklab, ${disciplineTheme(discipline).accent} 14%, transparent)` }}>
                <span className="truncate text-ink-2">{t('messages.list.scoped', { discipline: t(disciplineTheme(discipline).labelKey) })}</span>
                <button type="button" onClick={() => setDiscipline('all')} className="shrink-0 font-medium text-ink underline-offset-2 hover:underline">
                  {t('messages.list.showAll')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
        {shown.length === 0 ? (
          <EmptyState
            icon={q ? <Search /> : filter === 'archived' ? <Archive /> : filter === 'pinned' ? <Pin /> : <Inbox />}
            title={q ? t('messages.empty.searchTitle', { query }) : t(`messages.empty.${filter}Title`)}
            description={q ? t('messages.empty.searchBody') : t(`messages.empty.${filter}Body`)}
            action={
              q ? (
                <Button size="sm" variant="soft" onClick={() => setQuery('')}>
                  {t('messages.action.clearSearch')}
                </Button>
              ) : filter !== 'all' ? (
                <Button size="sm" variant="soft" onClick={() => setFilter('all')}>
                  {t('messages.filter.showAll')}
                </Button>
              ) : (
                <Button size="sm" icon={<SquarePen className="size-4" />} onClick={onNew}>
                  {t('messages.list.new')}
                </Button>
              )
            }
          />
        ) : (
          <ul className="relative">
            {onlineNow.length > 0 && (
              <li>
                <ActiveStrip views={onlineNow} activeId={activeId} typing={typing} onSelect={onSelect} />
              </li>
            )}
            {pinned.length > 0 && <SectionLabel icon={<Pin className="size-3" />}>{t('messages.list.pinned')}</SectionLabel>}
            <AnimatePresence initial={true} mode="popLayout">
              {renderRows(pinned)}
            </AnimatePresence>
            {pinned.length > 0 && rest.length > 0 && <SectionLabel>{t('messages.list.allMessages')}</SectionLabel>}
            <AnimatePresence initial={true} mode="popLayout">
              {renderRows(rest, pinned.length)}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <li className="flex items-center gap-1.5 px-3 pb-1.5 pt-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-3">
      {icon}
      {children}
    </li>
  )
}

/** Story-style row of counterparts who are online right now. */
function ActiveStrip({
  views,
  activeId,
  typing,
  onSelect,
}: {
  views: ConversationView[]
  activeId?: string
  typing: Record<string, boolean>
  onSelect: (id: string) => void
}) {
  const t = useT()
  return (
    <div className="pb-1 pt-1">
      <div className="flex items-center gap-1.5 px-3 pb-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-3">
        <span className="relative flex size-1.5">
          <span className="msg-anim absolute inset-0 animate-ping rounded-full bg-success opacity-60" />
          <span className="relative size-1.5 rounded-full bg-success" />
        </span>
        {t('messages.active.title')}
        <span className="ml-auto">{views.length}</span>
      </div>
      <div className="no-scrollbar mask-fade-x flex gap-1 overflow-x-auto px-1.5 pb-1.5 pt-1">
        {views.map((v, i) => {
          const id = v.conversation.id
          const p = v.counterpart
          const first = !p ? '' : 'contactName' in p ? p.name : p.name.split(' ')[0]
          const isTyping = !!typing[id]
          const current = id === activeId
          return (
            <motion.button
              key={id}
              type="button"
              initial={{ opacity: 0, scale: 0.5, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', transition: { ...spring.bouncy, delay: 0.05 + i * 0.045 } }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onSelect(id)}
              title={p?.name}
              className="flex w-[60px] shrink-0 flex-col items-center gap-1 rounded-2xl py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <span className="relative block rounded-full p-[2.5px]">
                <motion.span
                  aria-hidden
                  className={cn(
                    'absolute inset-0 rounded-full',
                    v.unread > 0 || isTyping
                      ? 'bg-[conic-gradient(from_0deg,var(--accent),color-mix(in_oklab,var(--accent)_20%,transparent),var(--accent))]'
                      : current
                        ? 'bg-ink dark:bg-[var(--ink-3)]'
                        : 'bg-[var(--line-2)]',
                  )}
                  animate={v.unread > 0 || isTyping ? { rotate: 360 } : { rotate: 0 }}
                  transition={v.unread > 0 || isTyping ? { duration: 4, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
                />
                <span className="relative block rounded-full bg-[var(--surface)] p-[2px]">
                  <PersonAvatar person={p} size={44} status="online" />
                </span>
                <AnimatePresence>
                  {isTyping && (
                    <motion.span
                      initial={{ scale: 0, y: 4 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0 }}
                      transition={spring.bouncy}
                      className="absolute -bottom-1 left-1/2 flex h-4 -translate-x-1/2 items-center rounded-full bg-accent px-1.5 text-accent-ink shadow ring-2 ring-[var(--surface)]"
                    >
                      <TypingDots size={3} dot="bg-current" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className={cn('w-full truncate text-center text-[11px]', current ? 'font-medium text-ink' : 'text-ink-2')}>{first}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

const ACTION_W = 172

interface RowProps {
  view: ConversationView
  hit?: string
  query: string
  index: number
  active: boolean
  typing: boolean
  meId: string
  now: number
  coarse: boolean
  jobById: Map<string, Job>
  onSelect: (id: string) => void
}

const ConversationRow = memo(function ConversationRow({ view, hit, query, index, active, typing, meId, now, coarse, jobById, onSelect }: RowProps) {
  const t = useT()
  const lang = useLang()
  const togglePin = useApp((s) => s.togglePinConversation)
  const toggleMute = useApp((s) => s.toggleMuteConversation)
  const toggleArchive = useApp((s) => s.toggleArchiveConversation)
  const c = view.conversation
  const p = view.counterpart
  const last = view.last
  const x = useMotionValue(0)
  const actionsOpacity = useTransform(x, [-70, -10], [1, 0])
  const [revealed, setRevealed] = useState(false)

  const lastFromThem = useMemo(() => {
    for (let i = view.messages.length - 1; i >= 0; i--) if (view.messages[i].senderId === view.counterpartId) return view.messages[i].createdAt
    return undefined
  }, [view.messages, view.counterpartId])
  const presence = presenceOf(view.counterpartId, lastFromThem, typing, now)
  const linked = c.jobIds.map((id) => jobById.get(id)).filter(Boolean) as Job[]
  const chipJob = linked.find((j) => !CLOSED.includes(j.status)) ?? linked[0]
  const draft = !active ? c.draft?.trim() : ''
  const own = last?.senderId === meId
  const unread = view.unread

  const close = () => {
    animate(x, 0, spring.snappy)
    setRevealed(false)
  }

  const actions = [
    {
      key: 'pin',
      label: c.pinned ? t('messages.action.unpin') : t('messages.action.pin'),
      icon: c.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />,
      run: () => togglePin(c.id),
      tone: 'bg-accent text-accent-ink',
    },
    {
      key: 'mute',
      label: c.muted ? t('messages.action.unmute') : t('messages.action.mute'),
      icon: c.muted ? <Volume2 className="size-4" /> : <BellOff className="size-4" />,
      run: () => toggleMute(c.id),
      tone: 'bg-ink text-[var(--surface)]',
    },
    {
      key: 'archive',
      label: c.archived ? t('messages.action.unarchive') : t('messages.action.archive'),
      icon: c.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />,
      run: () => toggleArchive(c.id),
      tone: 'bg-[#f97316] text-white',
    },
  ]

  const preview: ReactNode = typing ? (
    <span className={cn('flex items-center gap-1.5 font-medium', active ? 'text-accent dark:text-accent-text' : 'text-accent-text')}>
      <TypingDots size={4.5} dot="bg-current" />
      {t('messages.typing')}
    </span>
  ) : hit ? (
    <span className="truncate">{highlight(snippet(hit, query), query)}</span>
  ) : draft ? (
    <span className="truncate">
      <span className="font-medium text-danger">{t('messages.list.draft')}: </span>
      {draft}
    </span>
  ) : last ? (
    <span className="truncate">
      {own && <span className={active ? 'opacity-70' : 'text-ink-3'}>{t('messages.list.you')}: </span>}
      {previewOf(last, t)}
    </span>
  ) : (
    <span className="truncate italic opacity-70">{t('messages.list.noMessages')}</span>
  )

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: EASE_OUT, delay: Math.min(index, 12) * 0.035 } }}
      exit={{ opacity: 0, scale: 0.96, filter: 'blur(4px)', transition: { duration: 0.18 } }}
      transition={{ layout: spring.smooth }}
      className="relative"
    >
      {coarse && (
        <motion.div style={{ opacity: actionsOpacity }} className="absolute inset-y-1 right-1 flex items-center gap-1.5 pr-1">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              aria-label={a.label}
              onClick={() => {
                a.run()
                close()
              }}
              className={cn('flex size-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-[9.5px] font-medium', a.tone)}
            >
              {a.icon}
            </button>
          ))}
        </motion.div>
      )}
      <motion.div
        role="button"
        tabIndex={0}
        aria-current={active ? 'page' : undefined}
        drag={coarse ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: -ACTION_W, right: 0 }}
        dragElastic={{ left: 0.12, right: 0.04 }}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={(_, info) => {
          const open = info.offset.x < -60 || info.velocity.x < -350
          animate(x, open ? -ACTION_W : 0, spring.snappy)
          setRevealed(open)
        }}
        onClick={() => {
          if (revealed) return close()
          onSelect(c.id)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(c.id)
          }
        }}
        whileTap={{ scale: 0.985 }}
        className={cn(
          'group relative flex cursor-pointer select-none items-center gap-3 rounded-[22px] px-3 py-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
          coarse && !active && 'bg-[color-mix(in_oklab,var(--surface)_96%,transparent)]',
          active ? 'text-[var(--surface)] dark:text-ink' : 'text-ink hover:bg-[var(--surface-2)]',
        )}
      >
        {active && (
          <motion.span
            layoutId="msg-active-row"
            className="absolute inset-0 rounded-[22px] bg-ink shadow-[0_14px_30px_-14px_rgba(0,0,0,.6)] dark:bg-[var(--surface-3)]"
            transition={spring.pill}
          />
        )}
        <span className="relative z-[1]">
          <PersonAvatar person={p} size={46} status={presence === 'offline' ? undefined : presence} />
          {c.pinned && (
            <span className="absolute -left-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-accent text-accent-ink shadow ring-2 ring-[var(--surface)]">
              <Pin className="size-2.5" />
            </span>
          )}
        </span>
        <span className="relative z-[1] min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn('truncate text-[14.5px] tracking-[-0.01em]', unread > 0 ? 'font-semibold' : 'font-medium')}>{highlight(p?.name ?? '—', query)}</span>
            {c.muted && <BellOff className={cn('size-3.5 shrink-0', active ? 'opacity-60' : 'text-ink-3')} />}
            <span className={cn('ml-auto shrink-0 font-mono text-[11px]', active ? 'opacity-60' : unread > 0 ? 'font-medium text-accent-text' : 'text-ink-3')}>
              {last ? chatTime(last.createdAt, lang) : ''}
            </span>
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            {chipJob && <JobChip job={chipJob} active={active} />}
            <span className={cn('flex min-w-0 flex-1 text-[13px]', active ? 'opacity-75' : unread > 0 ? 'text-ink' : 'text-ink-3')}>{preview}</span>
            <AnimatePresence>
              {unread > 0 && (
                <motion.span
                  key="u"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={spring.bouncy}
                  className={cn(
                    'flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 font-mono text-[10.5px] font-semibold',
                    c.muted ? 'bg-[var(--surface-3)] text-ink-2' : 'bg-accent text-accent-ink shadow-[0_4px_12px_-4px_var(--accent)]',
                  )}
                >
                  {unread > 9 ? '9+' : unread}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </span>

        {!coarse && (
          <span className="pointer-events-none absolute right-2 top-1.5 z-[2] flex translate-x-1 items-center gap-0.5 rounded-full p-0.5 opacity-0 blur-[2px] transition-[opacity,transform,filter] duration-200 ease-[var(--ease-out)] group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-hover:blur-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:blur-0">
            <span className="glass glass-strong glass-pill flex items-center gap-0.5 p-0.5">
              {actions.map((a) => (
                <motion.button
                  key={a.key}
                  type="button"
                  title={a.label}
                  aria-label={a.label}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    a.run()
                  }}
                  className="relative z-[1] flex size-7 items-center justify-center rounded-full text-ink-2 hover:bg-[var(--surface-2)] hover:text-ink [&_svg]:size-3.5"
                >
                  {a.icon}
                </motion.button>
              ))}
            </span>
          </span>
        )}
      </motion.div>
    </motion.li>
  )
})

/** Text window around the first match. */
function snippet(text: string, q: string) {
  const i = text.toLowerCase().indexOf(q)
  if (i < 18) return text
  return '…' + text.slice(i - 14)
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ChevronDown, ChevronUp, ImagePlus, Search, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_IOS, EASE_OUT, spring } from '@/lib/motion'
import { shortDate } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useMeId, useRole, type ConversationView } from '@/store/selectors'
import { useUI } from '@/store/ui'
import { toast } from '@/store/toasts'
import type { MediaRef, Message } from '@/store/types'
import { Glass } from '@/components/ui/Glass'
import { Drawer } from '@/components/ui/Overlay'
import { Lightbox } from '@/components/ui/Lightbox'
import { ThreadCtx, type ThreadCtxValue } from './context'
import { ThreadHeader } from './ThreadHeader'
import { MessageItem, TypingBubble, type Enter } from './MessageItem'
import { Composer, type ComposerHandle } from './Composer'
import { InfoPanel } from './InfoPanel'
import { ActionSheet } from './ActionSheet'
import { CallOverlay } from './CallOverlay'
import { CLOSED, buildThread, dayLabel, mmss, presenceOf, quickReplies, type ThreadItem } from './model'
import { blip, useCopy, useDeleteWithUndo, useMediaQuery, useNow } from './hooks'
import { useMessagesPrefs, usePendingDeletes } from './store'
import { PersonAvatar, POPOVER_SURFACE } from './ui'

const INITIAL_ANIMATED = 14

export function Thread({ view, onBack }: { view: ConversationView; onBack?: () => void }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const role = useRole()
  const meId = useMeId()
  const c = view.conversation
  const convId = c.id
  const typing = useUI((s) => !!s.typing[convId])
  const setUI = useUI((s) => s.set)
  const markRead = useApp((s) => s.markConversationRead)
  const toggleReaction = useApp((s) => s.toggleReaction)
  const postMessage = useApp((s) => s.postMessage)
  const sendMessage = useApp((s) => s.sendMessage)
  const jobs = useApp((s) => s.jobs)
  const hidden = usePendingDeletes((s) => s.hidden)
  const savedList = useMessagesPrefs((s) => s.saved)
  const toggleSaved = useMessagesPrefs((s) => s.toggleSaved)
  const pushEmoji = useMessagesPrefs((s) => s.pushEmoji)
  const infoOpen = useMessagesPrefs((s) => s.infoOpen)
  const setInfoOpen = useMessagesPrefs((s) => s.setInfoOpen)
  // inline info pane only when the thread keeps a comfortable width; otherwise a drawer
  const isXl = useMediaQuery('(min-width: 1440px)')
  const coarse = useMediaQuery('(pointer: coarse)')
  const copyText = useCopy()
  const deleteWithUndo = useDeleteWithUndo()
  const now = useNow(30_000)

  const messages = useMemo(() => view.messages.filter((m) => !hidden[m.id]), [view.messages, hidden])
  const messagesById = useMemo(() => new Map(view.messages.map((m) => [m.id, m])), [view.messages])
  const jobById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs])
  const linkedJobs = useMemo(() => {
    const ids = new Set(c.jobIds)
    for (const m of view.messages) if (m.jobId) ids.add(m.jobId)
    return [...ids]
      .map((id) => jobById.get(id))
      .filter((j): j is NonNullable<typeof j> => !!j)
      .sort((a, b) => Number(CLOSED.includes(a.status)) - Number(CLOSED.includes(b.status)) || b.updatedAt.localeCompare(a.updatedAt))
  }, [c.jobIds, view.messages, jobById])

  const lastFromThem = useMemo(() => {
    for (let i = view.messages.length - 1; i >= 0; i--) if (view.messages[i].senderId === view.counterpartId) return view.messages[i].createdAt
    return undefined
  }, [view.messages, view.counterpartId])
  const presence = presenceOf(view.counterpartId, lastFromThem, typing, now)

  // ── active conversation (suppresses toasts) + read state
  useEffect(() => {
    setUI({ activeConversationId: convId })
    return () => {
      if (useUI.getState().activeConversationId === convId) setUI({ activeConversationId: null })
    }
  }, [convId, setUI])
  useEffect(() => {
    if (document.visibilityState === 'visible') markRead(convId)
  }, [convId, messages.length, markRead])
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && markRead(convId)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [convId, markRead])

  // "New messages" divider: captured once, before the thread is marked read.
  const [unreadFromId] = useState(() => {
    const conv = useApp.getState().conversations.find((x) => x.id === convId)
    const readAt = conv?.lastReadAt[meId] ?? ''
    return view.messages.find((m) => m.senderId !== meId && m.senderId !== 'system' && m.createdAt > readAt)?.id ?? null
  })
  const [mountedIds] = useState(() => new Set(view.messages.map((m) => m.id)))

  const items = useMemo(() => buildThread(messages, meId, unreadFromId), [messages, meId, unreadFromId])
  const lastOwnId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].senderId === meId && messages[i].kind !== 'system') return messages[i].id
    return undefined
  }, [messages, meId])

  // ── scrolling
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const [showJump, setShowJump] = useState(false)
  const [newCount, setNewCount] = useState(0)

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const scrollToMessage = useCallback((id: string, smooth = true) => {
    const box = scrollRef.current
    const el = document.getElementById(`msg-${id}`)
    if (!box || !el) return false
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - box.clientHeight / 2 + el.offsetHeight / 2
    box.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' })
    return true
  }, [])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const d = el.scrollHeight - el.scrollTop - el.clientHeight
    atBottom.current = d < 96
    setShowJump(d > 320)
    if (d < 96) setNewCount(0)
  }

  useLayoutEffect(() => {
    // open at the unread divider, otherwise at the bottom
    const el = scrollRef.current
    if (!el) return
    if (unreadFromId) {
      const div = el.querySelector('[data-unread-divider]') as HTMLElement | null
      if (div) {
        el.scrollTop = Math.max(0, div.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 90)
        atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96
        return
      }
    }
    el.scrollTop = el.scrollHeight
  }, [])

  const prevLen = useRef(messages.length)
  useEffect(() => {
    const prev = prevLen.current
    prevLen.current = messages.length
    if (messages.length <= prev) return
    const added = messages.slice(prev)
    const mine = added.some((m) => m.senderId === meId)
    if (mine || atBottom.current) requestAnimationFrame(() => scrollToBottom(true))
    else setNewCount((n) => n + added.length)
    if (added.some((m) => m.senderId !== meId && m.senderId !== 'system')) blip('receive')
  }, [messages, meId, scrollToBottom])

  useEffect(() => {
    if (typing && atBottom.current) requestAnimationFrame(() => scrollToBottom(true))
  }, [typing, scrollToBottom])

  // ── search
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const q = searchOpen ? query.trim().toLowerCase() : ''
  const hits = useMemo(() => (q ? messages.filter((m) => m.text.toLowerCase().includes(q)).map((m) => m.id) : []), [messages, q])
  const [hitIdx, setHitIdx] = useState(0)
  useEffect(() => setHitIdx(Math.max(0, hits.length - 1)), [q, hits.length])
  const currentHitId = hits[hitIdx]
  useEffect(() => {
    if (currentHitId) scrollToMessage(currentHitId)
  }, [currentHitId, scrollToMessage])
  const searchInput = useRef<HTMLInputElement>(null)
  const openSearch = () => {
    setSearchOpen((o) => !o)
    if (!searchOpen) requestAnimationFrame(() => searchInput.current?.focus())
    else {
      searchInput.current?.blur()
      setQuery('')
    }
  }

  // ── reply / edit / flash / sheets
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editing, setEditing] = useState<Message | null>(null)
  const [flashId, setFlashId] = useState<string | undefined>()
  const [sheet, setSheet] = useState<Message | null>(null)
  const [lightbox, setLightbox] = useState<{ items: MediaRef[]; index: number; origin?: (i: number) => Element | null | undefined } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [calling, setCalling] = useState(false)
  const composer = useRef<ComposerHandle>(null)

  const jumpTo = useCallback(
    (id: string) => {
      if (!messagesById.has(id) || hidden[id]) {
        toast({ title: t('messages.toast.unavailable'), tone: 'info', duration: 2000 })
        return
      }
      setDrawerOpen(false)
      requestAnimationFrame(() => scrollToMessage(id))
      setFlashId(id)
      window.setTimeout(() => setFlashId((f) => (f === id ? undefined : f)), 1900)
    },
    [messagesById, hidden, scrollToMessage, t],
  )

  const startCall = useCallback(() => {
    toast({ title: t('messages.call.toast'), description: view.counterpart?.name, tone: 'info', avatarSeed: view.counterpart?.avatarSeed, duration: 2600 })
    setCalling(true)
  }, [t, view.counterpart])

  const endCall = (sec: number | null) => {
    setCalling(false)
    if (sec) postMessage(convId, 'system', { kind: 'system', text: `📞 Call with ${view.counterpart?.name ?? 'counterpart'} · ${mmss(sec)} (demo)` })
  }

  const saved = useMemo(() => new Set(savedList), [savedList])

  const ctx: ThreadCtxValue = useMemo(
    () => ({
      convId,
      meId,
      role,
      counterpart: view.counterpart,
      counterpartId: view.counterpartId,
      jobById,
      messagesById,
      readAt: c.lastReadAt[view.counterpartId] ?? '',
      lastOwnId,
      query: q,
      currentHitId,
      flashId,
      saved,
      coarse,
      reply: (m) => {
        setEditing(null)
        setReplyTo(m)
      },
      edit: (m) => {
        setReplyTo(null)
        setEditing(m)
      },
      remove: (m) => {
        setEditing((e) => (e?.id === m.id ? null : e))
        setReplyTo((r) => (r?.id === m.id ? null : r))
        deleteWithUndo(m.id)
      },
      react: (m, emoji) => {
        toggleReaction(m.id, emoji)
        pushEmoji(emoji)
        blip('pop')
      },
      toggleSave: (m) => {
        const was = saved.has(m.id)
        toggleSaved(m.id)
        toast({ title: was ? t('messages.toast.unsaved') : t('messages.toast.saved'), tone: was ? 'default' : 'success', duration: 1600 })
      },
      copy: (m) => void copyText(m.text),
      openMedia: (items, index, origin) => setLightbox({ items, index, origin }),
      jumpTo,
      openSheet: (m) => setSheet(m),
      openJob: (id, tab) => navigate(`/jobs/${id}${tab ? `?tab=${tab}` : ''}`),
    }),
    [convId, meId, role, view.counterpart, view.counterpartId, jobById, messagesById, c.lastReadAt, lastOwnId, q, currentHitId, flashId, saved, coarse, deleteWithUndo, toggleReaction, pushEmoji, toggleSaved, copyText, jumpTo, navigate, t],
  )

  const editLast = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.senderId === meId && m.kind === 'text') {
        setEditing(m)
        return
      }
    }
  }

  // ── drag & drop files onto the thread
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files')

  // ── day sections (sticky headers are scoped to their day) + entrance bookkeeping
  const sections = useMemo(() => {
    const out: { key: string; iso: string; items: ThreadItem[] }[] = []
    for (const it of items) {
      if (it.type === 'day') out.push({ key: it.key, iso: it.iso, items: [] })
      else out[out.length - 1]?.items.push(it)
    }
    return out
  }, [items])
  const enterMap = useMemo(() => {
    const map = new Map<string, { enter: Enter; delay: number }>()
    const msgs = items.filter((i) => i.type === 'msg')
    const from = Math.max(0, msgs.length - INITIAL_ANIMATED)
    msgs.forEach((it, idx) => {
      if (!mountedIds.has(it.key)) map.set(it.key, { enter: 'live', delay: 0 })
      else if (idx >= from) map.set(it.key, { enter: 'initial', delay: 0.06 + (idx - from) * 0.035 })
      else map.set(it.key, { enter: 'none', delay: 0 })
    })
    return map
  }, [items, mountedIds])

  const toggleInfo = () => {
    if (isXl) setInfoOpen(!infoOpen)
    else setDrawerOpen(true)
  }

  const infoPanel = (onClose?: () => void) => (
    <InfoPanel
      view={view}
      jobs={linkedJobs}
      presence={presence}
      onClose={onClose}
      onOpenMedia={(items, index, origin) => setLightbox({ items, index, origin })}
      onJumpTo={jumpTo}
      onCall={startCall}
    />
  )

  const firstName = view.counterpart ? ('contactName' in view.counterpart ? view.counterpart.contactName : view.counterpart.name).split(' ')[0] : ''

  return (
    <ThreadCtx.Provider value={ctx}>
      <Glass
        className="@container relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        onDragEnter={(e) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          dragDepth.current++
          setDragging(true)
        }}
        onDragOver={(e) => hasFiles(e) && e.preventDefault()}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (!dragDepth.current) setDragging(false)
        }}
        onDrop={(e) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          dragDepth.current = 0
          setDragging(false)
          composer.current?.addFiles(Array.from(e.dataTransfer.files))
        }}
      >
        <ThreadHeader
          view={view}
          presence={presence}
          typing={typing}
          lastFromThem={lastFromThem}
          jobs={linkedJobs}
          onBack={onBack}
          searchOpen={searchOpen}
          onSearch={openSearch}
          onCall={startCall}
          infoActive={isXl ? infoOpen : drawerOpen}
          onToggleInfo={toggleInfo}
        />

        {/* in-thread search */}
        <AnimatePresence initial={false}>
          {searchOpen && (
            <motion.div
              key="search"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="relative z-[5] overflow-hidden border-b border-[var(--line)]"
            >
              <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
                <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 focus-within:shadow-[0_0_0_4px_var(--accent-softer)]">
                  <Search className="size-4 shrink-0 text-ink-3" />
                  <input
                    ref={searchInput}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (hits.length) setHitIdx((i) => (e.shiftKey ? (i + 1) % hits.length : (i - 1 + hits.length) % hits.length))
                      }
                      if (e.key === 'Escape') openSearch()
                    }}
                    placeholder={t('messages.thread.searchPlaceholder')}
                    className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3 sm:text-[13.5px]"
                  />
                  <span className="shrink-0 font-mono text-[11px] text-ink-3">{q ? (hits.length ? `${hitIdx + 1}/${hits.length}` : t('messages.thread.noHits')) : ''}</span>
                </label>
                <button
                  type="button"
                  disabled={!hits.length}
                  onClick={() => setHitIdx((i) => (i - 1 + hits.length) % hits.length)}
                  className="flex size-8 items-center justify-center rounded-full text-ink-2 hover:bg-[var(--surface-2)] disabled:opacity-30"
                  aria-label={t('messages.thread.prevHit')}
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={!hits.length}
                  onClick={() => setHitIdx((i) => (i + 1) % hits.length)}
                  className="flex size-8 items-center justify-center rounded-full text-ink-2 hover:bg-[var(--surface-2)] disabled:opacity-30"
                  aria-label={t('messages.thread.nextHit')}
                >
                  <ChevronDown className="size-4" />
                </button>
                <button type="button" onClick={openSearch} className="flex size-8 items-center justify-center rounded-full text-ink-2 hover:bg-[var(--surface-2)]" aria-label={t('messages.action.close')}>
                  <X className="size-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* messages */}
        <div className="relative min-h-0 flex-1">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_100%_0%,var(--accent-softer),transparent_70%),radial-gradient(60%_45%_at_0%_100%,var(--accent-softer),transparent_70%)]" />
          <div aria-hidden className="dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(180deg,transparent,#000_30%,#000_70%,transparent)]" />
          <div ref={scrollRef} onScroll={onScroll} className="absolute inset-0 overflow-y-auto overscroll-contain px-2.5 pb-4 pt-12 sm:px-5" role="log" aria-live="polite" aria-label={t('messages.thread.log')}>
            {messages.length === 0 ? (
              <EmptyThread
                person={view.counterpart}
                firstName={firstName}
                since={c.createdAt ? shortDate(c.createdAt, lang) : ''}
                suggestions={quickReplies(role, undefined, meId).slice(0, 3)}
                onPick={(text) => {
                  sendMessage(convId, { text })
                  blip('send')
                }}
              />
            ) : (
              <div>
                {sections.map((sec) => (
                  <section key={sec.key} className="relative">
                    <div className="pointer-events-none sticky top-1 z-[4] flex justify-center py-2">
                      <motion.span
                        initial={{ opacity: 0, y: -6, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={spring.snappy}
                        className={cn('glass glass-pill pointer-events-auto px-3 py-1 text-[11.5px] font-medium text-ink-2 shadow-[0_6px_16px_-8px_rgba(0,0,0,.25)]', POPOVER_SURFACE)}
                      >
                        <span className="relative z-[1]">{dayLabel(sec.iso, lang, t)}</span>
                      </motion.span>
                    </div>
                    <AnimatePresence initial={false}>
                      {sec.items.map((it) => {
                        if (it.type === 'unread')
                          return (
                            <motion.div
                              key={it.key}
                              data-unread-divider
                              initial={{ opacity: 0, scaleX: 0.6 }}
                              animate={{ opacity: 1, scaleX: 1 }}
                              transition={{ duration: 0.6, ease: EASE_OUT }}
                              className="my-3 flex items-center gap-3"
                            >
                              <span className="h-px flex-1 bg-[linear-gradient(90deg,transparent,var(--accent))]" />
                              <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-accent-ink">
                                {t('messages.thread.unreadDivider')}
                              </span>
                              <span className="h-px flex-1 bg-[linear-gradient(90deg,var(--accent),transparent)]" />
                            </motion.div>
                          )
                        if (it.type !== 'msg') return null
                        const e = enterMap.get(it.key) ?? { enter: 'none' as Enter, delay: 0 }
                        return <MessageItem key={it.key} item={it} enter={e.enter} delay={e.delay} />
                      })}
                    </AnimatePresence>
                  </section>
                ))}
                <AnimatePresence>{typing && <TypingBubble key="typing" person={view.counterpart} />}</AnimatePresence>
              </div>
            )}
          </div>

          {/* jump to latest */}
          <AnimatePresence>
            {(showJump || newCount > 0) && (
              <motion.button
                key="jump"
                type="button"
                initial={{ opacity: 0, y: 16, scale: 0.8, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 12, scale: 0.85, filter: 'blur(4px)' }}
                transition={spring.bouncy}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  scrollToBottom(true)
                  setNewCount(0)
                }}
                className={cn(
                  'absolute bottom-3 left-1/2 z-[6] flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium shadow-[0_12px_30px_-10px_rgba(0,0,0,.45)]',
                  newCount > 0 ? 'bg-accent text-accent-ink' : 'glass glass-strong text-ink',
                )}
              >
                <span className="relative z-[1] flex items-center gap-1.5">
                  {newCount > 0 ? t('messages.thread.newMessages', { count: newCount }) : t('messages.thread.latest')}
                  <motion.span animate={{ y: [0, 3, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                    <ArrowDown className="size-3.5" />
                  </motion.span>
                </span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* drop overlay */}
          <AnimatePresence>
            {dragging && (
              <motion.div
                key="drop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-2 z-[8] flex flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-[var(--accent)] bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] backdrop-blur-md"
              >
                <motion.span
                  initial={{ scale: 0.6, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0, y: [0, -6, 0] }}
                  transition={{ y: { duration: 1.4, repeat: Infinity }, default: spring.bouncy }}
                  className="flex size-16 items-center justify-center rounded-[22px] bg-accent text-accent-ink shadow-[0_16px_40px_-12px_var(--accent)]"
                >
                  <ImagePlus className="size-7" />
                </motion.span>
                <p className="text-[15px] font-medium">{t('messages.thread.dropTitle', { name: firstName })}</p>
                <p className="text-[12.5px] text-ink-3">{t('messages.thread.dropHint')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Composer
          key={convId}
          ref={composer}
          conv={c}
          role={role}
          meId={meId}
          counterpart={view.counterpart}
          counterpartId={view.counterpartId}
          jobs={linkedJobs}
          last={messages[messages.length - 1]}
          replyTo={replyTo}
          editing={editing}
          onCancelReply={() => setReplyTo(null)}
          onCancelEdit={() => setEditing(null)}
          onEditLast={editLast}
          onSent={() => requestAnimationFrame(() => scrollToBottom(true))}
        />
      </Glass>

      {/* info pane (xl) */}
      <AnimatePresence initial={false}>
        {isXl && infoOpen && (
          <motion.aside
            key="info"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 332, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_IOS }}
            className="-ml-3 shrink-0 overflow-hidden lg:-ml-4"
          >
            <motion.div
              initial={{ x: 40, filter: 'blur(8px)' }}
              animate={{ x: 0, filter: 'blur(0px)' }}
              exit={{ x: 40, filter: 'blur(8px)' }}
              transition={{ duration: 0.45, ease: EASE_IOS }}
              className="h-full w-[332px] pl-3 lg:pl-4"
            >
              <Glass className="flex h-full flex-col overflow-hidden">{infoPanel(() => setInfoOpen(false))}</Glass>
            </motion.div>
          </motion.aside>
        )}
      </AnimatePresence>

      <Drawer open={!isXl && drawerOpen} onClose={() => setDrawerOpen(false)} width={380}>
        {infoPanel(() => setDrawerOpen(false))}
      </Drawer>

      <Lightbox
        items={lightbox?.items ?? []}
        index={lightbox ? lightbox.index : null}
        onClose={() => setLightbox(null)}
        originFor={lightbox?.origin}
        title={view.counterpart?.name}
      />
      <ActionSheet message={sheet} onClose={() => setSheet(null)} />
      <CallOverlay open={calling} person={view.counterpart} onEnd={endCall} />
    </ThreadCtx.Provider>
  )
}

function EmptyThread({
  person,
  firstName,
  since,
  suggestions,
  onPick,
}: {
  person: ConversationView['counterpart']
  firstName: string
  since: string
  suggestions: string[]
  onPick: (text: string) => void
}) {
  const t = useT()
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 text-center">
      <motion.div initial={{ scale: 0.5, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={spring.wobbly} className="relative">
        <span className="msg-anim absolute inset-0 rounded-full bg-accent/40 [animation:msg-ring_2.4s_var(--ease-out)_infinite]" />
        <PersonAvatar person={person} size={84} />
        <motion.span
          className="absolute -right-2 -top-1 text-[28px]"
          animate={{ rotate: [0, 18, -8, 18, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.4 }}
        >
          👋
        </motion.span>
      </motion.div>
      <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }} className="mt-5 text-[20px] font-medium tracking-[-0.02em]">
        {t('messages.thread.emptyTitle', { name: firstName })}
      </motion.h3>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.22 } }} className="mt-1.5 max-w-sm text-[13.5px] text-ink-3">
        {t('messages.thread.emptyBody', { date: since })}
      </motion.p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {suggestions.map((s, i) => (
          <motion.button
            key={s}
            type="button"
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 0.3 + i * 0.07, ...spring.snappy } }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPick(s)}
            className="glass glass-pill flex h-9 items-center gap-1.5 px-3.5 text-[13px] font-medium"
          >
            <span className="relative z-[1] flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-accent-text" />
              {s}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

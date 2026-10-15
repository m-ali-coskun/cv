import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { Compass, Inbox, MessagesSquare, SearchX, SquarePen } from 'lucide-react'
import { EASE_IOS } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useConversations, useDiscipline, useRole } from '@/store/selectors'
import { Glass } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Overlay'
import { Kbd } from '@/components/ui/Badge'
import { ConversationList } from './ConversationList'
import { NewMessageModal } from './NewMessageModal'
import { Thread } from './Thread'
import { conversationMatchesDiscipline } from './model'
import { useFillHeight, useMediaQuery, useVisualViewport } from './hooks'
import { ChatKeyframes } from './ui'

/**
 * Messages — /messages and /messages/:id
 *  desktop  : conversation list | thread | info panel (xl+, toggleable)
 *  tablet   : list | thread (info opens as a drawer)
 *  phone    : list → thread push transition, edge-swipe / back button to return
 */
export default function MessagesPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const t = useT()
  const role = useRole()
  const discipline = useDiscipline()
  const jobs = useApp((s) => s.jobs)
  const isMd = useMediaQuery('(min-width: 768px)')
  const isLg = useMediaQuery('(min-width: 1024px)')
  const all = useConversations({ includeArchived: true })
  const [newOpen, setNewOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [fillRef, height] = useFillHeight(isLg ? 40 : 90)
  const view = id ? all.find((v) => v.conversation.id === id) : undefined
  const jobById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs])
  const ordered = useMemo(
    () => all.filter((v) => !v.conversation.archived && (v.conversation.id === id || conversationMatchesDiscipline(v, discipline, jobById))),
    [all, discipline, jobById, id],
  )

  // Desktop/tablet: never show an empty thread pane — open the first conversation.
  useEffect(() => {
    if (id || !isMd) return
    const first = ordered[0] ?? all.find((v) => !v.conversation.archived)
    if (first) navigate(`/messages/${first.conversation.id}`, { replace: true })
  }, [id, isMd, ordered, all, navigate])

  // Switching role makes the open thread meaningless → back to the inbox.
  const prevRole = useRef(role)
  useEffect(() => {
    if (prevRole.current === role) return
    prevRole.current = role
    if (id && !view) navigate('/messages', { replace: true })
  }, [role, id, view, navigate])

  // Keyboard: Alt+↑/↓ switch conversations, "/" search, "n" new message, "?" help
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const typing = !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
      if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        if (!ordered.length) return
        e.preventDefault()
        const i = ordered.findIndex((v) => v.conversation.id === id)
        const next = ordered[(i + (e.key === 'ArrowDown' ? 1 : -1) + ordered.length) % ordered.length]
        if (next) navigate(`/messages/${next.conversation.id}`)
        return
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') {
        e.preventDefault()
        ;(document.querySelector('[data-msg-search]') as HTMLInputElement | null)?.focus()
      } else if (e.key === 'n') {
        e.preventDefault()
        setNewOpen(true)
      } else if (e.key === 'r' && id) {
        e.preventDefault()
        ;(document.querySelector('[data-msg-composer]') as HTMLTextAreaElement | null)?.focus()
      } else if (e.key === '?') {
        setHelpOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ordered, id, navigate])

  const select = (cid: string) => navigate(`/messages/${cid}`)
  const list = (
    <ConversationList activeId={id} onSelect={select} onNew={() => setNewOpen(true)} onShortcuts={() => setHelpOpen(true)} className="h-full" />
  )

  const notFound = (
    <EmptyState
      icon={<SearchX />}
      title={t('messages.notFound.title')}
      description={t('messages.notFound.body')}
      action={
        <Button icon={<Inbox className="size-4" />} onClick={() => navigate('/messages', { replace: true })}>
          {t('messages.notFound.back')}
        </Button>
      }
    />
  )
  const emptyInbox = (
    <EmptyState
      icon={<MessagesSquare />}
      title={t('messages.emptyInbox.title')}
      description={t(role === 'client' ? 'messages.emptyInbox.bodyClient' : 'messages.emptyInbox.bodyDesigner')}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button icon={<SquarePen className="size-4" />} onClick={() => setNewOpen(true)}>
            {t('messages.list.new')}
          </Button>
          <Button variant="glass" icon={<Compass className="size-4" />} onClick={() => navigate('/discover')}>
            {t('messages.new.discover')}
          </Button>
        </div>
      }
    />
  )

  return (
    <>
      <ChatKeyframes />
      {isMd ? (
        <div ref={fillRef} style={{ height }} className="flex min-w-0 gap-3 max-lg:-mb-9 lg:gap-4">
          <Glass className="flex w-[288px] shrink-0 flex-col overflow-hidden lg:w-[304px] 2xl:w-[352px]">{list}</Glass>
          {view ? (
            <Thread key={view.conversation.id} view={view} />
          ) : (
            <Glass className="flex min-w-0 flex-1 items-center justify-center overflow-hidden">{id ? notFound : all.length === 0 ? emptyInbox : null}</Glass>
          )}
        </div>
      ) : (
        <>
          {/* phone: the inbox stays in the page; an open thread is a full-height layer above the shell chrome */}
          <div ref={fillRef} style={{ height }} className="relative -mb-9 overflow-hidden rounded-[28px]">
            <motion.div
              className="absolute inset-0 flex"
              initial={false}
              animate={id ? { x: '-18%', scale: 0.96, opacity: 0.5 } : { x: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE_IOS }}
            >
              <Glass className="flex min-w-0 flex-1 flex-col overflow-hidden">{list}</Glass>
            </motion.div>
          </div>
          <PhoneThreadLayer open={!!id} onBack={() => navigate('/messages')}>
            {view ? <Thread key={view.conversation.id} view={view} onBack={() => navigate('/messages')} /> : <Glass className="flex flex-1 items-center justify-center">{notFound}</Glass>}
          </PhoneThreadLayer>
        </>
      )}

      <NewMessageModal open={newOpen} onClose={() => setNewOpen(false)} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}

/**
 * Phone thread layer: slides in over the inbox like an iOS push, covers the
 * shell header (more room for the conversation), keeps the floating tab bar
 * visible below the composer and follows the on-screen keyboard.
 */
function PhoneThreadLayer({ open, onBack, children }: { open: boolean; onBack: () => void; children: ReactNode }) {
  const vv = useVisualViewport()
  const dragControls = useDragControls()

  // lock the page behind the layer
  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prev
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="phone-thread" className="fixed inset-x-0 z-[35] flex flex-col" style={{ top: vv.top, height: vv.height }}>
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-[color-mix(in_oklab,var(--bg)_62%,transparent)] backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            transition={{ duration: 0.35 }}
          />
          <motion.div
            className="relative flex min-h-0 flex-1 px-2.5 pt-2.5"
            style={{ paddingBottom: vv.keyboard ? 8 : 'calc(86px + env(safe-area-inset-bottom))' }}
            initial={{ x: '104%' }}
            animate={{ x: 0 }}
            exit={{ x: '104%' }}
            transition={{ duration: 0.5, ease: EASE_IOS }}
            drag="x"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.85 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 90 || info.velocity.x > 500) onBack()
            }}
          >
            {/* iOS-style edge swipe to go back */}
            <div aria-hidden className="absolute inset-y-0 left-0 z-[30] w-4 touch-none" onPointerDown={(e) => dragControls.start(e)} />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const rows: [string[], string][] = [
    [['Alt', '↑'], t('messages.keys.prev')],
    [['Alt', '↓'], t('messages.keys.next')],
    [['/'], t('messages.keys.search')],
    [['N'], t('messages.keys.new')],
    [['R'], t('messages.keys.reply')],
    [['↵'], t('messages.keys.send')],
    [['⇧', '↵'], t('messages.keys.newline')],
    [['↑'], t('messages.keys.editLast')],
    [['Esc'], t('messages.keys.cancel')],
  ]
  return (
    <Modal open={open} onClose={onClose} title={t('messages.keys.title')} size="sm">
      <ul className="divide-y divide-[var(--line)]">
        {rows.map(([keys, label], i) => (
          <motion.li
            key={label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
            className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]"
          >
            <span className="text-ink-2">{label}</span>
            <span className="flex gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </motion.li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-ink-3">{t('messages.keys.touch')}</p>
    </Modal>
  )
}

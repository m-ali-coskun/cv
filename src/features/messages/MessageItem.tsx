import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion, type TargetAndTransition } from 'motion/react'
import { Bookmark, BookmarkCheck, Check, CheckCheck, Copy, CornerUpLeft, MoreHorizontal, Pencil, Reply, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring, FILTER_TWEEN } from '@/lib/motion'
import { useLang, useT } from '@/i18n'
import { Menu } from '@/components/ui/Menu'
import { useThreadCtx } from './context'
import { ApprovalCard, BriefCard, DeliveryCard, MediaGrid, RevisionCard, StatusLine, SystemLine } from './cards'
import { VoicePlayer } from './VoicePlayer'
import { CARD_KINDS, REACTIONS, clock, previewOf, type ThreadItem } from './model'
import { PersonAvatar, POPOVER_SURFACE, RichText } from './ui'
import { useLongPress } from './hooks'

export type Enter = 'none' | 'initial' | 'live'
type MsgItem = Extract<ThreadItem, { type: 'msg' }>

const OTHER_BG = 'bg-[color-mix(in_oklab,var(--surface)_90%,transparent)]'

/** Bubble tail (iMessage-style foot) that hugs the bottom corner. */
function Tail({ own }: { own: boolean }) {
  return (
    <svg
      aria-hidden
      width="16"
      height="20"
      viewBox="0 0 16 20"
      className={cn('pointer-events-none absolute bottom-0', own ? '-right-[10px] text-ink dark:text-accent' : '-left-[10px] -scale-x-100 text-[color-mix(in_oklab,var(--surface)_90%,transparent)]')}
    >
      <path d="M6 5 C6 13 9 18 15.5 20 L2 20 A4 4 0 0 0 6 16 Z" fill="currentColor" />
    </svg>
  )
}

export function Bubble({ own, first, last, children, className }: { own: boolean; first: boolean; last: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative min-w-[44px] px-3.5 py-2 text-[14.5px] leading-[1.45]',
        own
          ? 'bg-ink text-[var(--surface)] shadow-[0_10px_24px_-14px_rgba(0,0,0,.7)] dark:bg-accent dark:text-accent-ink dark:shadow-[0_10px_24px_-14px_var(--accent)]'
          : cn(OTHER_BG, 'text-ink shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_1px_2px_rgba(0,0,0,.05),0_10px_24px_-16px_rgba(0,0,0,.3)] backdrop-blur-xl backdrop-saturate-150 dark:shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_10px_24px_-16px_rgba(0,0,0,.8)]'),
        'rounded-[22px]',
        own ? [!first && 'rounded-tr-[8px]', last ? 'rounded-br-[4px]' : 'rounded-br-[8px]'] : [!first && 'rounded-tl-[8px]', last ? 'rounded-bl-[4px]' : 'rounded-bl-[8px]'],
        className,
      )}
    >
      {children}
      {last && <Tail own={own} />}
    </div>
  )
}

function enterFor(enter: Enter, own: boolean, center: boolean, delay: number): { initial: TargetAndTransition | false; animate: TargetAndTransition } {
  const rest = { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' }
  if (enter === 'none') return { initial: false, animate: rest }
  if (enter === 'initial')
    return {
      initial: { opacity: 0, y: 18, scale: 0.97, filter: 'blur(6px)' },
      animate: { ...rest, transition: { duration: 0.55, ease: EASE_OUT, delay } },
    }
  if (center) return { initial: { opacity: 0, scale: 0.85, filter: 'blur(6px)' }, animate: { ...rest, transition: spring.bouncy } }
  return own
    ? { initial: { opacity: 0, y: 34, x: 8, scale: 0.86, filter: 'blur(8px)' }, animate: { ...rest, transition: { type: 'spring', stiffness: 420, damping: 24, mass: 0.9 } } }
    : { initial: { opacity: 0, y: 16, x: -22, scale: 0.86, filter: 'blur(8px)' }, animate: { ...rest, transition: { type: 'spring', stiffness: 380, damping: 22, mass: 0.9 } } }
}

export function MessageItem({ item, enter, delay }: { item: MsgItem; enter: Enter; delay: number }) {
  const ctx = useThreadCtx()
  const t = useT()
  const lang = useLang()
  const { msg, own, first, last, center } = item
  const [hover, setHover] = useState(false)
  const [burst, setBurst] = useState(0)
  const job = msg.jobId ? ctx.jobById.get(msg.jobId) : undefined
  const sender = own ? undefined : msg.senderId === ctx.counterpartId ? ctx.counterpart : undefined
  const motionProps = enterFor(enter, own, center, delay)
  const isHit = ctx.currentHitId === msg.id
  const flash = ctx.flashId === msg.id
  const longPress = useLongPress(() => ctx.openSheet(msg))

  const exit = { opacity: 0, scale: 0.85, filter: 'blur(6px)', transition: { duration: 0.22 } }

  if (center) {
    return (
      <motion.div
        id={`msg-${msg.id}`}
        layout="position"
        initial={motionProps.initial}
        animate={motionProps.animate}
        exit={exit}
        className={cn('rounded-[24px] transition-shadow', (isHit || flash) && 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-transparent')}
      >
        {msg.kind === 'system' || msg.senderId === 'system' ? <SystemLine message={msg} job={job} /> : <StatusLine message={msg} job={job} sender={sender} />}
      </motion.div>
    )
  }

  const isCard = CARD_KINDS.has(msg.kind)
  const isVoice = msg.kind === 'voice'
  const hasMedia = !!msg.attachments?.length && !isVoice && !isCard
  const caption = hasMedia && msg.text && msg.text !== 'shared files' ? msg.text : hasMedia ? '' : msg.text
  const reply = msg.replyToId ? ctx.messagesById.get(msg.replyToId) : undefined
  const read = own && ctx.readAt >= msg.createdAt
  const saved = ctx.saved.has(msg.id)
  const showName = first && !own && !!sender
  const canEdit = own && (msg.kind === 'text' || msg.kind === 'attachment')

  const react = (e: string) => {
    ctx.react(msg, e)
    if (e === '❤️') setBurst((b) => b + 1)
  }

  const replyQuote = reply ? (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        ctx.jumpTo(reply.id)
      }}
      className={cn(
        'mb-1.5 flex w-full max-w-[280px] items-stretch gap-2 rounded-[14px] px-2 py-1.5 text-left text-[12px] transition-opacity hover:opacity-80',
        own ? 'bg-white/12 dark:bg-black/10' : 'bg-[var(--surface-2)]',
      )}
    >
      <span className={cn('w-[3px] shrink-0 rounded-full', own ? 'bg-accent dark:bg-accent-ink' : 'bg-accent')} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{reply.senderId === ctx.meId ? t('messages.list.you') : (ctx.counterpart?.name ?? '')}</span>
        <span className="block truncate opacity-75">{previewOf(reply, t)}</span>
      </span>
    </button>
  ) : msg.replyToId ? (
    <span className="mb-1.5 block text-[12px] italic opacity-60">{t('messages.reply.deleted')}</span>
  ) : null

  let body: ReactNode
  if (isCard) {
    body = (
      <div className="relative">
        {reply && <div className="mb-1">{replyQuote}</div>}
        {msg.kind === 'brief' && <BriefCard message={msg} job={job} />}
        {msg.kind === 'delivery' && <DeliveryCard message={msg} job={job} />}
        {msg.kind === 'revision' && <RevisionCard message={msg} job={job} />}
        {msg.kind === 'approval' && <ApprovalCard message={msg} job={job} />}
      </div>
    )
  } else {
    body = (
      <div className={cn('flex flex-col gap-1', own ? 'items-end' : 'items-start')}>
        {hasMedia && (
          <div className="relative">
            <MediaGrid items={msg.attachments!} />
          </div>
        )}
        {(caption || isVoice || (reply && !caption)) && (
          <Bubble own={own} first={first || hasMedia} last={last}>
            {replyQuote}
            {isVoice ? (
              <VoicePlayer message={msg} own={own} />
            ) : (
              <RichText
                text={caption}
                query={ctx.query}
                onJob={(id) => ctx.openJob(id)}
                linkClass={own ? 'decoration-white/50 dark:decoration-black/40' : 'text-accent-text'}
              />
            )}
          </Bubble>
        )}
      </div>
    )
  }

  return (
    <motion.div
      id={`msg-${msg.id}`}
      layout="position"
      initial={motionProps.initial}
      animate={motionProps.animate}
      exit={exit}
      style={{ transformOrigin: own ? 'bottom right' : 'bottom left' }}
      className={cn('group/msg relative flex items-end gap-2', own ? 'flex-row-reverse pl-8 pr-1.5 sm:pl-14' : 'pr-8 sm:pr-14', first ? 'mt-3' : 'mt-[3px]')}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {!own && <div className="w-8 shrink-0">{last && <PersonAvatar person={sender ?? ctx.counterpart} size={32} />}</div>}
      <div className={cn('flex min-w-0 max-w-full flex-col', own ? 'items-end' : 'items-start')}>
        {showName && <span className="mb-1 ml-3 text-[11.5px] font-medium text-ink-3">{sender?.name}</span>}
        <div
          className={cn(
            'relative max-w-full touch-manipulation rounded-[24px] transition-shadow duration-300',
            isHit && 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)]',
            flash && 'msg-anim [animation:msg-flash_.9s_var(--ease-out)_2]',
          )}
          onDoubleClick={() => react('❤️')}
          onContextMenu={(e) => {
            e.preventDefault()
            ctx.openSheet(msg)
          }}
          {...longPress.handlers}
        >
          <motion.div animate={flash ? { scale: [1, 1.03, 1] } : { scale: 1 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
            {body}
          </motion.div>

          {/* heart burst on double-click */}
          <AnimatePresence>
            {burst > 0 && (
              <motion.span
                key={burst}
                className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-[44px] drop-shadow-lg"
                initial={{ scale: 0.2, opacity: 0, rotate: -20 }}
                animate={{ scale: [0.2, 1.35, 1], opacity: [0, 1, 0], rotate: [-20, 8, 0], y: [0, -10, -36] }}
                transition={{ duration: 0.9, ease: EASE_OUT }}
                onAnimationComplete={() => setBurst(0)}
              >
                ❤️
              </motion.span>
            )}
          </AnimatePresence>

          {/* hover toolbar (pointer devices) */}
          <AnimatePresence>
            {hover && !ctx.coarse && (
              <motion.div
                key="tb"
                initial={{ opacity: 0, scale: 0.8, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, y: 4, filter: 'blur(2px)', transition: { duration: 0.12 } }}
                transition={spring.snappy}
                style={{ transformOrigin: own ? 'bottom right' : 'bottom left' }}
                className={cn('glass glass-pill absolute -top-11 z-20 flex items-center gap-0.5 p-1', POPOVER_SURFACE, own ? 'right-0' : 'left-0')}
              >
                {REACTIONS.map((e, i) => {
                  const mine = msg.reactions.find((r) => r.emoji === e)?.by.includes(ctx.meId)
                  return (
                    <motion.button
                      key={e}
                      type="button"
                      aria-label={t('messages.action.react', { emoji: e })}
                      initial={{ scale: 0, y: 8 }}
                      animate={{ scale: 1, y: 0, transition: { ...spring.bouncy, delay: i * 0.025 } }}
                      whileHover={{ scale: 1.35, y: -4 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => react(e)}
                      className={cn('relative z-[1] flex size-7.5 items-center justify-center rounded-full text-[17px] leading-none', mine && 'bg-accent-soft')}
                    >
                      {e}
                    </motion.button>
                  )
                })}
                <span className="relative z-[1] mx-0.5 h-5 w-px bg-[var(--line-2)]" />
                <ToolButton label={t('messages.action.reply')} onClick={() => ctx.reply(msg)}>
                  <Reply />
                </ToolButton>
                <Menu
                  width={200}
                  className={POPOVER_SURFACE}
                  align={own ? 'end' : 'start'}
                  trigger={({ onClick }) => (
                    <ToolButton label={t('messages.action.more')} onClick={onClick}>
                      <MoreHorizontal />
                    </ToolButton>
                  )}
                  items={[
                    { label: t('messages.action.reply'), icon: <CornerUpLeft />, onClick: () => ctx.reply(msg) },
                    { label: t('messages.action.copy'), icon: <Copy />, onClick: () => ctx.copy(msg), disabled: !msg.text || isVoice },
                    { label: saved ? t('messages.action.unsave') : t('messages.action.save'), icon: saved ? <BookmarkCheck /> : <Bookmark />, onClick: () => ctx.toggleSave(msg) },
                    ...(canEdit ? [{ label: t('messages.action.edit'), icon: <Pencil />, onClick: () => ctx.edit(msg) }] : []),
                    ...(own ? [{ divider: true, label: '' }, { label: t('messages.action.delete'), icon: <Trash2 />, danger: true, onClick: () => ctx.remove(msg) }] : []),
                  ]}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* reactions */}
        <AnimatePresence initial={false}>
          {msg.reactions.length > 0 && (
            <motion.div
              key="rx"
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              className={cn('relative z-[2] -mt-1.5 flex flex-wrap gap-1', own ? 'justify-end pr-3' : 'pl-3')}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {msg.reactions.map((r) => {
                  const mine = r.by.includes(ctx.meId)
                  const who = r.by.map((id) => (id === ctx.meId ? t('messages.list.you') : id === ctx.counterpartId ? (ctx.counterpart?.name ?? '') : '')).filter(Boolean)
                  return (
                    <motion.button
                      layout
                      key={r.emoji}
                      type="button"
                      title={who.join(', ')}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      whileTap={{ scale: 0.85 }}
                      whileHover={{ y: -2 }}
                      transition={spring.bouncy}
                      onClick={() => react(r.emoji)}
                      className={cn(
                        'inline-flex h-6.5 items-center gap-1 rounded-full px-2 text-[13px] shadow-[0_2px_8px_-2px_rgba(0,0,0,.18)] ring-2 ring-[var(--surface)]',
                        mine ? 'bg-accent text-accent-ink' : 'bg-[var(--surface)] text-ink',
                      )}
                    >
                      <motion.span key={`${r.emoji}-${r.by.length}`} initial={{ scale: 0.4, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={spring.wobbly}>
                        {r.emoji}
                      </motion.span>
                      {r.by.length > 1 && <span className="font-mono text-[10.5px] font-semibold">{r.by.length}</span>}
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* meta */}
        {(last || saved) && (
          <div className={cn('mt-1 flex items-center gap-1 px-1.5 font-mono text-[10.5px] text-ink-3', own && 'justify-end')}>
            {saved && <BookmarkCheck className="size-3 text-accent-text" aria-label={t('messages.action.saved')} />}
            {own && ctx.lastOwnId === msg.id && <span className={read ? 'text-accent-text' : ''}>{read ? t('messages.receipt.read') : t('messages.receipt.delivered')} ·</span>}
            <span>{clock(msg.createdAt, lang)}</span>
            {msg.edited && <span>· {t('messages.meta.edited')}</span>}
            {own && (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={read ? 'read' : 'sent'}
                  initial={{ scale: 0.3, opacity: 0, filter: 'blur(3px)' }}
                  animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                  exit={{ scale: 0.3, opacity: 0 }}
                  transition={spring.bouncy}
                  className={cn('inline-flex', read ? 'text-accent-text' : '')}
                  title={read ? t('messages.receipt.read') : t('messages.receipt.delivered')}
                >
                  {read ? <CheckCheck className="size-3.5" /> : <Check className="size-3.5" />}
                </motion.span>
              </AnimatePresence>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.88 }}
      className="relative z-[1] flex size-7.5 items-center justify-center rounded-full text-ink-2 hover:bg-[var(--surface-2)] hover:text-ink [&_svg]:size-4"
    >
      {children}
    </motion.button>
  )
}

/** Typing indicator bubble at the bottom of the thread. */
export function TypingBubble({ person }: { person: Parameters<typeof PersonAvatar>[0]['person'] }) {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 14, x: -10, scale: 0.7, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.6, filter: 'blur(6px)', transition: { duration: 0.16 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 24, filter: FILTER_TWEEN }}
      style={{ transformOrigin: 'bottom left' }}
      className="mt-3 flex items-end gap-2"
      aria-live="polite"
    >
      <PersonAvatar person={person} size={32} />
      <Bubble own={false} first last className="px-4 py-3">
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-2 rounded-full bg-ink-3"
              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.16, ease: 'easeInOut' }}
            />
          ))}
        </span>
      </Bubble>
    </motion.div>
  )
}


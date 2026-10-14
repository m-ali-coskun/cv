import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useIsPresent } from 'motion/react'
import { ArrowRight, FileText, Heart, MessageCircle, Send, Sparkles, Star } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { fireConfetti, fireHearts, fireSideCannons } from '@/lib/confetti'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useUI } from '@/store/ui'
import { matchScore } from '@/store/selectors'
import { ME_CLIENT_ID, ME_DESIGNER_ID, type Match, type Role } from '@/store/types'
import { Avatar } from '@/components/ui/Avatar'
import { PersonAvatar } from './ProfileBits'
import { personOf, reasonsFor, type Person } from './model'

/** Global "It's a match!" overlay — rendered once by the app shell. */
export function MatchCelebration() {
  const incoming = useUI((s) => s.celebration)
  const [shown, setShown] = useState<Match | null>(null)
  const [queue, setQueue] = useState<Match[]>([])
  const queueRef = useRef<Match[]>([])
  queueRef.current = queue

  // Matches that land while one is on screen are queued instead of replacing it.
  useEffect(() => {
    if (!incoming) return
    if (!shown) setShown(incoming)
    else if (incoming.id !== shown.id) setQueue((q) => (q.some((x) => x.id === incoming.id) ? q : [...q, incoming]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming])

  const close = () => {
    const [next, ...rest] = queueRef.current
    setShown(null)
    setQueue(rest)
    useUI.getState().set({ celebration: null })
    if (next) window.setTimeout(() => useUI.getState().set({ celebration: next }), 550)
  }
  return <AnimatePresence>{shown && <Overlay key={shown.id} match={shown} pending={queue.length} onClose={close} />}</AnimatePresence>
}

const QUICK = ['👋 Hi {name}! Really happy we matched.', 'Love your work — are you free for a project this month?', 'Could I send you a short brief?']

function Overlay({ match, pending, onClose }: { match: Match; pending: number; onClose: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const discipline = useApp((s) => s.settings.discipline)
  const meIsClient = match.clientId === ME_CLIENT_ID
  const matchRole: Role = meIsClient ? 'client' : 'designer'
  const other: Person | undefined = useMemo(() => {
    const p = meIsClient ? designers.find((d) => d.id === match.designerId) : clients.find((c) => c.id === match.clientId)
    return p ? personOf(p) : undefined
  }, [meIsClient, designers, clients, match])
  const meDesigner = designers.find((d) => d.id === ME_DESIGNER_ID)
  const [draft, setDraft] = useState('')
  const primaryRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  // while the exit animation runs the overlay must not take clicks or keys
  const present = useIsPresent()
  useEffect(() => {
    if (!present && rootRef.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur()
  }, [present])

  const score = other ? matchScore(other.data, matchRole, discipline) : 0
  const reasons = useMemo(() => (other ? reasonsFor(other, discipline).filter((r) => r.tone !== 'warn').slice(0, 3) : []), [other, discipline])
  const first = other?.data.name.split(' ')[0] ?? ''

  // effects, keyboard, scroll lock
  useEffect(() => {
    if (!other) {
      onClose()
      return
    }
    fireHearts({ origin: { x: 0.5, y: 0.42 } })
    const a = window.setTimeout(() => fireConfetti({ origin: { x: 0.5, y: 0.45 }, particleCount: 140 }), 380)
    const b = window.setTimeout(() => fireSideCannons(900), 650)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    // Focus the "say hi" field on desktop (typing right away feels natural and a stray
    // Enter can't navigate away); on touch devices keep the keyboard closed.
    const fine = window.matchMedia('(pointer: fine)').matches
    const f = window.setTimeout(() => {
      // never steal focus from someone who is typing elsewhere (a note, a chat…)
      const active = document.activeElement as HTMLElement | null
      if (active && !rootRef.current?.contains(active) && active.closest('input, textarea, [contenteditable="true"]')) return
      ;(fine ? inputRef.current : primaryRef.current)?.focus({ preventScroll: true })
    }, 900)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
      window.clearTimeout(f)
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!other) return null

  const ensureRole = () => {
    const app = useApp.getState()
    if (app.settings.role !== matchRole) app.setRole(matchRole)
  }
  const openChat = (text?: string) => {
    ensureRole()
    const app = useApp.getState()
    const id = app.ensureConversation(match.clientId, match.designerId)
    const body = text?.trim()
    if (body) app.sendMessage(id, { text: body })
    onClose()
    navigate(`/messages/${id}`)
  }
  const sendBrief = () => {
    ensureRole()
    onClose()
    navigate(`/brief/new?designer=${match.designerId}`)
  }
  const title = t('discover.celebration.title')

  return (
    <motion.div
      ref={rootRef}
      className={cn('fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto overscroll-contain p-4 py-10', !present && 'pointer-events-none')}
      role="dialog"
      aria-modal
      aria-label={title}
      inert={!present}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.05 } }}
    >
      {/* backdrop */}
      <motion.div
        className="fixed inset-0 bg-[#060608]/70 backdrop-blur-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.25 } }}
        transition={{ duration: 0.4 }}
        onClick={onClose}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute left-1/2 top-[38%] size-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_45%,transparent),transparent)] blur-3xl"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.1, 1], opacity: [0, 0.9, 0.6] }}
          transition={{ duration: 1.4, ease: EASE_OUT }}
        />
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-[38%] size-64 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--accent)]"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 3.2], opacity: [0.6, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.4 + i, ease: 'easeOut' }}
          />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <motion.span
            key={`h${i}`}
            className="absolute bottom-[-40px] text-[#ff3b6b]"
            style={{ left: `${(i * 37) % 100}%` }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: '-115vh', opacity: [0, 0.9, 0.9, 0], rotate: (i % 2 ? 1 : -1) * 40 }}
            transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: (i * 0.45) % 4, ease: 'linear' }}
          >
            <Heart className={cn('fill-current', i % 3 === 0 ? 'size-7' : i % 3 === 1 ? 'size-4' : 'size-5')} style={{ opacity: 0.35 + (i % 4) * 0.15 }} />
          </motion.span>
        ))}
      </div>

      {/* content */}
      <motion.div
        className="relative w-full max-w-[540px] text-center text-white"
        initial={{ y: 30, filter: 'blur(10px)' }}
        animate={{ y: 0, filter: 'blur(0px)' }}
        exit={{ y: 20, scale: 0.96, filter: 'blur(8px)', transition: { duration: 0.2 } }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        <motion.span
          initial={{ opacity: 0, y: -10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 20 }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em]',
            match.superLike ? 'bg-[#3e8ef7] text-white' : 'bg-white/10 text-white/85 backdrop-blur-xl',
          )}
        >
          {match.superLike ? <Star className="size-3.5 fill-current" /> : <Sparkles className="size-3.5" />}
          {t(match.superLike ? 'discover.celebration.superKicker' : 'discover.celebration.kicker')}
        </motion.span>

        <h2 className="mt-4 select-none text-[46px] font-semibold leading-[0.95] tracking-[-0.045em] [filter:drop-shadow(0_6px_30px_color-mix(in_oklab,var(--accent)_70%,transparent))] sm:text-[72px]">
          {title.split(' ').map((word, wi, words) => (
            <span key={wi} className="inline-block whitespace-nowrap">
              {word.split('').map((ch, ci) => {
                const idx = words.slice(0, wi).join('').length + ci
                return (
                  <motion.span
                    key={ci}
                    className="inline-block bg-[linear-gradient(180deg,#ffffff_20%,var(--accent)_95%)] bg-clip-text text-transparent"
                    initial={{ y: 60, opacity: 0, rotate: idx % 2 ? 18 : -18, scale: 0.4 }}
                    animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.25 + idx * 0.035 }}
                  >
                    {ch}
                  </motion.span>
                )
              })}
              {wi < words.length - 1 && <span className="inline-block w-[0.28em]" />}
            </span>
          ))}
        </h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-3 text-[15px] text-white/70">
          {t('discover.celebration.subtitle', { name: other.data.name })}
        </motion.p>

        {/* avatars bump */}
        <div className="relative mx-auto mt-6 flex h-32 items-center justify-center max-sm:[&_.avatar-box]:scale-[.82] sm:mt-8 sm:h-44">
          <motion.div
            className="relative z-[1]"
            initial={{ x: -320, rotate: -40, opacity: 0, scale: 0.6 }}
            animate={{ x: [-320, 26, 10], rotate: [-40, 4, -8], opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, times: [0, 0.6, 1], ease: EASE_OUT, delay: 0.35 }}
          >
            <div className="avatar-box rounded-[34px] bg-white/90 p-1 shadow-[0_24px_60px_-20px_rgba(0,0,0,.7)]">
              {meIsClient ? (
                <Avatar seed="ali" size={118} className="rounded-[30%] [&_img]:rounded-[30%]!" />
              ) : (
                <Avatar seed={meDesigner?.avatarSeed ?? 'ali-designer'} media={meDesigner?.avatar} size={118} className="rounded-[30%] [&_img]:rounded-[30%]!" />
              )}
            </div>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#0b0b0c]">{t('core.common.you')}</span>
          </motion.div>
          <motion.div
            className="relative"
            initial={{ x: 320, rotate: 40, opacity: 0, scale: 0.6 }}
            animate={{ x: [320, -26, -10], rotate: [40, -4, 8], opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, times: [0, 0.6, 1], ease: EASE_OUT, delay: 0.35 }}
          >
            <div className="avatar-box rounded-[34px] bg-white/90 p-1 shadow-[0_24px_60px_-20px_rgba(0,0,0,.7)]">
              <PersonAvatar person={other} size={118} square />
            </div>
            <span className="absolute -bottom-2 left-1/2 max-w-[120px] -translate-x-1/2 truncate rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#0b0b0c]">{first}</span>
          </motion.div>
          <motion.span
            className="absolute left-1/2 top-1/2 z-[2] flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ff3b6b] text-white shadow-[0_10px_30px_-6px_#ff3b6b]"
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: [0, 1.35, 1], rotate: 0 }}
            transition={{ delay: 0.85, duration: 0.55, ease: EASE_OUT }}
          >
            <motion.span animate={{ scale: [1, 1.18, 1] }} transition={{ duration: 0.9, repeat: Infinity, delay: 1.4 }}>
              <Heart className="size-6 fill-current" />
            </motion.span>
          </motion.span>
        </div>

        {/* score + reasons */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
          <span className="rounded-full bg-[var(--accent)] px-3 py-1 font-mono text-[12.5px] font-semibold text-[var(--accent-ink)]">{t('core.common.matchScore', { score })}</span>
          {reasons.map((r, i) => (
            <span key={r.key} className={cn('rounded-full bg-white/10 px-3 py-1 text-[12px] text-white/80 backdrop-blur-xl', i > 0 && 'max-sm:hidden')}>
              {t(`discover.${r.key}`, r.vars)}
            </span>
          ))}
        </motion.div>

        {/* quick message */}
        <motion.form
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5, ease: EASE_OUT }}
          onSubmit={(e) => {
            e.preventDefault()
            if (draft.trim()) openChat(draft)
          }}
          className="mx-auto mt-6 max-w-[440px]"
        >
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 p-1.5 pl-4 shadow-[inset_0_1px_0_rgba(255,255,255,.15)] backdrop-blur-xl focus-within:border-white/35">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('discover.celebration.placeholder', { name: first })}
              className="h-9 min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/45"
              aria-label={t('discover.celebration.placeholder', { name: first })}
            />
            <motion.button
              type="submit"
              disabled={!draft.trim()}
              whileTap={{ scale: 0.9 }}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] transition-opacity disabled:opacity-40"
              aria-label={t('core.action.send')}
            >
              <Send className="size-4" />
            </motion.button>
          </div>
          <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
            {QUICK.map((q, i) => {
              const text = q.replace('{name}', first)
              return (
                <motion.button
                  key={i}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 + i * 0.06 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDraft(text)}
                  className={cn(
                    'max-w-full truncate rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[12px] text-white/75 transition-colors hover:bg-white/12 hover:text-white',
                    i === 2 && 'max-sm:hidden',
                  )}
                >
                  {text}
                </motion.button>
              )
            })}
          </div>
        </motion.form>

        {/* actions */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 0.5, ease: EASE_OUT }}
          className="mt-6 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center"
        >
          <motion.button
            ref={primaryRef}
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => openChat(draft)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 text-[14.5px] font-semibold text-[var(--accent-ink)] shadow-[0_14px_40px_-12px_var(--accent)] outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:w-auto"
          >
            <MessageCircle className="size-4" />
            {t('discover.celebration.message')}
          </motion.button>
          {meIsClient && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={sendBrief}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 text-[14.5px] font-medium text-white backdrop-blur-xl hover:bg-white/15 sm:w-auto"
            >
              <FileText className="size-4" />
              {t('discover.celebration.brief')}
            </motion.button>
          )}
        </motion.div>
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          onClick={onClose}
          className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-white/60 transition-colors hover:text-white"
        >
          {t('discover.celebration.keep')}
          <ArrowRight className="size-4" />
        </motion.button>
        {pending > 0 && (
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#ff3b6b]/20 px-3 py-1 text-[12px] font-medium text-[#ff8fab]"
          >
            <Heart className="size-3 fill-current" />
            {t('discover.celebration.more', { count: pending })}
          </motion.p>
        )}
        <p className="mt-3 font-mono text-[11px] text-white/35">{t('discover.celebration.esc')}</p>
      </motion.div>
    </motion.div>
  )
}

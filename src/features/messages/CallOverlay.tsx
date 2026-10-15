import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_IOS, spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { mmss, personLine, type Person } from './model'
import { PersonAvatar } from './ui'

/**
 * Demo call screen (no real audio): rings while "calling", connects after a
 * moment, counts the duration and reports it back when hung up.
 */
export function CallOverlay({ open, person, onEnd }: { open: boolean; person?: Person; onEnd: (connectedSeconds: number | null) => void }) {
  return createPortal(<AnimatePresence>{open && <CallInner key="call" person={person} onEnd={onEnd} />}</AnimatePresence>, document.body)
}

function CallInner({ person, onEnd }: { person?: Person; onEnd: (connectedSeconds: number | null) => void }) {
  const t = useT()
  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [muted, setMuted] = useState(false)
  const [video, setVideo] = useState(false)
  const [speaker, setSpeaker] = useState(true)
  const ended = useRef(false)

  useEffect(() => {
    const c = window.setTimeout(() => setConnectedAt(Date.now()), 2600)
    const tick = window.setInterval(() => setNow(Date.now()), 500)
    return () => {
      window.clearTimeout(c)
      window.clearInterval(tick)
    }
  }, [])

  const end = () => {
    if (ended.current) return
    ended.current = true
    onEnd(connectedAt ? Math.max(1, Math.round((Date.now() - connectedAt) / 1000)) : null)
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && end()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      role="dialog"
      aria-modal
      aria-label={t('messages.call.title')}
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-md" onClick={end} />
      <motion.div
        className="glass-night relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-[36px] px-6 pb-7 pt-10 text-center"
        initial={{ y: 80, scale: 0.9, opacity: 0, filter: 'blur(12px)' }}
        animate={{ y: 0, scale: 1, opacity: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 260, damping: 26 } }}
        exit={{ y: 60, scale: 0.94, opacity: 0, transition: { duration: 0.25, ease: EASE_IOS } }}
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-accent opacity-25 blur-3xl" />
        <span className="relative mb-6 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/70">
          {t('messages.call.demo')}
        </span>
        <div className="relative flex size-36 items-center justify-center">
          {!connectedAt &&
            [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-4 rounded-full border-2 border-[var(--accent)]"
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 1.9, opacity: 0 }}
                transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: [0.23, 1, 0.32, 1] }}
              />
            ))}
          {connectedAt && (
            <motion.span
              className="absolute inset-3 rounded-full bg-[var(--accent)]/20"
              animate={{ scale: muted ? 1 : [1, 1.08, 0.98, 1.05, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          )}
          <motion.div animate={connectedAt ? { scale: 1 } : { scale: [1, 1.04, 1] }} transition={{ duration: 1.2, repeat: connectedAt ? 0 : Infinity }}>
            <PersonAvatar person={person} size={104} className="rounded-full ring-4 ring-white/10" />
          </motion.div>
        </div>
        <h2 className="relative mt-5 text-[24px] font-medium tracking-[-0.03em] text-white">{person?.name}</h2>
        <p className="relative mt-1 line-clamp-1 text-[13px] text-white/55">{personLine(person)}</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={connectedAt ? 'on' : 'ringing'}
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            className={cn('relative mt-3 font-mono text-[14px]', connectedAt ? 'text-accent' : 'text-white/70')}
          >
            {connectedAt ? mmss((now - connectedAt) / 1000) : t('messages.call.calling')}
          </motion.p>
        </AnimatePresence>

        <div className="relative mt-8 grid w-full grid-cols-4 items-start gap-3">
          <CallButton label={muted ? t('messages.call.unmute') : t('messages.call.mute')} active={muted} onClick={() => setMuted((m) => !m)}>
            {muted ? <MicOff /> : <Mic />}
          </CallButton>
          <CallButton label={video ? t('messages.call.videoOff') : t('messages.call.videoOn')} active={video} onClick={() => setVideo((v) => !v)}>
            {video ? <Video /> : <VideoOff />}
          </CallButton>
          <CallButton label={t('messages.call.speaker')} active={!speaker} onClick={() => setSpeaker((s) => !s)}>
            {speaker ? <Volume2 /> : <VolumeX />}
          </CallButton>
          <CallButton label={t('messages.call.end')} danger onClick={end}>
            <PhoneOff />
          </CallButton>
        </div>
      </motion.div>
    </motion.div>
  )
}

function CallButton({ label, onClick, children, active, danger }: { label: string; onClick: () => void; children: ReactNode; active?: boolean; danger?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.button
        type="button"
        aria-label={label}
        onClick={onClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.88 }}
        transition={spring.snappy}
        className={cn(
          'flex size-14 items-center justify-center rounded-full transition-colors [&_svg]:size-5.5',
          danger ? 'bg-danger text-white shadow-[0_10px_30px_-8px_var(--danger)]' : active ? 'bg-white text-black' : 'bg-white/12 text-white hover:bg-white/20',
        )}
      >
        {children}
      </motion.button>
      <span className="max-w-full truncate text-[10.5px] text-white/60">{label}</span>
    </div>
  )
}

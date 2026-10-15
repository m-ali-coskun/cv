import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Pause, Play } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useMediaUrl } from '@/lib/useMediaUrl'
import { useT } from '@/i18n'
import type { Message } from '@/store/types'
import { mmss, waveform } from './model'

const SPEEDS = [1, 1.5, 2] as const

/**
 * Voice message: play/pause, scrubbable waveform that fills as it plays (the
 * bars around the playhead bounce), speed toggle. Recorded notes play the real
 * audio blob; seeded ones simulate playback for their duration.
 */
export function VoicePlayer({ message, own }: { message: Message; own: boolean }) {
  const t = useT()
  const audioRef = useRef<HTMLAudioElement>(null)
  const file = message.attachments?.find((a) => a.kind === 'file' && a.mime.startsWith('audio/'))
  const url = useMediaUrl(file)
  const duration = Math.max(1, message.duration ?? 1)
  const bars = useMemo(() => waveform(message.id, 34), [message.id])
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0) // seconds
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const progress = Math.min(1, pos / duration)

  // simulated playback (no real audio)
  useEffect(() => {
    if (!playing || url) return
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const dt = ((now - last) / 1000) * speed
      last = now
      setPos((p) => Math.min(duration, p + dt))
    }, 80)
    return () => window.clearInterval(id)
  }, [playing, url, speed, duration])

  useEffect(() => {
    if (url || !playing || pos < duration) return
    setPlaying(false)
    setPos(0)
  }, [pos, playing, url, duration])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  const toggle = async () => {
    const a = audioRef.current
    if (url && a) {
      if (playing) {
        a.pause()
        setPlaying(false)
      } else {
        try {
          a.playbackRate = speed
          await a.play()
          setPlaying(true)
        } catch {
          setPlaying(false)
        }
      }
      return
    }
    setPlaying((p) => !p)
  }

  const seek = (frac: number) => {
    const s = Math.max(0, Math.min(duration, frac * duration))
    setPos(s)
    if (audioRef.current && url) audioRef.current.currentTime = s
  }

  const played = own ? 'bg-[var(--surface)] dark:bg-accent-ink' : 'bg-ink'
  const rest = own ? 'bg-[color-mix(in_oklab,var(--surface)_35%,transparent)] dark:bg-[color-mix(in_oklab,var(--accent-ink)_30%,transparent)]' : 'bg-[var(--ink-4)]'
  const head = Math.floor(progress * bars.length)

  return (
    <div className="flex w-[min(calc(100cqw-124px),280px)] items-center gap-2.5 py-0.5 sm:w-[min(calc(100cqw-168px),280px)]">
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
          onEnded={() => {
            setPlaying(false)
            setPos(0)
          }}
        />
      )}
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          void toggle()
        }}
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.06 }}
        aria-label={playing ? t('messages.voice.pause') : t('messages.voice.play')}
        className={cn(
          'relative flex size-10 shrink-0 items-center justify-center rounded-full',
          own ? 'bg-[var(--surface)] text-ink dark:bg-accent-ink dark:text-accent' : 'bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink',
        )}
      >
        {playing && <span className="msg-anim absolute inset-0 rounded-full border-2 border-current opacity-40 [animation:msg-ring_1.4s_var(--ease-out)_infinite]" />}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={playing ? 'pause' : 'play'} initial={{ scale: 0.4, opacity: 0, rotate: -60 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.4, opacity: 0, rotate: 60 }}>
            {playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
      <div className="min-w-0 flex-1">
        <div
          role="slider"
          tabIndex={0}
          aria-label={t('messages.voice.seek')}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(pos)}
          onClick={(e) => {
            e.stopPropagation()
            const r = e.currentTarget.getBoundingClientRect()
            seek((e.clientX - r.left) / r.width)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') seek((pos + 3) / duration)
            if (e.key === 'ArrowLeft') seek((pos - 3) / duration)
          }}
          className="flex h-8 cursor-pointer items-center gap-[2px]"
        >
          {bars.map((h, i) => {
            const isPlayed = i < head
            const near = playing && Math.abs(i - head) <= 2
            return (
              <span key={i} className="flex h-full flex-1 items-center">
                <span
                  className={cn('msg-anim block w-full rounded-full transition-colors duration-150', isPlayed || near ? played : rest)}
                  style={{
                    height: `${h * 100}%`,
                    minHeight: 3,
                    animation: playing ? `msg-vbar ${0.55 + (i % 5) * 0.09}s ease-in-out ${(i % 7) * 0.05}s infinite` : undefined,
                    transformOrigin: 'center',
                  }}
                />
              </span>
            )
          })}
        </div>
        <div className="mt-0.5 flex items-center justify-between font-mono text-[10.5px] opacity-70">
          <span className="tabular-nums">{playing || pos > 0 ? mmss(pos) : mmss(duration)}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])
            }}
            className={cn('rounded-full px-1.5 py-px font-semibold transition-colors', own ? 'bg-white/15 dark:bg-black/10' : 'bg-[var(--surface-3)]')}
            aria-label={t('messages.voice.speed')}
          >
            {speed}×
          </button>
        </div>
      </div>
    </div>
  )
}

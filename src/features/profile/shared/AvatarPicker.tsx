import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, Dices, RefreshCw, Trash2, Upload } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring, FILTER_TWEEN } from '@/lib/motion'
import { saveFile } from '@/lib/files'
import { useT } from '@/i18n'
import { toast } from '@/store/toasts'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import type { MediaRef } from '@/store/types'
import { randomSeed } from './data'

const MAX_AVATAR_MB = 8

/**
 * Avatar editor: generated illustration with a 🎲 shuffle (3D flip), a strip
 * of alternatives, or an uploaded photo (click or drop onto the avatar).
 */
export function AvatarPicker({
  seed,
  media,
  onSeed,
  onMedia,
  size = 112,
  compact,
  className,
}: {
  seed: string
  media?: MediaRef
  onSeed: (seed: string) => void
  onMedia: (m: MediaRef | undefined) => void
  size?: number
  compact?: boolean
  className?: string
}) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [spins, setSpins] = useState(0)
  const [altBase, setAltBase] = useState(() => randomSeed('alt'))
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const alts = Array.from({ length: compact ? 5 : 6 }, (_, i) => `${altBase}-${i}`)
  const hasPhoto = !!media && media.kind !== 'art'

  const shuffle = () => {
    setSpins((n) => n + 1)
    onMedia(undefined)
    onSeed(randomSeed('av'))
  }

  const upload = async (files: File[]) => {
    const f = files.find((x) => x.type.startsWith('image/'))
    if (!f) {
      toast({ title: t('profile.avatar.notImage'), tone: 'error' })
      return
    }
    if (f.size > MAX_AVATAR_MB * 1024 * 1024) {
      toast({ title: t('profile.avatar.tooBig', { mb: MAX_AVATAR_MB }), tone: 'error' })
      return
    }
    setBusy(true)
    try {
      const ref = await saveFile(f)
      setSpins((n) => n + 1)
      onMedia(ref)
      toast({ title: t('profile.avatar.uploaded'), tone: 'success' })
    } finally {
      setBusy(false)
    }
  }

  const avatarKey = hasPhoto && media?.kind === 'file' ? media.fileId : seed

  return (
    <div className={cn('flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6', className)}>
      {/* the avatar */}
      <div
        className="relative shrink-0 [perspective:700px]"
        style={{ width: size, height: size }}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          upload(Array.from(e.dataTransfer.files))
        }}
      >
        <motion.span
          aria-hidden
          className="absolute -inset-2 rounded-full bg-[conic-gradient(from_0deg,var(--accent),transparent_30%,var(--accent)_60%,transparent_85%,var(--accent))] opacity-70 blur-[6px]"
          animate={{ rotate: 360 }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
        />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={avatarKey + spins}
            className="absolute inset-0 rounded-full bg-[var(--surface)] p-1 shadow-[0_18px_40px_-18px_rgba(0,0,0,.5)]"
            initial={{ rotateY: -110, scale: 0.7, opacity: 0, filter: 'blur(8px)' }}
            animate={{ rotateY: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ rotateY: 110, scale: 0.7, opacity: 0, filter: 'blur(8px)', transition: { duration: 0.22, ease: EASE_OUT } }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, filter: FILTER_TWEEN }}
          >
            <Avatar seed={seed} media={hasPhoto ? media : undefined} size={size - 8} />
          </motion.div>
        </AnimatePresence>
        <motion.button
          type="button"
          onClick={() => input.current?.click()}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={spring.snappy}
          aria-label={t('profile.avatar.upload')}
          title={t('profile.avatar.upload')}
          className="absolute -bottom-0.5 -right-0.5 z-[2] flex size-10 items-center justify-center rounded-full border-[3px] border-[var(--surface)] bg-ink text-[var(--surface)] shadow-lg dark:bg-accent dark:text-accent-ink"
        >
          <Camera className="size-4" />
        </motion.button>
        <AnimatePresence>
          {(over || busy) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-[3] flex items-center justify-center rounded-full bg-black/55 text-center text-[11px] font-medium text-white backdrop-blur-sm"
            >
              {busy ? <RefreshCw className="size-5 animate-spin" /> : t('profile.avatar.drop')}
            </motion.div>
          )}
        </AnimatePresence>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (files.length) upload(files)
          }}
        />
      </div>

      {/* controls */}
      <div className="flex min-w-0 flex-col items-center gap-3 sm:items-start">
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button
            variant="accent"
            size="sm"
            onClick={shuffle}
            icon={
              <motion.span key={spins} initial={{ rotate: -200, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }} className="inline-flex">
                <Dices className="size-4" />
              </motion.span>
            }
          >
            {t('profile.avatar.shuffle')}
          </Button>
          <Button variant="glass" size="sm" icon={<Upload className="size-4" />} onClick={() => input.current?.click()}>
            {t('profile.avatar.upload')}
          </Button>
          <AnimatePresence>
            {hasPhoto && (
              <motion.span initial={{ opacity: 0, scale: 0.8, width: 0 }} animate={{ opacity: 1, scale: 1, width: 'auto' }} exit={{ opacity: 0, scale: 0.8, width: 0 }}>
                <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => onMedia(undefined)}>
                  {t('profile.avatar.removePhoto')}
                </Button>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 hidden text-[12px] text-ink-3 sm:inline">{t('profile.avatar.orPick')}</span>
          {alts.map((s, i) => (
            <motion.button
              key={s}
              type="button"
              onClick={() => {
                setSpins((n) => n + 1)
                onMedia(undefined)
                onSeed(s)
              }}
              initial={{ opacity: 0, y: 8, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...spring.bouncy, delay: i * 0.04 }}
              whileHover={{ y: -4, scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              aria-label={t('profile.avatar.pickN', { n: i + 1 })}
              className={cn('rounded-full ring-2 ring-offset-2 ring-offset-[var(--surface)]', seed === s && !hasPhoto ? 'ring-[var(--accent)]' : 'ring-transparent')}
            >
              <Avatar seed={s} size={compact ? 30 : 34} />
            </motion.button>
          ))}
          <motion.button
            type="button"
            onClick={() => setAltBase(randomSeed('alt'))}
            whileHover={{ rotate: 90 }}
            whileTap={{ scale: 0.85 }}
            transition={spring.snappy}
            aria-label={t('profile.avatar.moreOptions')}
            title={t('profile.avatar.moreOptions')}
            className="ml-0.5 flex size-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-2 hover:text-ink"
          >
            <RefreshCw className="size-3.5" />
          </motion.button>
        </div>
        {!compact && <p className="text-center text-[12px] text-ink-3 sm:text-left">{t('profile.avatar.hint', { mb: MAX_AVATAR_MB })}</p>}
      </div>
    </div>
  )
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react'
import { ChevronLeft, ChevronRight, Download, Pause, Play, X, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_IOS, EASE_OUT } from '@/lib/motion'
import { loadFileUrl, mediaIsImage, mediaIsVideo } from '@/lib/files'
import { formatBytes } from '@/lib/format'
import { useMediaUrl } from '@/lib/useMediaUrl'
import { useLang } from '@/i18n'
import type { Lang, MediaRef } from '@/store/types'
import { MediaView } from '@/components/art/MediaView'
import { useElementSize } from '@/components/charts/shared'

const STR: Record<Lang, Record<string, string>> = {
  en: { close: 'Close', prev: 'Previous', next: 'Next', zoomIn: 'Zoom in', zoomOut: 'Zoom out', download: 'Download', play: 'Play slideshow', pause: 'Pause slideshow', hint: 'Swipe or use ← → · click to zoom' },
  de: { close: 'Schließen', prev: 'Zurück', next: 'Weiter', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', download: 'Herunterladen', play: 'Diashow starten', pause: 'Diashow pausieren', hint: 'Wischen oder ← → · klicken zum Zoomen' },
  tr: { close: 'Kapat', prev: 'Önceki', next: 'Sonraki', zoomIn: 'Yakınlaştır', zoomOut: 'Uzaklaştır', download: 'İndir', play: 'Slayt gösterisini başlat', pause: 'Slayt gösterisini duraklat', hint: 'Kaydır veya ← → · yakınlaştırmak için tıkla' },
}

const ZOOM = 2.4
const SLIDE_MS = 3500


export interface LightboxProps {
  items: MediaRef[]
  /** Open at this index; `null` = closed. */
  index: number | null
  onClose: () => void
  /** Notified when the visible item changes. */
  onIndexChange?: (index: number) => void
  captions?: (ReactNode | undefined)[]
  title?: ReactNode
  /**
   * Draw on top of the media (e.g. annotation pins). The overlay box matches
   * the media exactly, so position children in percentages.
   */
  renderOverlay?: (index: number) => ReactNode
  /** Click on the media → percentage coordinates (turns click-to-zoom off; use the zoom button). */
  onMediaClick?: (index: number, xPct: number, yPct: number) => void
  /** Extra toolbar buttons. */
  actions?: (index: number) => ReactNode
  /**
   * Element the item at `index` lives in (a thumbnail, a folder…). When given,
   * the viewer zooms out of it on open and flies back into it on close.
   */
  originFor?: (index: number) => Element | null | undefined
}

function ToolBtn({ label, onClick, children, active }: { label: string; onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 520, damping: 24 }}
      className={cn(
        'flex size-10 items-center justify-center rounded-full border border-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-xl transition-colors',
        active ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-white/10 hover:bg-white/20',
      )}
    >
      {children}
    </motion.button>
  )
}

/** Natural aspect ratio of a media item (art is 4:3). */
function useAspect(media: MediaRef | undefined) {
  const url = useMediaUrl(media && media.kind !== 'art' ? media : undefined)
  const [ar, setAr] = useState(4 / 3)
  useEffect(() => {
    if (!media || media.kind === 'art') return setAr(4 / 3)
    if (!url) return
    let alive = true
    if (mediaIsImage(media)) {
      const img = new Image()
      img.onload = () => alive && setAr(img.naturalWidth / img.naturalHeight || 4 / 3)
      img.src = url
    } else if (mediaIsVideo(media)) {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => alive && setAr(v.videoWidth / v.videoHeight || 16 / 9)
      v.src = url
    } else setAr(4 / 3)
    return () => {
      alive = false
    }
  }, [media, url])
  return ar
}

async function downloadMedia(media: MediaRef, frame: HTMLElement | null) {
  const a = document.createElement('a')
  let revoke: string | undefined
  if (media.kind === 'art') {
    const svg = frame?.querySelector('svg')
    if (!svg) return
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('width', '1600')
    clone.setAttribute('height', '1200')
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' })
    revoke = URL.createObjectURL(blob)
    a.href = revoke
    a.download = `designtab-${media.seed}.svg`
  } else if (media.kind === 'file') {
    const url = await loadFileUrl(media.fileId)
    if (!url) return
    a.href = url
    a.download = media.name
  } else {
    a.href = media.url
    a.download = media.name ?? ''
    a.target = '_blank'
    a.rel = 'noopener'
  }
  document.body.appendChild(a)
  a.click()
  a.remove()
  if (revoke) setTimeout(() => URL.revokeObjectURL(revoke!), 4000)
}

/**
 * Fullscreen media viewer: swipe / arrows / keyboard, click (or double-tap)
 * to zoom and drag to pan, thumbnail strip, slideshow, download (art exports
 * as SVG) and an overlay slot for annotation pins.
 */
export function Lightbox(props: LightboxProps) {
  return createPortal(<AnimatePresence>{props.index !== null && props.items.length > 0 && <LightboxInner key="lb" {...props} index={props.index} />}</AnimatePresence>, document.body)
}

type Flip = { x: number; y: number; scaleX: number; scaleY: number; opacity: number }

function LightboxInner({ items, index, onClose, onIndexChange, captions, title, renderOverlay, onMediaClick, actions, originFor }: LightboxProps & { index: number }) {
  const lang = useLang()
  const s = STR[lang]
  const [i, setI] = useState(Math.min(index, items.length - 1))
  const [dir, setDir] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [stageRef, stage] = useElementSize<HTMLDivElement>()
  const frameRef = useRef<HTMLDivElement>(null)
  const thumbs = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const panX = useMotionValue(0)
  const panY = useMotionValue(0)
  const n = items.length
  const media = items[i]
  const ar = useAspect(media)
  const [openFrom, setOpenFrom] = useState<Flip | null | undefined>(undefined) // undefined = not measured yet
  const [closing, setClosing] = useState<Flip | false>(false)

  useEffect(() => setI(Math.min(index, n - 1)), [index, n])

  const pad = stage.width < 640 ? 8 : 40
  const maxW = Math.max(0, stage.width - pad * 2)
  const maxH = Math.max(0, stage.height - pad * 2)
  const fw = Math.min(maxW, maxH * ar)
  const fh = fw / ar

  /** Transform that makes the (centred, unzoomed) frame cover the origin element. */
  const flipTo = useCallback(
    (k: number): Flip | null => {
      const el = originFor?.(k)
      const st = stageRef.current
      if (!el || !st || !fw) return null
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return null
      const sr = st.getBoundingClientRect()
      return {
        x: r.left + r.width / 2 - (sr.left + sr.width / 2),
        y: r.top + r.height / 2 - (sr.top + sr.height / 2),
        scaleX: r.width / fw,
        scaleY: r.height / fh,
        opacity: 1,
      }
    },
    [originFor, stageRef, fw, fh],
  )

  // only the very first frame flies in from the origin
  const opened = useRef(false)
  useEffect(() => {
    if (openFrom !== undefined) opened.current = true
  }, [openFrom])

  // measure the origin once the stage has a size (before first paint of the frame)
  useLayoutEffect(() => {
    if (openFrom !== undefined || !fw) return
    setOpenFrom(flipTo(i))
  }, [openFrom, fw, flipTo, i])

  const requestClose = useCallback(() => {
    if (closing) return
    setPlaying(false)
    setZoom(1)
    panX.set(0)
    panY.set(0)
    setClosing(flipTo(i) ?? { x: 0, y: 24, scaleX: 0.9, scaleY: 0.9, opacity: 0 })
  }, [closing, flipTo, i, panX, panY])

  // safety net: always finish closing even if no animation completes
  useEffect(() => {
    if (!closing) return
    const t = window.setTimeout(onClose, 650)
    return () => window.clearTimeout(t)
  }, [closing, onClose])

  const resetZoom = useCallback(() => {
    setZoom(1)
    animate(panX, 0, { type: 'spring', stiffness: 400, damping: 36 })
    animate(panY, 0, { type: 'spring', stiffness: 400, damping: 36 })
  }, [panX, panY])

  const go = useCallback(
    (delta: number) => {
      if (n < 2) return
      resetZoom()
      setDir(delta)
      const next = (i + delta + n) % n
      setI(next)
      onIndexChange?.(next)
    },
    [i, n, onIndexChange, resetZoom],
  )

  const zoomAt = useCallback(
    (px = 0.5, py = 0.5) => {
      if (zoom > 1) return resetZoom()
      setZoom(ZOOM)
      const limX = (fw * (ZOOM - 1)) / 2
      const limY = (fh * (ZOOM - 1)) / 2
      animate(panX, Math.max(-limX, Math.min(limX, (0.5 - px) * fw * (ZOOM - 1))), { type: 'spring', stiffness: 300, damping: 30 })
      animate(panY, Math.max(-limY, Math.min(limY, (0.5 - py) * fh * (ZOOM - 1))), { type: 'spring', stiffness: 300, damping: 30 })
    },
    [zoom, fw, fh, panX, panY, resetZoom],
  )

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === '+' || e.key === '=') zoom === 1 && zoomAt()
      else if (e.key === '-' || e.key === '0') resetZoom()
      else if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, requestClose, zoom, zoomAt, resetZoom])

  // lock page scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // slideshow
  useEffect(() => {
    if (!playing || n < 2) return
    const t = window.setTimeout(() => go(1), SLIDE_MS)
    return () => window.clearTimeout(t)
  }, [playing, i, go, n])

  // keep the active thumbnail in view
  useEffect(() => {
    thumbs.current?.querySelector<HTMLElement>(`[data-thumb="${i}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [i])

  const onFrameClick = (e: MouseEvent<HTMLDivElement>) => {
    if (dragging.current) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    if (onMediaClick && zoom === 1) {
      onMediaClick(i, Math.round(px * 1000) / 10, Math.round(py * 1000) / 10)
      return
    }
    if (onMediaClick) return resetZoom()
    zoomAt(px, py)
  }

  const caption = captions?.[i]
  const fileInfo = media.kind === 'file' ? `${media.name} · ${formatBytes(media.size)}` : media.kind === 'url' ? (media.name ?? media.url) : null
  const limX = (fw * (zoom - 1)) / 2
  const limY = (fh * (zoom - 1)) / 2

  return (
    <motion.div className="fixed inset-0 z-[95] flex flex-col text-white" role="dialog" aria-modal aria-label={typeof title === 'string' ? title : 'Media viewer'}>
      <motion.div
        className="absolute inset-0 bg-[rgba(6,6,8,.86)] backdrop-blur-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}
        transition={{ duration: closing ? 0.35 : 0.3 }}
        onClick={requestClose}
      />
      {/* soft accent glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[120px]"
        style={{ background: 'var(--accent)' }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: closing ? 0 : 0.22 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      />

      {/* top bar */}
      <motion.div
        className="relative z-[2] flex items-center gap-3 px-3 pt-3 sm:px-5 sm:pt-4"
        initial={{ opacity: 0, y: -16 }}
        animate={closing ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
        transition={{ duration: closing ? 0.18 : 0.4, ease: EASE_OUT, delay: closing ? 0 : 0.05 }}
      >
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 font-mono text-[12px] tabular-nums backdrop-blur-xl">
          {String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          {title && <div className="truncate text-[14px] font-medium">{title}</div>}
          <div className="hidden truncate text-[12px] text-white/50 sm:block">{s.hint}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {actions?.(i)}
          {n > 1 && (
            <ToolBtn label={playing ? s.pause : s.play} onClick={() => setPlaying((p) => !p)} active={playing}>
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </ToolBtn>
          )}
          <span className="hidden sm:contents">
            <ToolBtn label={zoom > 1 ? s.zoomOut : s.zoomIn} onClick={() => (zoom > 1 ? resetZoom() : zoomAt())}>
              {zoom > 1 ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
            </ToolBtn>
          </span>
          <ToolBtn label={s.download} onClick={() => downloadMedia(media, frameRef.current)}>
            <Download className="size-4" />
          </ToolBtn>
          <ToolBtn label={s.close} onClick={requestClose}>
            <X className="size-4.5" />
          </ToolBtn>
        </div>
      </motion.div>

      {/* slideshow progress */}
      <div className="relative z-[2] mx-3 mt-3 h-[2px] overflow-hidden rounded-full sm:mx-5">
        {playing && (
          <motion.div
            key={i}
            className="absolute inset-y-0 left-0 bg-[var(--accent)]"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: SLIDE_MS / 1000, ease: 'linear' }}
          />
        )}
      </div>

      {/* stage */}
      <div ref={stageRef} className="relative z-[1] min-h-0 flex-1 overflow-hidden" onClick={(e) => e.target === e.currentTarget && requestClose()}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          {openFrom !== undefined && (
          <motion.div
            key={i}
            custom={dir}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={{ x: dir * 160, opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ x: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ x: dir * -160, opacity: 0, scale: 0.9, filter: 'blur(10px)', transition: { duration: 0.25, ease: EASE_IOS } }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          >
            <motion.div
              className="pointer-events-auto"
              drag={zoom === 1 && n > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.75}
              onDragStart={() => (dragging.current = true)}
              onDragEnd={(_, info) => {
                setTimeout(() => (dragging.current = false), 60)
                if (info.offset.x < -70 || info.velocity.x < -500) go(1)
                else if (info.offset.x > 70 || info.velocity.x > 500) go(-1)
              }}
              style={{ touchAction: zoom > 1 ? 'none' : 'pan-y' }}
            >
              <motion.div
                style={{ x: panX, y: panY }}
                drag={zoom > 1}
                dragConstraints={{ left: -limX, right: limX, top: -limY, bottom: limY }}
                dragElastic={0.15}
                onDragStart={() => (dragging.current = true)}
                onDragEnd={() => setTimeout(() => (dragging.current = false), 60)}
              >
                <motion.div animate={{ scale: zoom }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
                  <motion.div
                    ref={frameRef}
                    initial={openFrom && !opened.current ? openFrom : false}
                    animate={closing ? closing : { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
                    transition={closing ? { type: 'spring', stiffness: 380, damping: 36 } : { type: 'spring', stiffness: 260, damping: 28 }}
                    onAnimationComplete={() => closing && onClose()}
                    className={cn(
                      'relative overflow-hidden rounded-[18px] bg-black/40 shadow-[0_40px_120px_-30px_rgba(0,0,0,.9)] ring-1 ring-white/10',
                      onMediaClick ? 'cursor-crosshair' : zoom > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in',
                    )}
                    style={{ width: fw || undefined, height: fh || undefined }}
                    onClick={onFrameClick}
                    onDoubleClick={() => onMediaClick && zoomAt()}
                  >
                    {fw > 0 && <MediaView media={media} fit="cover" controls={mediaIsVideo(media) && media.kind !== 'art'} playBadge={false} />}
                    {renderOverlay && <div className="absolute inset-0">{renderOverlay(i)}</div>}
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>

        {n > 1 && !closing && (
          <>
            <motion.button
              type="button"
              aria-label={s.prev}
              onClick={() => go(-1)}
              whileHover={{ scale: 1.08, x: -2 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-4 top-1/2 z-[3] hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-xl hover:bg-white/20 md:flex"
            >
              <ChevronLeft className="size-5" />
            </motion.button>
            <motion.button
              type="button"
              aria-label={s.next}
              onClick={() => go(1)}
              whileHover={{ scale: 1.08, x: 2 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="absolute right-4 top-1/2 z-[3] hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-xl hover:bg-white/20 md:flex"
            >
              <ChevronRight className="size-5" />
            </motion.button>
          </>
        )}
      </div>

      {/* caption + thumbnails */}
      <motion.div
        className="safe-bottom relative z-[2] px-3 pb-3 sm:px-5 sm:pb-5"
        initial={{ opacity: 0, y: 20 }}
        animate={closing ? { opacity: 0, y: 14 } : { opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 14, transition: { duration: 0.15 } }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.08 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mb-3 max-w-2xl text-center"
          >
            {caption && <p className="text-[14px] text-white/90">{caption}</p>}
            {fileInfo && <p className="mt-0.5 truncate font-mono text-[11.5px] text-white/50">{fileInfo}</p>}
          </motion.div>
        </AnimatePresence>
        {n > 1 && (
          <div ref={thumbs} className="no-scrollbar mx-auto flex max-w-full gap-2 overflow-x-auto px-1 py-1.5 sm:justify-center">
            {items.map((m, k) => (
              <motion.button
                key={k}
                type="button"
                data-thumb={k}
                aria-label={`${k + 1} / ${n}`}
                aria-current={k === i}
                onClick={() => {
                  if (k === i) return
                  resetZoom()
                  setDir(k > i ? 1 : -1)
                  setI(k)
                  onIndexChange?.(k)
                }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.92 }}
                animate={{ opacity: k === i ? 1 : 0.5, scale: k === i ? 1.06 : 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[10px] sm:h-14 sm:w-[74px]"
              >
                <MediaView media={m} playBadge={false} />
                {k === i && (
                  <motion.span layoutId="lb-thumb-ring" className="absolute inset-0 rounded-[10px] ring-2 ring-inset ring-white" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
                )}
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

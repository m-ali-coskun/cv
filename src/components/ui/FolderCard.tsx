import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from 'motion/react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store'
import type { MediaRef } from '@/store/types'
import { MediaView } from '@/components/art/MediaView'

export interface FolderCardProps {
  /** Up to 3 are shown as papers peeking out of the folder. */
  items: MediaRef[]
  title: ReactNode
  subtitle?: ReactNode
  /** Folder tint. Any CSS colour or token — default `var(--accent)`. */
  color?: string
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  /** Controlled open state (otherwise opens on hover / keyboard focus / first tap). */
  open?: boolean
  /** Small element in the label row (e.g. a <Pill>). */
  badge?: ReactNode
  /** Icon shown on the glass flap (e.g. <DisciplineIcon/>). */
  icon?: ReactNode
  /** Custom paper content instead of `items` (each child = one paper). */
  papers?: ReactNode[]
  /** Highlight ring (e.g. the folder currently being viewed). */
  selected?: boolean
  /** Accept dropped files: the folder opens while dragging over it. */
  onFilesDrop?: (files: File[]) => void
  className?: string
  /** Accessible label (defaults to the title when it is a string). */
  ariaLabel?: string
}

const SIZES = {
  sm: { max: 210, title: 'text-[13.5px]', sub: 'text-[12px]', radius: 14, paper: 9, border: 2 },
  md: { max: 290, title: 'text-[15px]', sub: 'text-[12.5px]', radius: 18, paper: 11, border: 3 },
  lg: { max: 380, title: 'text-[17px]', sub: 'text-[13px]', radius: 22, paper: 14, border: 3.5 },
} as const

/** Paper poses: closed (peeking, slightly messy) → open (risen and fanned). */
function poses(count: number) {
  if (count <= 1) return [{ closed: { x: '0%', y: '5%', rotate: -2 }, open: { x: '0%', y: '-36%', rotate: -4 } }]
  if (count === 2)
    return [
      { closed: { x: '-4%', y: '7%', rotate: -4 }, open: { x: '-16%', y: '-26%', rotate: -10 } },
      { closed: { x: '4%', y: '4%', rotate: 3 }, open: { x: '16%', y: '-34%', rotate: 9 } },
    ]
  return [
    { closed: { x: '-5%', y: '8%', rotate: -5 }, open: { x: '-24%', y: '-22%', rotate: -12 } },
    { closed: { x: '5%', y: '6%', rotate: 4 }, open: { x: '24%', y: '-24%', rotate: 11 } },
    { closed: { x: '0%', y: '3%', rotate: -1 }, open: { x: '0%', y: '-38%', rotate: 0 } },
  ]
}

/**
 * The signature folder (inspired by rareui's folder component).
 *
 * Layers, back to front: soft floor shadow → tinted back panel with tab →
 * 1–3 papers (media) → liquid-glass front flap. On hover / keyboard focus /
 * first tap the flap tilts open in 3D while the papers spring up and fan out;
 * the whole folder also leans toward the cursor.
 */
export function FolderCard({
  items,
  title,
  subtitle,
  color = 'var(--accent)',
  onClick,
  size = 'md',
  open,
  badge,
  icon,
  papers,
  selected,
  onFilesDrop,
  className,
  ariaLabel,
}: FolderCardProps) {
  const S = SIZES[size]
  const expressive = useApp((s) => s.settings.motion) === 'expressive'
  const [hovered, setHovered] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const lastPointer = useRef<string>('mouse')
  const root = useRef<HTMLDivElement>(null)
  const isOpen = open ?? (hovered || dragOver)

  // pointer parallax (springs, no re-renders)
  const rx = useSpring(0, { stiffness: 200, damping: 20 })
  const ry = useSpring(0, { stiffness: 200, damping: 20 })
  const gx = useMotionValue(30)
  const glare = useMotionTemplate`linear-gradient(115deg, transparent ${gx}%, rgba(255,255,255,.55) calc(${gx}% + 10%), transparent calc(${gx}% + 24%))`

  const paperNodes: ReactNode[] =
    papers && papers.length
      ? papers.slice(0, 3)
      : items.length
        ? items.slice(0, 3).map((m, i) => <MediaView key={i} media={m} playBadge={false} />)
        : [<BlankPaper key="a" />, <BlankPaper key="b" lines={4} />]
  const extra = Math.max(0, (papers?.length ?? items.length) - 3)
  const P = poses(paperNodes.length)

  // close after an outside tap (touch flow)
  useEffect(() => {
    if (!hovered || lastPointer.current === 'mouse') return
    const onDown = (e: globalThis.PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setHovered(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [hovered])

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    gx.set(px * 100 - 20)
    if (expressive) {
      ry.set((px - 0.5) * 14)
      rx.set(-(py - 0.5) * 8)
    }
  }
  const onLeave = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setHovered(false)
    rx.set(0)
    ry.set(0)
  }
  const activate = () => {
    // first tap on touch only opens; the second one "clicks"
    if (lastPointer.current !== 'mouse' && open === undefined && !hovered) {
      setHovered(true)
      return
    }
    onClick?.()
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }
  const dragHandlers = onFilesDrop
    ? {
        onDragOver: (e: DragEvent) => {
          e.preventDefault()
          setDragOver(true)
        },
        onDragLeave: (e: DragEvent) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false)
        },
        onDrop: (e: DragEvent) => {
          e.preventDefault()
          setDragOver(false)
          const files = Array.from(e.dataTransfer.files)
          if (files.length) onFilesDrop(files)
        },
      }
    : {}

  const springy = { type: 'spring', stiffness: 260, damping: 19, mass: 0.9 } as const

  return (
    <div
      ref={root}
      className={cn(
        'group/folder relative w-full select-none rounded-[24px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-8 focus-visible:ring-offset-[var(--surface)]',
        isOpen && 'z-10',
        className,
      )}
      style={{ maxWidth: S.max }}
      role={onClick ? 'button' : 'group'}
      tabIndex={0}
      aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
      aria-expanded={isOpen}
      onPointerEnter={(e) => {
        lastPointer.current = e.pointerType
        if (e.pointerType === 'mouse') setHovered(true)
      }}
      onPointerDown={(e) => (lastPointer.current = e.pointerType)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onFocus={(e) => e.currentTarget.matches(':focus-visible') && setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={activate}
      onKeyDown={onKey}
      {...dragHandlers}
    >
      <motion.div
        className="relative w-full [perspective:1100px]"
        style={{ aspectRatio: '5 / 4.1', rotateX: rx, rotateY: ry, transformPerspective: 1100 }}
        animate={{ y: isOpen ? -4 : 0 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {/* floor shadow */}
        <motion.div
          aria-hidden
          className="absolute inset-x-[6%] -bottom-[5%] h-[16%] rounded-[50%] bg-black/30 blur-[14px] dark:bg-black/70"
          animate={{ scaleX: isOpen ? 1.08 : 0.92, opacity: isOpen ? 0.75 : 0.5, y: isOpen ? 6 : 0 }}
          transition={springy}
        />

        {/* tab */}
        <svg aria-hidden viewBox="0 0 120 30" preserveAspectRatio="none" className="absolute left-0 top-0 h-[17%] w-[47%]">
          <path
            d="M0,30 L0,10 Q0,0 10,0 L66,0 Q75,0 80,7 L88,19 Q93,26 102,26 L120,26 L120,30 Z"
            style={{ fill: `color-mix(in oklab, ${color} 82%, #fff)` }}
          />
        </svg>

        {/* back panel */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 top-[13.5%] overflow-hidden"
          style={{
            borderRadius: `${S.radius * 0.35}px ${S.radius}px ${S.radius}px ${S.radius}px`,
            background: `linear-gradient(180deg, color-mix(in oklab, ${color} 82%, #fff) 0%, ${color} 38%, color-mix(in oklab, ${color} 78%, #000) 100%)`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45)',
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,rgba(255,255,255,.28),transparent_60%)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.22))]" />
        </div>

        {/* papers */}
        <div className="absolute inset-x-[12%] bottom-[12%] top-[18%]">
          {paperNodes.map((node, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 overflow-hidden bg-white shadow-[0_10px_24px_-10px_rgba(0,0,0,.45),0_2px_4px_rgba(0,0,0,.08)] dark:bg-[var(--surface-3)]"
              style={{ borderRadius: S.paper, border: `${S.border}px solid rgba(255,255,255,.96)`, transformOrigin: '50% 90%' }}
              initial={false}
              animate={isOpen ? { ...P[i].open, scale: 1.02 } : { ...P[i].closed, scale: 1 }}
              transition={{ ...springy, delay: isOpen ? i * 0.045 : (paperNodes.length - 1 - i) * 0.03 }}
            >
              <div className="pointer-events-none size-full [&_*]:pointer-events-none">{node}</div>
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,.22),transparent_40%)]" />
            </motion.div>
          ))}
        </div>

        {/* liquid-glass front flap */}
        <motion.div
          className="absolute inset-x-0 bottom-0 top-[34%] origin-bottom overflow-hidden"
          style={{
            borderRadius: S.radius,
            background: `linear-gradient(180deg, color-mix(in oklab, ${color} 58%, rgba(255,255,255,.62)) 0%, color-mix(in oklab, ${color} 80%, transparent) 55%, color-mix(in oklab, ${color} 88%, rgba(0,0,0,.25)) 100%)`,
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            boxShadow:
              'inset 0 1.5px 0 rgba(255,255,255,.85), inset 0 0 0 1px rgba(255,255,255,.22), inset 0 -10px 24px -14px rgba(0,0,0,.35), 0 -8px 24px -14px rgba(0,0,0,.35)',
          }}
          initial={false}
          animate={isOpen ? { rotateX: -34, scaleY: 0.96, y: '3%' } : { rotateX: 0, scaleY: 1, y: '0%' }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
        >
          {/* specular glare that follows the cursor */}
          <motion.div aria-hidden className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/folder:opacity-100" style={{ background: glare }} />
          {/* top rim light */}
          <div aria-hidden className="absolute inset-x-[8%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.95),transparent)]" />
          {/* refraction blob */}
          <div aria-hidden className="absolute -left-[10%] -top-[40%] h-[90%] w-[60%] rounded-full bg-white/25 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-[7%]">
            <span className="flex items-center gap-1.5 [&_svg]:size-4">{icon}</span>
            <AnimatePresence>
              {extra > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="rounded-full bg-white/70 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#0b0b0c] shadow-[inset_0_1px_0_#fff] backdrop-blur"
                >
                  +{extra}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* drop / selected glow */}
        <AnimatePresence>
          {(dragOver || selected) && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-[5%] rounded-[28px]"
              style={{ boxShadow: `0 0 0 2px ${color}, 0 0 40px -6px ${color}` }}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: dragOver ? 1 : 0.8, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* label */}
      <div className="mt-[9%] flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <motion.div
            className={cn('truncate font-medium tracking-[-0.015em] text-ink', S.title)}
            animate={{ x: isOpen ? 2 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            {title}
          </motion.div>
          {subtitle && <div className={cn('mt-0.5 truncate text-ink-3', S.sub)}>{subtitle}</div>}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
    </div>
  )
}

/** Placeholder sheet with "text lines" for empty folders. */
function BlankPaper({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex size-full flex-col gap-[8%] bg-white p-[10%] dark:bg-[var(--surface-3)]">
      <div className="h-[9%] w-1/2 rounded-full bg-black/10 dark:bg-white/15" />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-[6%] rounded-full bg-black/[.06] dark:bg-white/10" style={{ width: `${88 - i * 14}%` }} />
      ))}
    </div>
  )
}

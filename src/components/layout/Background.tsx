import { motion } from 'motion/react'
import { useApp } from '@/store'

/**
 * Animated aurora behind every glass surface. Colours come from the
 * (animatable) --glow-1/--glow-2/--accent tokens so they morph with the theme.
 */
export function Background() {
  const animated = useApp((s) => s.settings.animatedBackground && s.settings.motion !== 'off')
  const blobs = [
    { c: 'var(--glow-1)', x: '-10%', y: '-20%', s: '60vmax', d: 0 },
    { c: 'var(--glow-2)', x: '55%', y: '-10%', s: '48vmax', d: 4 },
    { c: 'var(--accent)', x: '70%', y: '60%', s: '42vmax', d: 8 },
    { c: 'var(--glow-2)', x: '-5%', y: '65%', s: '40vmax', d: 2 },
  ]
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-[0.38] blur-[90px] dark:opacity-[0.28]"
          style={{ left: b.x, top: b.y, width: b.s, height: b.s, background: b.c }}
          animate={
            animated
              ? { x: [0, 60, -40, 0], y: [0, -50, 40, 0], scale: [1, 1.12, 0.92, 1] }
              : undefined
          }
          transition={{ duration: 22 + i * 4, repeat: Infinity, ease: 'easeInOut', delay: b.d }}
        />
      ))}
      <div className="dot-grid absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" />
      {/* grain */}
      <svg className="absolute inset-0 size-full opacity-[0.05] mix-blend-overlay">
        <filter id="bg-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-grain)" />
      </svg>
    </div>
  )
}

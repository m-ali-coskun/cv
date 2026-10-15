import { memo, type CSSProperties } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import type { DisciplineTheme } from '@/theme/disciplines'

const PALETTE = {
  light: { bg: '#e7e7e9', card: '#ffffff', tile: '#f1f1f3', line: '#dcdce1', ink: '#0b0b0c', ink3: '#b5b5bd' },
  dark: { bg: '#0b0b0d', card: '#18181b', tile: '#232327', line: '#2e2e33', ink: '#f4f4f5', ink3: '#55555d' },
}

type Box = { l: number; t: number; w: number; h: number }
const pos = ({ l, t, w, h }: Box): CSSProperties => ({ position: 'absolute', left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` })

function Bar({ box, color, delay = 0, radius = 99, animate }: { box: Box; color: string; delay?: number; radius?: number; animate?: boolean }) {
  return (
    <motion.span
      aria-hidden
      style={{ ...pos(box), background: color, borderRadius: radius, transformOrigin: 'left center' }}
      initial={animate ? { scaleX: 0, opacity: 0 } : false}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
    />
  )
}

/** Semicircle tick gauge like the reference "94% ready to submit". */
function MiniGauge({ color, value = 0.78 }: { color: string; value?: number }) {
  const n = 17
  return (
    <svg viewBox="0 0 100 56" className="absolute inset-x-[12%] top-[18%] h-auto w-[76%]" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const a = Math.PI - (i / (n - 1)) * Math.PI
        const r1 = 30
        const r2 = i === Math.round(value * (n - 1)) ? 47 : 42
        const x1 = 50 + Math.cos(a) * r1
        const y1 = 52 - Math.sin(a) * r1
        const x2 = 50 + Math.cos(a) * r2
        const y2 = 52 - Math.sin(a) * r2
        const on = i / (n - 1) <= value
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={4.2} strokeLinecap="round" opacity={on ? 1 : 0.22} />
      })}
    </svg>
  )
}

/**
 * A miniature of the designTab dashboard painted in one discipline theme —
 * sidebar, greeting + accent pill, hero card, stats with a black tile,
 * pipeline, attention table, the dark AI card and the tick gauge.
 */
export const ThemeMock = memo(function ThemeMock({
  theme,
  mode = 'light',
  animate = false,
  className,
  style,
}: {
  theme: Pick<DisciplineTheme, 'accent' | 'ink' | 'deep' | 'glow' | 'glow2'>
  mode?: 'light' | 'dark'
  animate?: boolean
  className?: string
  style?: CSSProperties
}) {
  const p = PALETTE[mode]
  const night = mode === 'dark' ? `color-mix(in oklab, ${theme.deep} 60%, #000)` : '#0e0e10'
  const card = (box: Box, extra?: CSSProperties) => (
    <span aria-hidden style={{ ...pos(box), background: p.card, borderRadius: '7%/11%', boxShadow: mode === 'light' ? '0 1px 2px rgba(0,0,0,.05)' : 'none', ...extra }} />
  )
  return (
    <div className={cn('relative aspect-[16/10] w-full overflow-hidden', className)} style={{ background: p.bg, ...style }}>
      {/* soft background glows */}
      <span aria-hidden className="absolute -right-[10%] -top-[20%] size-[55%] rounded-full opacity-60 blur-2xl" style={{ background: theme.glow }} />
      <span aria-hidden className="absolute -bottom-[25%] left-[20%] size-[45%] rounded-full opacity-40 blur-2xl" style={{ background: theme.glow2 }} />

      {/* sidebar */}
      {card({ l: 2.5, t: 4, w: 19, h: 92 }, { borderRadius: '14%/7%' })}
      <span aria-hidden style={{ ...pos({ l: 5, t: 8, w: 4.6, h: 7.4 }), background: night, borderRadius: '28%' }} />
      <span aria-hidden style={{ ...pos({ l: 5.9, t: 10, w: 2.8, h: 3.4 }), background: theme.accent, borderRadius: '24%' }} />
      <Bar box={{ l: 10.8, t: 10.2, w: 8, h: 3 }} color={p.ink} animate={animate} />
      <span aria-hidden style={{ ...pos({ l: 4.2, t: 21, w: 15.6, h: 6 }), background: mode === 'light' ? p.ink : theme.accent, borderRadius: 99 }} />
      {[30, 37, 44, 51, 58].map((t, i) => (
        <Bar key={t} box={{ l: 5.5, t, w: 9 + ((i * 37) % 5), h: 2.6 }} color={p.ink3} delay={0.05 * i} animate={animate} />
      ))}
      <span aria-hidden style={{ ...pos({ l: 4.2, t: 78, w: 15.6, h: 14 }), background: theme.accent, borderRadius: '16%/26%' }} />
      <span aria-hidden style={{ ...pos({ l: 5.6, t: 81, w: 3.6, h: 5.6 }), background: night, borderRadius: 99 }} />
      <Bar box={{ l: 10.4, t: 82.4, w: 7, h: 2.4 }} color={theme.ink} animate={animate} delay={0.2} />

      {/* top row */}
      <Bar box={{ l: 25, t: 6.5, w: 22, h: 5 }} color={p.ink} animate={animate} />
      <span aria-hidden style={{ ...pos({ l: 49, t: 6, w: 12, h: 6 }), background: theme.accent, borderRadius: 99 }} />
      {card({ l: 70, t: 4.5, w: 16, h: 9 }, { borderRadius: 99 })}
      <span aria-hidden style={{ ...pos({ l: 87.5, t: 4.5, w: 9.5, h: 9 }), background: mode === 'light' ? p.ink : theme.accent, borderRadius: 99 }} />

      {/* hero card */}
      <span
        aria-hidden
        style={{
          ...pos({ l: 25, t: 18, w: 26, h: 38 }),
          borderRadius: '9%/12%',
          background: `linear-gradient(140deg, ${theme.glow} 0%, ${theme.accent} 45%, ${theme.deep} 100%)`,
        }}
      />
      {card({ l: 27.5, t: 37, w: 21, h: 16 }, { borderRadius: '10%/18%' })}
      <Bar box={{ l: 29.5, t: 40.5, w: 12, h: 2.6 }} color={p.ink} animate={animate} delay={0.15} />
      <span aria-hidden style={{ ...pos({ l: 29.5, t: 46.5, w: 17, h: 2.4 }), background: p.tile, borderRadius: 99 }} />
      <Bar box={{ l: 29.5, t: 46.5, w: 13, h: 2.4 }} color={p.ink} animate={animate} delay={0.3} />

      {/* stats card */}
      {card({ l: 53, t: 18, w: 44, h: 38 }, { borderRadius: '5%/12%' })}
      <span aria-hidden style={{ ...pos({ l: 55, t: 22, w: 9.5, h: 13 }), background: night, borderRadius: '14%/18%' }} />
      <Bar box={{ l: 56.5, t: 28, w: 5, h: 3.4 }} color={theme.accent} animate={animate} delay={0.1} />
      {[65.5, 76, 86.5].map((l, i) => (
        <span key={l} aria-hidden style={{ ...pos({ l, t: 22, w: 9.2, h: 13 }), background: p.tile, borderRadius: '14%/18%' }}>
          <Bar box={{ l: 14, t: 52, w: 46 - i * 6, h: 22 }} color={p.ink} animate={animate} delay={0.15 + i * 0.05} />
        </span>
      ))}
      {/* pipeline */}
      <span aria-hidden style={{ ...pos({ l: 55, t: 40, w: 9, h: 6 }), background: p.tile, borderRadius: 99 }} />
      <Bar box={{ l: 64.8, t: 40, w: 16, h: 6 }} color={theme.accent} animate={animate} delay={0.25} radius={99} />
      <span aria-hidden style={{ ...pos({ l: 81.6, t: 40, w: 6, h: 6 }), background: p.tile, borderRadius: 99 }} />
      <span aria-hidden style={{ ...pos({ l: 88.4, t: 40, w: 6.6, h: 6 }), background: night, borderRadius: 99 }} />
      {[55, 65, 82, 88.5].map((l) => (
        <span key={l} aria-hidden style={{ ...pos({ l, t: 49, w: 3, h: 2.4 }), background: p.ink3, borderRadius: 99 }} />
      ))}

      {/* attention table */}
      {card({ l: 25, t: 60, w: 47, h: 36 }, { borderRadius: '5%/11%' })}
      <Bar box={{ l: 27.5, t: 64, w: 14, h: 3.4 }} color={p.ink} animate={animate} delay={0.2} />
      <span aria-hidden style={{ ...pos({ l: 57, t: 63.5, w: 12, h: 4.5 }), background: theme.accent, borderRadius: 99 }} />
      {[72, 80, 88].map((t, i) => (
        <span key={t}>
          <span aria-hidden style={{ ...pos({ l: 27.5, t, w: 5, h: 2.4 }), background: p.ink3, borderRadius: 99 }} />
          <Bar box={{ l: 34, t, w: 13 - i * 2, h: 2.4 }} color={p.ink} animate={animate} delay={0.25 + i * 0.05} />
          <span aria-hidden style={{ ...pos({ l: 50, t: t - 0.6, w: 7, h: 3.8 }), background: p.tile, borderRadius: 99 }} />
          <span aria-hidden style={{ ...pos({ l: 61, t: t - 0.6, w: 6, h: 3.8 }), background: i === 2 ? '#fde8c8' : '#e5484d', borderRadius: 99 }} />
        </span>
      ))}

      {/* AI card + gauge */}
      <span aria-hidden style={{ ...pos({ l: 74, t: 60, w: 23, h: 17 }), background: night, borderRadius: '10%/16%' }} />
      <span aria-hidden style={{ ...pos({ l: 76.5, t: 63.5, w: 2.6, h: 4 }), background: theme.accent, borderRadius: 99 }} />
      <Bar box={{ l: 76.5, t: 70, w: 14, h: 2.6 }} color="rgba(255,255,255,.75)" animate={animate} delay={0.3} />
      <span aria-hidden style={{ ...pos({ l: 74, t: 79, w: 23, h: 17 }), background: theme.accent, borderRadius: '10%/16%' }}>
        <MiniGauge color={theme.ink} />
      </span>
    </div>
  )
})

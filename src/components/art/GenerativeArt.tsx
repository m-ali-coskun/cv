import { memo, useId } from 'react'
import { prng } from '@/lib/random'
import { disciplineTheme } from '@/theme/disciplines'
import type { ArtVariant, DisciplineId } from '@/store/types'

/**
 * Deterministic, offline "portfolio artwork". Every seed renders the same
 * piece, tinted with its discipline's palette, so the demo looks rich without
 * any network images.
 */

const PALETTES = [
  ['#FF6B3D', '#FFD23F', '#3BCEAC', '#0EAD69', '#1A1A2E'],
  ['#F72585', '#7209B7', '#3A0CA3', '#4361EE', '#4CC9F0'],
  ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'],
  ['#FFBE0B', '#FB5607', '#FF006E', '#8338EC', '#3A86FF'],
  ['#0B0B0C', '#F5F5F0', '#E63946', '#A8DADC', '#457B9D'],
  ['#FAF3DD', '#C8D5B9', '#8FC0A9', '#68B0AB', '#4A7C59'],
  ['#2B2D42', '#8D99AE', '#EDF2F4', '#EF233C', '#D90429'],
  ['#FFCDB2', '#FFB4A2', '#E5989B', '#B5838D', '#6D6875'],
  ['#03045E', '#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8'],
  ['#F1FA3C', '#121212', '#FF4F79', '#7DF9FF', '#FFFFFF'],
]

const WORDS = ['BOLD', 'Launch', 'SUMMER', 'Bloom', 'FOCUS', 'Studio', 'Nord', 'Pulse', 'HALO', 'Drift', 'Oasis', 'Neon', 'Grain', 'Echo', 'Form', 'Lumen', 'Orbit', 'Mono']
const SUB = ['Spring Collection 2026', 'A new way to brew', 'Live in Berlin · 08.11', 'Issue No. 14', 'Made slowly, with care', 'Now streaming', 'Volume II']

export interface GenerativeArtProps {
  seed: string
  variant: ArtVariant
  discipline?: DisciplineId
  className?: string
  /** Show a play overlay for video variants (default true). */
  playBadge?: boolean
  title?: string
}

export const GenerativeArt = memo(function GenerativeArt({ seed, variant, discipline = 'visual', className, playBadge = true, title }: GenerativeArtProps) {
  const uid = useId().replace(/:/g, '')
  const r = prng(`${seed}:${variant}`)
  const theme = disciplineTheme(discipline)
  const base = r.pick(PALETTES)
  // Blend: discipline accent always present for brand coherence.
  const pal = [theme.accent, ...r.shuffle(base).slice(0, 4)]
  const bg = r.bool(0.5) ? theme.deep : r.pick(['#F4F1EA', '#111114', '#EDEDED', base[4], '#0B1020'])
  const light = isLight(bg)
  const fg = light ? '#111114' : '#F7F7F2'
  const word = r.pick(WORDS)

  const common = (
    <defs>
      <filter id={`${uid}-blur`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="38" />
      </filter>
      <filter id={`${uid}-grain`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.09" />
        </feComponentTransfer>
      </filter>
      <radialGradient id={`${uid}-sphere`} cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
        <stop offset="18%" stopColor={pal[0]} />
        <stop offset="75%" stopColor={pal[1]} />
        <stop offset="100%" stopColor="#000" stopOpacity="0.9" />
      </radialGradient>
      <radialGradient id={`${uid}-sphere2`} cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
        <stop offset="25%" stopColor={pal[2]} />
        <stop offset="100%" stopColor="#000" stopOpacity="0.85" />
      </radialGradient>
      <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={pal[1]} />
        <stop offset="60%" stopColor={pal[0]} />
        <stop offset="100%" stopColor={pal[3]} />
      </linearGradient>
      <linearGradient id={`${uid}-ring`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={pal[0]} />
        <stop offset="50%" stopColor="#fff" />
        <stop offset="100%" stopColor={pal[2]} />
      </linearGradient>
      <radialGradient id={`${uid}-vignette`} cx="50%" cy="50%" r="75%">
        <stop offset="60%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
      </radialGradient>
    </defs>
  )

  let body: React.ReactNode
  switch (variant) {
    case 'mesh':
      body = (
        <>
          <rect width="400" height="300" fill={bg} />
          <g filter={`url(#${uid}-blur)`}>
            {Array.from({ length: 5 }, (_, i) => (
              <circle key={i} cx={r.range(0, 400)} cy={r.range(0, 300)} r={r.range(70, 150)} fill={pal[i % pal.length]} opacity={0.9} />
            ))}
          </g>
          <text x="24" y="270" fontSize="15" fill={fg} opacity="0.85" fontFamily="Geist Variable, sans-serif" fontWeight="500">
            {word.toLowerCase()} — {r.int(1, 24).toString().padStart(2, '0')}
          </text>
        </>
      )
      break
    case 'blob3d': {
      const cx = r.range(150, 250)
      const cy = r.range(120, 170)
      body = (
        <>
          <rect width="400" height="300" fill={light ? '#E9E9EC' : bg} />
          <ellipse cx={cx + 20} cy="268" rx="120" ry="14" fill="#000" opacity="0.28" filter={`url(#${uid}-blur)`} />
          <circle cx={cx} cy={cy} r={r.range(70, 95)} fill={`url(#${uid}-sphere)`} />
          <circle cx={cx + r.range(70, 110)} cy={cy + r.range(30, 70)} r={r.range(26, 40)} fill={`url(#${uid}-sphere2)`} />
          <ellipse cx={cx - 10} cy={cy + 10} rx={r.range(120, 150)} ry={r.range(28, 40)} fill="none" stroke={`url(#${uid}-ring)`} strokeWidth="9" opacity="0.9" transform={`rotate(${r.range(-25, 25)} ${cx} ${cy})`} />
          <circle cx={cx - r.range(90, 130)} cy={cy - r.range(40, 70)} r={r.range(10, 18)} fill={pal[3]} opacity="0.95" />
        </>
      )
      break
    }
    case 'ui': {
      const accent = pal[0]
      const surface = light ? '#FFFFFF' : '#1C1C21'
      const muted = light ? '#ECECEF' : '#2A2A31'
      body = (
        <>
          <rect width="400" height="300" fill={light ? '#E4E4E8' : '#0F0F12'} />
          <g filter={`url(#${uid}-blur)`} opacity="0.6">
            <circle cx="340" cy="40" r="90" fill={accent} />
          </g>
          <rect x="30" y="28" width="340" height="250" rx="14" fill={surface} />
          <circle cx="46" cy="42" r="3.5" fill="#FF5F57" />
          <circle cx="58" cy="42" r="3.5" fill="#FEBC2E" />
          <circle cx="70" cy="42" r="3.5" fill="#28C840" />
          <rect x="42" y="58" width="70" height="208" rx="8" fill={muted} />
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x="52" y={70 + i * 22} width={i === 1 ? 50 : r.range(30, 50)} height="8" rx="4" fill={i === 1 ? accent : light ? '#C9C9D1' : '#3A3A42'} />
          ))}
          <rect x="124" y="58" width="236" height="62" rx="10" fill={accent} />
          <text x="138" y="84" fontSize="13" fontWeight="600" fill={isLight(accent) ? '#111' : '#fff'} fontFamily="Geist Variable, sans-serif">
            {word}
          </text>
          <rect x="138" y="94" width="80" height="7" rx="3.5" fill={isLight(accent) ? '#111' : '#fff'} opacity="0.4" />
          {Array.from({ length: 3 }, (_, i) => (
            <g key={i}>
              <rect x={124 + i * 81} y="130" width="74" height="54" rx="9" fill={muted} />
              <rect x={133 + i * 81} y="142" width="30" height="6" rx="3" fill={light ? '#B3B3BC' : '#4A4A55'} />
              <text x={133 + i * 81} y="170" fontSize="15" fontWeight="600" fill={light ? '#111' : '#eee'} fontFamily="Geist Variable, sans-serif">
                {r.int(12, 98)}
              </text>
            </g>
          ))}
          <rect x="124" y="194" width="236" height="72" rx="10" fill={muted} />
          {Array.from({ length: 12 }, (_, i) => {
            const h = r.range(12, 52)
            return <rect key={i} x={136 + i * 18.5} y={256 - h} width="10" height={h} rx="3" fill={i % 4 === 0 ? accent : light ? '#C2C2CB' : '#44444F'} />
          })}
        </>
      )
      break
    }
    case 'video':
    case 'photo': {
      const sunY = r.range(110, 160)
      body = (
        <>
          <rect width="400" height="300" fill={`url(#${uid}-sky)`} />
          <circle cx={r.range(120, 280)} cy={sunY} r={r.range(34, 54)} fill="#FFF6D6" opacity="0.92" />
          <path d={mountain(r, 190, 70)} fill={pal[2]} opacity="0.85" />
          <path d={mountain(r, 220, 50)} fill={pal[3]} />
          <path d={mountain(r, 252, 30)} fill={light ? '#1A1A1A' : pal[4]} opacity="0.95" />
          <rect width="400" height="300" fill={`url(#${uid}-vignette)`} />
          {variant === 'video' && (
            <>
              <rect width="400" height="22" fill="#000" />
              <rect y="278" width="400" height="22" fill="#000" />
              <text x="14" y="15" fontSize="9" fill="#fff" opacity="0.8" fontFamily="Geist Mono Variable, monospace">
                ● REC {`00:${r.int(10, 59)}:${r.int(10, 59)}:${r.int(10, 23)}`}
              </text>
              <text x="386" y="15" fontSize="9" fill="#fff" opacity="0.8" textAnchor="end" fontFamily="Geist Mono Variable, monospace">
                4K · 24fps
              </text>
              <rect x="14" y="286" width="372" height="3" rx="1.5" fill="#fff" opacity="0.25" />
              <rect x="14" y="286" width={r.range(80, 300)} height="3" rx="1.5" fill={theme.accent} />
              {playBadge && (
                <g>
                  <circle cx="200" cy="150" r="26" fill="#000" opacity="0.35" />
                  <circle cx="200" cy="150" r="26" fill="none" stroke="#fff" strokeOpacity="0.6" />
                  <path d="M193 138 L213 150 L193 162 Z" fill="#fff" />
                </g>
              )}
            </>
          )}
        </>
      )
      break
    }
    case 'type':
      body = (
        <>
          <rect width="400" height="300" fill={bg} />
          <text x="24" y="190" fontSize="170" fontWeight="700" letterSpacing="-10" fill={pal[0]} fontFamily="Geist Variable, sans-serif">
            Aa
          </text>
          <text x="236" y="70" fontSize="22" fontWeight="600" fill={fg} fontFamily="Geist Variable, sans-serif">
            {word}
          </text>
          {Array.from({ length: 5 }, (_, i) => (
            <rect key={i} x="236" y={90 + i * 14} width={r.range(70, 140)} height="5" rx="2.5" fill={fg} opacity={0.25} />
          ))}
          <text x="24" y="270" fontSize="11" fill={fg} opacity="0.7" fontFamily="Geist Mono Variable, monospace">
            ABCDEFGHIJKLM 0123456789 — {r.pick(['Regular', 'Medium', 'Bold', 'Black'])}
          </text>
          <line x1="24" x2="376" y1="214" y2="214" stroke={fg} strokeOpacity="0.2" />
        </>
      )
      break
    case 'pattern': {
      const cols = 6
      const rows = 5
      const w = 400 / cols
      const h = 300 / rows
      body = (
        <>
          <rect width="400" height="300" fill={bg} />
          {Array.from({ length: cols * rows }, (_, i) => {
            const x = (i % cols) * w
            const y = Math.floor(i / cols) * h
            const c = pal[r.int(0, pal.length - 1)]
            const k = r.int(0, 4)
            if (k === 0) return <circle key={i} cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) / 2.4} fill={c} />
            if (k === 1) return <path key={i} d={`M${x} ${y + h} A ${w} ${h} 0 0 1 ${x + w} ${y}`} fill="none" stroke={c} strokeWidth="10" />
            if (k === 2) return <rect key={i} x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx="6" fill={c} />
            if (k === 3) return <path key={i} d={`M${x} ${y + h} L${x + w / 2} ${y} L${x + w} ${y + h} Z`} fill={c} />
            return <path key={i} d={`M${x} ${y} Q ${x + w} ${y} ${x + w} ${y + h} L ${x} ${y + h} Z`} fill={c} />
          })}
        </>
      )
      break
    }
    case 'logo': {
      const letter = word[0].toUpperCase()
      body = (
        <>
          <rect width="400" height="300" fill={bg} />
          <g transform="translate(200 128)">
            <circle r="62" fill={pal[0]} />
            <path d="M -62 0 A 62 62 0 0 1 62 0 Z" fill={pal[1]} opacity="0.9" />
            <text y="24" textAnchor="middle" fontSize="70" fontWeight="700" fill={isLight(pal[0]) ? '#111' : '#fff'} fontFamily="Geist Variable, sans-serif">
              {letter}
            </text>
          </g>
          <text x="200" y="236" textAnchor="middle" fontSize="24" fontWeight="600" letterSpacing="6" fill={fg} fontFamily="Geist Variable, sans-serif">
            {word.toUpperCase()}
          </text>
          <text x="200" y="258" textAnchor="middle" fontSize="9" letterSpacing="4" fill={fg} opacity="0.6" fontFamily="Geist Mono Variable, monospace">
            EST. {r.int(1987, 2025)}
          </text>
        </>
      )
      break
    }
    case 'illustration':
      body = (
        <>
          <rect width="400" height="300" fill={light ? bg : '#FFF4E0'} />
          <circle cx={r.range(80, 320)} cy="90" r="46" fill={pal[1]} />
          <path d="M0 230 Q 100 170 200 220 T 400 200 V300 H0 Z" fill={pal[2]} />
          <path d="M0 260 Q 120 220 240 260 T 400 250 V300 H0 Z" fill={pal[3]} />
          {Array.from({ length: 5 }, (_, i) => {
            const x = 40 + i * 80 + r.range(-15, 15)
            const hgt = r.range(50, 110)
            return (
              <g key={i} transform={`translate(${x} ${250 - hgt * 0.2})`}>
                <path d={`M0 0 L0 ${-hgt}`} stroke={pal[4]} strokeWidth="4" strokeLinecap="round" />
                <path d={`M0 ${-hgt * 0.6} C -26 ${-hgt * 0.75} -30 ${-hgt} 0 ${-hgt - 6} C 30 ${-hgt} 26 ${-hgt * 0.75} 0 ${-hgt * 0.6} Z`} fill={pal[i % pal.length]} />
              </g>
            )
          })}
          <g opacity="0.9">
            <ellipse cx={r.range(60, 340)} cy="55" rx="34" ry="12" fill="#fff" />
            <ellipse cx={r.range(60, 340)} cy="40" rx="24" ry="9" fill="#fff" />
          </g>
        </>
      )
      break
    case 'poster':
    default:
      body = (
        <>
          <rect width="400" height="300" fill={bg} />
          <circle cx={r.range(220, 340)} cy={r.range(80, 160)} r={r.range(80, 120)} fill={pal[0]} />
          <rect x={r.range(-20, 60)} y={r.range(140, 200)} width={r.range(160, 240)} height="140" rx="70" fill={pal[1]} opacity="0.95" />
          <path d={`M ${r.range(240, 300)} 300 L 400 ${r.range(150, 220)} L 400 300 Z`} fill={pal[2]} />
          <text x="24" y="70" fontSize="54" fontWeight="700" letterSpacing="-2" fill={fg} fontFamily="Geist Variable, sans-serif">
            {word}
          </text>
          <text x="26" y="94" fontSize="12" fill={fg} opacity="0.75" fontFamily="Geist Variable, sans-serif">
            {r.pick(SUB)}
          </text>
          <text x="376" y="284" textAnchor="end" fontSize="10" fill={fg} opacity="0.7" fontFamily="Geist Mono Variable, monospace">
            N°{r.int(10, 99)}
          </text>
        </>
      )
  }

  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={title ?? `${word} artwork`}>
      {common}
      {body}
      <rect width="400" height="300" filter={`url(#${uid}-grain)`} opacity="0.9" />
    </svg>
  )
})

function mountain(r: ReturnType<typeof prng>, baseY: number, amp: number) {
  let d = `M0 300 L0 ${baseY}`
  const steps = 8
  for (let i = 1; i <= steps; i++) {
    const x = (400 / steps) * i
    const y = baseY - r.range(0, amp) + (i % 2 ? amp * 0.3 : 0)
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d + ' L400 300 Z'
}

function isLight(hex: string) {
  const h = hex.replace('#', '')
  if (h.length < 6) return true
  const n = parseInt(h.slice(0, 6), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 160
}

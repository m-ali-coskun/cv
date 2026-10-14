import {
  Box,
  Clapperboard,
  Layers3,
  LayoutGrid,
  MonitorSmartphone,
  PenTool,
  Sparkles,
  Stamp,
  type LucideIcon,
} from 'lucide-react'
import type { DisciplineFilter, DisciplineId } from '@/store/types'

/**
 * Each discipline re-themes the app. Colours are inspired by the creative app
 * each discipline lives in (Photoshop blue, Premiere violet, After Effects
 * purple, Illustrator orange, InDesign pink, XD magenta, Substance teal).
 *
 *  accent      – main brand colour for buttons, highlights, charts
 *  ink         – readable text colour on top of `accent`
 *  deep        – the very dark "app icon background" tone, used for dark cards
 *  glow        – soft colour used by the animated background blobs
 *  glow2       – secondary blob colour
 */
export interface DisciplineTheme {
  id: DisciplineFilter
  /** i18n key under `core.discipline.*` */
  labelKey: string
  /** Two-letter code shown in the app-icon style badge, like Ps / Ai. */
  code: string
  /** Name of the tool family it is inspired by (not translated). */
  inspiredBy: string
  icon: LucideIcon
  accent: string
  ink: string
  deep: string
  glow: string
  glow2: string
}

export const DISCIPLINES: Record<DisciplineFilter, DisciplineTheme> = {
  all: {
    id: 'all',
    labelKey: 'core.discipline.all',
    code: 'dT',
    inspiredBy: 'designTab',
    icon: LayoutGrid,
    accent: '#C9F158',
    ink: '#0B0B0C',
    deep: '#121410',
    glow: '#D9F99D',
    glow2: '#A7F3D0',
  },
  visual: {
    id: 'visual',
    labelKey: 'core.discipline.visual',
    code: 'Vi',
    inspiredBy: 'Photoshop',
    icon: Layers3,
    accent: '#31A8FF',
    ink: '#001E36',
    deep: '#001E36',
    glow: '#7CC8FF',
    glow2: '#B4E0FF',
  },
  video: {
    id: 'video',
    labelKey: 'core.discipline.video',
    code: 'Vd',
    inspiredBy: 'Premiere Pro',
    icon: Clapperboard,
    accent: '#9999FF',
    ink: '#00005B',
    deep: '#00005B',
    glow: '#B8B8FF',
    glow2: '#D6D6FF',
  },
  motion: {
    id: 'motion',
    labelKey: 'core.discipline.motion',
    code: 'Mo',
    inspiredBy: 'After Effects',
    icon: Sparkles,
    accent: '#CF96FD',
    ink: '#2A0A47',
    deep: '#1B0533',
    glow: '#E2BCFF',
    glow2: '#F3D9FF',
  },
  illustration: {
    id: 'illustration',
    labelKey: 'core.discipline.illustration',
    code: 'Il',
    inspiredBy: 'Illustrator',
    icon: PenTool,
    accent: '#FF9A00',
    ink: '#330000',
    deep: '#330000',
    glow: '#FFC266',
    glow2: '#FFE0A8',
  },
  brand: {
    id: 'brand',
    labelKey: 'core.discipline.brand',
    code: 'Br',
    inspiredBy: 'InDesign',
    icon: Stamp,
    accent: '#FF3366',
    ink: '#49021F',
    deep: '#49021F',
    glow: '#FF8FAB',
    glow2: '#FFC2D1',
  },
  uiux: {
    id: 'uiux',
    labelKey: 'core.discipline.uiux',
    code: 'Ux',
    inspiredBy: 'XD',
    icon: MonitorSmartphone,
    accent: '#FF61F6',
    ink: '#470137',
    deep: '#470137',
    glow: '#FFA3FA',
    glow2: '#FFD1FC',
  },
  '3d': {
    id: '3d',
    labelKey: 'core.discipline.3d',
    code: '3D',
    inspiredBy: 'Substance 3D',
    icon: Box,
    accent: '#2EE6C5',
    ink: '#01332B',
    deep: '#01261F',
    glow: '#86F5E1',
    glow2: '#C2FBF0',
  },
}

export const DISCIPLINE_LIST: DisciplineTheme[] = Object.values(DISCIPLINES)
export const DISCIPLINE_ONLY: DisciplineTheme[] = DISCIPLINE_LIST.filter((d) => d.id !== 'all')

export function disciplineTheme(id: DisciplineFilter | undefined | null): DisciplineTheme {
  return DISCIPLINES[id ?? 'all'] ?? DISCIPLINES.all
}

/** Colour of a discipline, handy for chips/dots that should NOT follow the global accent. */
export function disciplineColor(id: DisciplineId | DisciplineFilter): string {
  return disciplineTheme(id).accent
}

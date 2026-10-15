import { Bell, Briefcase, Info, Languages, Palette, ShieldCheck, SwatchBook, type LucideIcon } from 'lucide-react'

export const SECTION_IDS = ['appearance', 'themes', 'language', 'notifications', 'workspace', 'data', 'about'] as const
export type SectionId = (typeof SECTION_IDS)[number]

export const SECTIONS: { id: SectionId; icon: LucideIcon; color: string }[] = [
  { id: 'appearance', icon: Palette, color: '#3E8EF7' },
  { id: 'themes', icon: SwatchBook, color: '#FF61F6' },
  { id: 'language', icon: Languages, color: '#2EE6C5' },
  { id: 'notifications', icon: Bell, color: '#FF9A00' },
  { id: 'workspace', icon: Briefcase, color: '#9999FF' },
  { id: 'data', icon: ShieldCheck, color: '#2FB36B' },
  { id: 'about', icon: Info, color: '#8B8B93' },
]

export const isSection = (v: string | null | undefined): v is SectionId => !!v && (SECTION_IDS as readonly string[]).includes(v)

/**
 * Searchable settings. `labelKey` is the row title; `kw` are extra English
 * keywords (the translated label is searched too).
 */
export const SEARCH_INDEX: { section: SectionId; anchor: string; labelKey: string; kw: string }[] = [
  { section: 'appearance', anchor: 'theme', labelKey: 'settings.appearance.theme', kw: 'dark light system mode night' },
  { section: 'appearance', anchor: 'glass', labelKey: 'settings.appearance.glass', kw: 'blur transparency frosted clear solid liquid' },
  { section: 'appearance', anchor: 'motion', labelKey: 'settings.appearance.motion', kw: 'animation reduce motion expressive subtle off' },
  { section: 'appearance', anchor: 'background', labelKey: 'settings.appearance.background', kw: 'animated background blobs' },
  { section: 'appearance', anchor: 'density', labelKey: 'settings.appearance.density', kw: 'compact dense spacing' },
  { section: 'appearance', anchor: 'specular', labelKey: 'settings.appearance.specular', kw: 'refraction highlight shine sheen' },
  { section: 'themes', anchor: 'mode', labelKey: 'settings.themes.modeTitle', kw: 'accent colour color follow discipline fixed' },
  { section: 'themes', anchor: 'gallery', labelKey: 'settings.themes.gallery', kw: 'photoshop premiere after effects illustrator indesign xd substance palette color' },
  { section: 'language', anchor: 'lang', labelKey: 'settings.language.title', kw: 'english deutsch german türkçe turkish' },
  { section: 'language', anchor: 'currency', labelKey: 'settings.language.currency', kw: 'eur usd euro dollar money' },
  { section: 'language', anchor: 'week', labelKey: 'settings.language.week', kw: 'monday sunday calendar first day' },
  { section: 'notifications', anchor: 'push', labelKey: 'settings.notifications.push', kw: 'toast popup alerts' },
  { section: 'notifications', anchor: 'email', labelKey: 'settings.notifications.email', kw: 'mail digest' },
  { section: 'notifications', anchor: 'sound', labelKey: 'settings.notifications.sound', kw: 'audio chime' },
  { section: 'notifications', anchor: 'dnd', labelKey: 'settings.notifications.dnd', kw: 'do not disturb quiet focus mute' },
  { section: 'notifications', anchor: 'kinds', labelKey: 'settings.notifications.kinds', kw: 'categories matches messages jobs payments ai' },
  { section: 'workspace', anchor: 'role', labelKey: 'settings.workspace.role', kw: 'client designer switch studio' },
  { section: 'workspace', anchor: 'tour', labelKey: 'settings.workspace.tour', kw: 'welcome onboarding intro help' },
  { section: 'workspace', anchor: 'ai', labelKey: 'settings.workspace.ai', kw: 'assistant risk insights' },
  { section: 'workspace', anchor: 'sidebar', labelKey: 'settings.workspace.sidebar', kw: 'collapse navigation menu' },
  { section: 'workspace', anchor: 'demo', labelKey: 'settings.workspace.demo', kw: 'simulate request test notification match' },
  { section: 'data', anchor: 'storage', labelKey: 'settings.data.storage', kw: 'space quota indexeddb localstorage' },
  { section: 'data', anchor: 'export', labelKey: 'settings.data.export', kw: 'backup download json' },
  { section: 'data', anchor: 'import', labelKey: 'settings.data.import', kw: 'restore upload json' },
  { section: 'data', anchor: 'reset', labelKey: 'settings.data.reset', kw: 'delete wipe demo fresh' },
  { section: 'about', anchor: 'version', labelKey: 'settings.about.version', kw: 'version release' },
  { section: 'about', anchor: 'stack', labelKey: 'settings.about.stack', kw: 'react typescript vite tailwind' },
  { section: 'about', anchor: 'shortcuts', labelKey: 'settings.about.shortcuts', kw: 'keyboard hotkeys cmd k' },
]

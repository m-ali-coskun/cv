import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Compass,
  CreditCard,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  MessagesSquare,
  PenLine,
  Settings,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/store/types'

export type CountKey = 'activeJobs' | 'requests' | 'unread' | 'newProfiles' | 'matches' | 'dueInvoices'

export interface NavItem {
  path: string
  labelKey: string
  icon: LucideIcon
  section: 'main' | 'work' | 'network' | 'workspace'
  count?: CountKey
  /** Show on the mobile bottom bar (max 4 + "More"). */
  mobile?: boolean
}

export const NAV: Record<Role, NavItem[]> = {
  client: [
    { path: '/overview', labelKey: 'core.nav.overview', icon: LayoutDashboard, section: 'main', mobile: true },
    { path: '/jobs', labelKey: 'core.nav.jobs', icon: Briefcase, section: 'work', count: 'activeJobs', mobile: true },
    { path: '/brief/new', labelKey: 'core.nav.newBrief', icon: PenLine, section: 'work' },
    { path: '/messages', labelKey: 'core.nav.messages', icon: MessagesSquare, section: 'work', count: 'unread', mobile: true },
    { path: '/calendar', labelKey: 'core.nav.calendar', icon: CalendarDays, section: 'work' },
    { path: '/files', labelKey: 'core.nav.files', icon: FolderOpen, section: 'work' },
    { path: '/discover', labelKey: 'core.nav.discover', icon: Compass, section: 'network', count: 'newProfiles', mobile: true },
    { path: '/network', labelKey: 'core.nav.designers', icon: Users, section: 'network', count: 'matches' },
    { path: '/payments', labelKey: 'core.nav.payments', icon: CreditCard, section: 'workspace', count: 'dueInvoices' },
    { path: '/analytics', labelKey: 'core.nav.analytics', icon: BarChart3, section: 'workspace' },
    { path: '/profile', labelKey: 'core.nav.profile', icon: UserRound, section: 'workspace' },
    { path: '/settings', labelKey: 'core.nav.settings', icon: Settings, section: 'workspace' },
  ],
  designer: [
    { path: '/overview', labelKey: 'core.nav.overview', icon: LayoutDashboard, section: 'main', mobile: true },
    { path: '/requests', labelKey: 'core.nav.requests', icon: Inbox, section: 'work', count: 'requests', mobile: true },
    { path: '/jobs', labelKey: 'core.nav.jobs', icon: Briefcase, section: 'work', count: 'activeJobs', mobile: true },
    { path: '/messages', labelKey: 'core.nav.messages', icon: MessagesSquare, section: 'work', count: 'unread', mobile: true },
    { path: '/calendar', labelKey: 'core.nav.calendar', icon: CalendarDays, section: 'work' },
    { path: '/files', labelKey: 'core.nav.files', icon: FolderOpen, section: 'work' },
    { path: '/discover', labelKey: 'core.nav.discover', icon: Compass, section: 'network', count: 'newProfiles' },
    { path: '/network', labelKey: 'core.nav.clients', icon: Users, section: 'network', count: 'matches' },
    { path: '/profile', labelKey: 'core.nav.profile', icon: UserRound, section: 'network' },
    { path: '/payments', labelKey: 'core.nav.earnings', icon: Wallet, section: 'workspace', count: 'dueInvoices' },
    { path: '/analytics', labelKey: 'core.nav.analytics', icon: BarChart3, section: 'workspace' },
    { path: '/settings', labelKey: 'core.nav.settings', icon: Settings, section: 'workspace' },
  ],
}

export const SECTION_LABEL: Record<NavItem['section'], string | null> = {
  main: null,
  work: 'core.nav.section.work',
  network: 'core.nav.section.network',
  workspace: 'core.nav.section.workspace',
}

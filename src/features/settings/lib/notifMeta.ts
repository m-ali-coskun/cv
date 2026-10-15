import {
  Activity,
  BadgeCheck,
  Bell,
  CheckCircle2,
  Clock,
  Heart,
  HeartHandshake,
  Inbox,
  Megaphone,
  MessageCircle,
  PackageCheck,
  RotateCcw,
  Sparkles,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { NotificationKind } from '@/store/types'

/**
 * Notification kinds are grouped into six user-facing categories. Groups drive
 * the filter chips in the panel and the per-category toggles in Settings.
 */
export const NOTIF_GROUPS = ['matches', 'messages', 'jobs', 'payments', 'ai', 'system'] as const
export type NotifGroup = (typeof NOTIF_GROUPS)[number]

export const KIND_GROUP: Record<NotificationKind, NotifGroup> = {
  match: 'matches',
  like: 'matches',
  message: 'messages',
  job_request: 'jobs',
  job_accepted: 'jobs',
  job_declined: 'jobs',
  status: 'jobs',
  delivery: 'jobs',
  revision: 'jobs',
  approved: 'jobs',
  deadline: 'jobs',
  payment: 'payments',
  ai: 'ai',
  system: 'system',
}

export const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  match: HeartHandshake,
  like: Heart,
  message: MessageCircle,
  job_request: Inbox,
  job_accepted: CheckCircle2,
  job_declined: XCircle,
  status: Activity,
  delivery: PackageCheck,
  revision: RotateCcw,
  approved: BadgeCheck,
  deadline: Clock,
  payment: Wallet,
  ai: Sparkles,
  system: Megaphone,
}

/** Fixed hues (they must stay recognisable whatever the discipline theme is). */
export const KIND_COLOR: Record<NotificationKind, string> = {
  match: '#FF3B6B',
  like: '#FF6B9A',
  message: '#3E8EF7',
  job_request: '#8B5CF6',
  job_accepted: '#2FB36B',
  job_declined: '#8B8B93',
  status: '#F5A524',
  delivery: '#14B8A6',
  revision: '#F97316',
  approved: '#2FB36B',
  deadline: '#E5484D',
  payment: '#22A06B',
  ai: '#9B6BFF',
  system: '#64748B',
}

export const GROUP_META: Record<NotifGroup, { icon: LucideIcon; color: string }> = {
  matches: { icon: HeartHandshake, color: '#FF3B6B' },
  messages: { icon: MessageCircle, color: '#3E8EF7' },
  jobs: { icon: Activity, color: '#F5A524' },
  payments: { icon: Wallet, color: '#22A06B' },
  ai: { icon: Sparkles, color: '#9B6BFF' },
  system: { icon: Bell, color: '#64748B' },
}

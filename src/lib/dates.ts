import {
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
} from 'date-fns'
import { de, enUS, tr } from 'date-fns/locale'
import type { Lang } from '@/store/types'

export const DATE_LOCALES = { en: enUS, de, tr }

export const now = () => new Date()
export const iso = (d: Date = new Date()) => d.toISOString()

/** Date offset from now: addTime({ days: 2, hours: -3 }) */
export function fromNow({ days = 0, hours = 0, minutes = 0 }: { days?: number; hours?: number; minutes?: number }) {
  return new Date(Date.now() + ((days * 24 + hours) * 60 + minutes) * 60_000).toISOString()
}

export function fmt(date: string | Date, pattern: string, lang: Lang = 'en') {
  return format(new Date(date), pattern, { locale: DATE_LOCALES[lang] })
}

/** "Oct 2" style short date */
export function shortDate(date: string | Date, lang: Lang = 'en') {
  return fmt(date, lang === 'en' ? 'MMM d' : 'd. MMM', lang)
}

export function timeAgo(date: string | Date, lang: Lang = 'en') {
  const d = new Date(date)
  if (Math.abs(differenceInMinutes(new Date(), d)) < 1) {
    return { en: 'just now', de: 'gerade eben', tr: 'az önce' }[lang]
  }
  return formatDistanceToNowStrict(d, { addSuffix: true, locale: DATE_LOCALES[lang] })
}

/** Chat-list style timestamp: "14:32", "Yesterday", "Mon", "Oct 2" */
export function chatTime(date: string | Date, lang: Lang = 'en') {
  const d = new Date(date)
  if (isToday(d)) return fmt(d, 'HH:mm', lang)
  if (isYesterday(d)) return { en: 'Yesterday', de: 'Gestern', tr: 'Dün' }[lang]
  if (Math.abs(differenceInCalendarDays(new Date(), d)) < 7) return fmt(d, 'EEE', lang)
  return shortDate(d, lang)
}

export function daysUntil(date: string | Date) {
  return differenceInCalendarDays(new Date(date), new Date())
}

export function hoursUntil(date: string | Date) {
  return differenceInHours(new Date(date), new Date())
}

/** "Due today", "Due tomorrow", "3 days left", "2 days overdue" */
export function dueLabel(date: string | Date, lang: Lang = 'en') {
  const d = new Date(date)
  const days = daysUntil(d)
  const L = {
    en: { today: 'Due today', tomorrow: 'Due tomorrow', left: (n: number) => `${n} days left`, over: (n: number) => `${n}d overdue` },
    de: { today: 'Heute fällig', tomorrow: 'Morgen fällig', left: (n: number) => `Noch ${n} Tage`, over: (n: number) => `${n} T. überfällig` },
    tr: { today: 'Bugün teslim', tomorrow: 'Yarın teslim', left: (n: number) => `${n} gün kaldı`, over: (n: number) => `${n} gün gecikti` },
  }[lang]
  if (isToday(d)) return L.today
  if (isTomorrow(d)) return L.tomorrow
  if (days > 0) return L.left(days)
  return L.over(Math.abs(days))
}

export function greetingKey(date = new Date()): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = date.getHours()
  if (h < 5) return 'night'
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Bell, CheckCircle2, ImagePlus, Menu as MenuIcon, Moon, Plus, Search, Sun } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { greetingKey } from '@/lib/dates'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useAttentionJobs, useMyNotifications } from '@/store/selectors'
import { useUI } from '@/store/ui'
import { ME_NAME } from '@/store/types'
import { useIsDark } from '@/theme/ThemeProvider'
import { Button, IconButton } from '../ui/Button'
import { Kbd } from '../ui/Badge'
import { LanguageSwitcher } from './LanguageSwitcher'
import { LogoMark } from './Logo'

const TITLES: [prefix: string, key: string, designerKey?: string][] = [
  ['/jobs', 'core.nav.jobs'],
  ['/requests', 'core.nav.requests'],
  ['/brief', 'core.nav.newBrief'],
  ['/messages', 'core.nav.messages'],
  ['/calendar', 'core.nav.calendar'],
  ['/files', 'core.nav.files'],
  ['/discover', 'core.nav.discover'],
  ['/network', 'core.nav.designers', 'core.nav.clients'],
  ['/payments', 'core.nav.payments', 'core.nav.earnings'],
  ['/analytics', 'core.nav.analytics'],
  ['/profile', 'core.nav.profile'],
  ['/join', 'core.nav.join'],
  ['/settings', 'core.nav.settings'],
  ['/kit', 'core.nav.kit'],
]

/** Animated per-letter greeting: "Good morning, Ali" */
function Greeting({ className }: { className?: string }) {
  const t = useT()
  const text = t(`core.greeting.${greetingKey()}`, { name: ME_NAME })
  return (
    <motion.h1 key={text} className={cn('truncate text-[26px] font-medium tracking-[-0.035em] text-ink sm:text-[32px]', className)} aria-label={text}>
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.015 * i, duration: 0.5, ease: EASE_OUT }}
        >
          {ch}
        </motion.span>
      ))}
    </motion.h1>
  )
}

export function Topbar() {
  const t = useT()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const role = useApp((s) => s.settings.role)
  const setSettings = useApp((s) => s.setSettings)
  const dark = useIsDark()
  const ui = useUI()
  const attention = useAttentionJobs()
  const notifications = useMyNotifications()
  const unread = notifications.filter((n) => !n.read).length
  const isOverview = pathname === '/overview' || pathname === '/'
  const entry = TITLES.find(([p]) => pathname.startsWith(p))
  const title = entry ? t(role === 'designer' && entry[2] ? entry[2] : entry[1]) : ''

  return (
    <header className="relative z-30 flex items-center gap-3">
      {/* mobile: menu + logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <IconButton label={t('core.mobile.menu')} onClick={() => ui.set({ mobileNavOpen: true })}>
          <MenuIcon className="relative z-[1] size-5" />
        </IconButton>
        <LogoMark size={36} />
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="hidden min-w-0 items-center gap-3 sm:flex">
          {isOverview ? (
            // Per-letter inline-blocks: any fractional flex shrink would ellipsize the whole name,
            // so the greeting keeps its width and the attention pill (shrink-[20]) gives way first.
            <Greeting className="max-w-full shrink-0 md:max-w-[calc(100%-60px)]" />
          ) : (
            <motion.h1
              key={title}
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              className="truncate text-[26px] font-medium tracking-[-0.035em] sm:text-[32px]"
            >
              {title}
            </motion.h1>
          )}
          <AnimatePresence mode="popLayout">
            {isOverview && (
              <motion.button
                key={attention.length ? 'warn' : 'ok'}
                type="button"
                initial={{ opacity: 0, scale: 0.6, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0, transition: { type: 'spring', stiffness: 400, damping: 18, delay: 0.5 } }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => document.getElementById('attention')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                title={attention.length ? t('core.topbar.attention', { count: attention.length }) : t('core.topbar.allClear')}
                // shrinks (and truncates) before the greeting does, so the name always stays visible
                className="glass-accent hidden h-9 min-w-0 shrink-[20] items-center gap-2 rounded-full px-3.5 text-[13.5px] font-medium md:inline-flex"
              >
                {attention.length ? <AlertTriangle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
                <span className="truncate">{attention.length ? t('core.topbar.attention', { count: attention.length }) : t('core.topbar.allClear')}</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => ui.set({ paletteOpen: true })}
          className="glass glass-pill hidden h-12 w-[260px] items-center gap-2.5 pl-4 pr-1.5 text-left text-[14px] text-ink-3 transition-shadow hover:shadow-[0_0_0_4px_var(--accent-softer)] xl:flex"
        >
          <Search className="relative z-[1] size-[18px]" />
          <span className="relative z-[1] flex-1 truncate">{t('core.topbar.search')}</span>
          <Kbd className="relative z-[1] h-8 rounded-full px-2.5">⌘K</Kbd>
        </button>
        <IconButton label={t('core.action.search')} className="xl:hidden" onClick={() => ui.set({ paletteOpen: true })}>
          <Search className="relative z-[1] size-[18px]" />
        </IconButton>
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
        <IconButton
          label={t('core.topbar.theme')}
          className="hidden size-12 sm:inline-flex"
          onClick={() => setSettings({ theme: dark ? 'light' : 'dark' })}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={dark ? 'moon' : 'sun'}
              className="relative z-[1]"
              initial={{ rotate: -90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
              {dark ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
            </motion.span>
          </AnimatePresence>
        </IconButton>
        <IconButton
          label={t('core.topbar.notifications')}
          className="size-10 sm:size-12"
          badge={unread > 0}
          onClick={() => ui.set({ notificationsOpen: true })}
        >
          <motion.span
            className="relative z-[1]"
            key={unread}
            animate={unread ? { rotate: [0, -18, 16, -10, 6, 0] } : {}}
            transition={{ duration: 0.8 }}
          >
            <Bell className="size-[18px]" />
          </motion.span>
        </IconButton>
        {role === 'client' ? (
          <Button className={cn('hidden h-12 px-5 sm:inline-flex')} icon={<Plus className="size-[18px]" />} onClick={() => navigate('/brief/new')}>
            <span className="hidden md:inline">{t('core.topbar.newBrief')}</span>
          </Button>
        ) : (
          <Button className="hidden h-12 px-5 sm:inline-flex" icon={<ImagePlus className="size-[18px]" />} onClick={() => navigate('/profile?add=1')}>
            <span className="hidden md:inline">{t('profile.addWork')}</span>
          </Button>
        )}
      </div>
    </header>
  )
}

/** Title row shown under the top bar on phones (where the header is compact). */
export function MobileTitle() {
  const { pathname } = useLocation()
  const isOverview = pathname === '/overview' || pathname === '/'
  const t = useT()
  const role = useApp((s) => s.settings.role)
  const entry = TITLES.find(([p]) => pathname.startsWith(p))
  const title = entry ? t(role === 'designer' && entry[2] ? entry[2] : entry[1]) : ''
  return (
    <div className="sm:hidden">
      {isOverview ? (
        <Greeting />
      ) : (
        <motion.h1 key={title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-[26px] font-medium tracking-[-0.035em]">
          {title}
        </motion.h1>
      )}
    </div>
  )
}

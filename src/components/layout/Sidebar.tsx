import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftRight, Check, ChevronRight, ChevronsUpDown, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useAttentionJobs, useMe, useMyJobs } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { Role } from '@/store/types'
import { Avatar } from '../ui/Avatar'
import { CountBadge } from '../ui/Badge'
import { Toggle } from '../ui/Toggle'
import { Menu } from '../ui/Menu'
import { Logo, LogoMark } from './Logo'
import { NAV, SECTION_LABEL, type NavItem } from './nav'
import { useNavCounts } from './useNavCounts'

export function Sidebar({ collapsed = false, onNavigate, mobile = false }: { collapsed?: boolean; onNavigate?: () => void; mobile?: boolean }) {
  const t = useT()
  const role = useApp((s) => s.settings.role)
  const setSettings = useApp((s) => s.setSettings)
  const counts = useNavCounts()
  const items = NAV[role]
  const sections = ['main', 'work', 'network', 'workspace'] as const

  return (
    <aside
      className={cn(
        'card flex h-full flex-col gap-1 overflow-hidden p-3 transition-[width] duration-500 [transition-timing-function:var(--ease-ios)]',
        mobile ? 'w-full rounded-none border-0 bg-transparent shadow-none backdrop-blur-none' : collapsed ? 'w-[84px]' : 'w-[264px]',
      )}
    >
      {/* Brand row */}
      <div className={cn('relative z-[1] flex items-center px-1.5 pb-2 pt-1', collapsed ? 'justify-center' : 'justify-between')}>
        {collapsed ? <LogoMark /> : <Logo />}
        {!mobile && !collapsed && (
          <button
            type="button"
            onClick={() => setSettings({ sidebarCollapsed: true })}
            className="flex size-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-3 transition-colors hover:text-ink"
            aria-label={t('core.nav.collapse')}
            title={t('core.nav.collapse')}
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>
      {!mobile && collapsed && (
        <button
          type="button"
          onClick={() => setSettings({ sidebarCollapsed: false })}
          className="relative z-[1] mx-auto mb-1 flex size-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-3 hover:text-ink"
          aria-label={t('core.nav.expand')}
          title={t('core.nav.expand')}
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      <WorkspaceSwitcher collapsed={collapsed} />

      <nav className="relative z-[1] -mx-1 mt-1 flex-1 overflow-y-auto overflow-x-hidden px-1 no-scrollbar">
        {sections.map((sec) => {
          const secItems = items.filter((i) => i.section === sec)
          if (!secItems.length) return null
          const label = SECTION_LABEL[sec]
          return (
            <div key={sec} className="mb-1">
              {label && !collapsed && (
                <div className="px-3 pb-1.5 pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{t(label)}</div>
              )}
              {label && collapsed && <div className="mx-auto my-3 h-px w-8 bg-[var(--line)]" />}
              <ul className="space-y-0.5">
                {secItems.map((item) => (
                  <li key={item.path}>
                    <SideLink item={item} collapsed={collapsed} count={item.count ? counts[item.count] : undefined} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      <AiCard collapsed={collapsed} onNavigate={onNavigate} />
    </aside>
  )
}

function SideLink({ item, collapsed, count, onNavigate }: { item: NavItem; collapsed: boolean; count?: number; onNavigate?: () => void }) {
  const t = useT()
  const { pathname } = useLocation()
  const active = pathname === item.path || (item.path !== '/overview' && pathname.startsWith(item.path + '/')) || (item.path === '/brief/new' && pathname.startsWith('/brief'))
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      title={collapsed ? t(item.labelKey) : undefined}
      className={cn(
        'group relative flex h-11 items-center gap-3 rounded-full text-[14.5px] transition-colors duration-200',
        collapsed ? 'justify-center px-0' : 'px-3.5',
        active ? 'text-[var(--surface)] dark:text-accent-ink' : 'text-ink-2 hover:text-ink',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-full bg-ink shadow-[0_8px_20px_-10px_rgba(0,0,0,.6)] dark:bg-accent"
          transition={spring.pill}
        />
      )}
      {!active && <span className="absolute inset-0 rounded-full bg-[var(--surface-2)] opacity-0 transition-opacity group-hover:opacity-100" />}
      <motion.span className="relative z-[1]" whileHover={{ rotate: -10, scale: 1.12 }} transition={spring.bouncy}>
        <Icon className="size-[19px]" strokeWidth={1.7} />
      </motion.span>
      {!collapsed && <span className="relative z-[1] flex-1 truncate">{t(item.labelKey)}</span>}
      {!collapsed && count !== undefined && count > 0 && (
        <CountBadge active={active} className="relative z-[1]">
          {count}
        </CountBadge>
      )}
      {collapsed && count !== undefined && count > 0 && (
        <span className="absolute right-2 top-1.5 z-[2] size-2 rounded-full bg-[#ff6b3d] ring-2 ring-[var(--surface)]" />
      )}
    </NavLink>
  )
}

/** Like "Sunridge Solar · Austin, TX" — here it switches between Client and Designer workspaces. */
function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const t = useT()
  const me = useMe()
  const setRole = useApp((s) => s.setRole)
  const navigate = useNavigate()
  const title = me.role === 'client' ? (me.client?.name ?? 'Northlight Studio') : `${me.designer?.name ?? 'Ali'} — ${t('core.role.designer')}`
  const sub = me.role === 'client' ? t('core.role.clientWorkspace') : t('core.role.designerStudio')

  const switchTo = (role: Role) => {
    if (role === me.role) return
    setRole(role)
    navigate('/overview')
    toast({ title: t('core.role.switchedTo', { role: t(`core.role.${role}`) }), tone: 'success' })
  }

  return (
    <Menu
      align="start"
      width={260}
      trigger={({ onClick, open }) => (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'relative z-[1] flex w-full items-center gap-3 rounded-[20px] bg-[var(--surface-2)] p-2 text-left transition-colors hover:bg-[var(--surface-3)]',
            collapsed && 'justify-center p-1.5',
            open && 'bg-[var(--surface-3)]',
          )}
          aria-label={t('core.role.switch')}
        >
          <span className="relative">
            {me.role === 'client' ? (
              <Avatar seed="northlight" kind="brand" name={me.client?.name ?? 'Northlight'} color="#0B0B0C" size={38} />
            ) : (
              <Avatar seed={me.designer?.avatarSeed ?? 'ali'} media={me.designer?.avatar} size={38} />
            )}
            <motion.span
              key={me.role}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-accent text-accent-ink ring-2 ring-[var(--surface-2)]"
            >
              <ArrowLeftRight className="size-2.5" />
            </motion.span>
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{title}</span>
                <span className="block truncate text-[12px] text-ink-3">{sub}</span>
              </span>
              <ChevronsUpDown className="size-4 text-ink-3" />
            </>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="p-1">
          <p className="px-2.5 pb-2 pt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{t('core.role.switch')}</p>
          {(['client', 'designer'] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                switchTo(r)
                close()
              }}
              className={cn('flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-[var(--surface-2)]', me.role === r && 'bg-[var(--surface-2)]')}
            >
              {r === 'client' ? (
                <Avatar seed="northlight" kind="brand" name={me.client?.name ?? 'Northlight'} color="#0B0B0C" size={34} />
              ) : (
                <Avatar seed={me.designer?.avatarSeed ?? 'ali'} media={me.designer?.avatar} size={34} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{r === 'client' ? (me.client?.name ?? 'Northlight Studio') : 'Ali'}</span>
                <span className="block text-[12px] text-ink-3">{r === 'client' ? t('core.role.clientWorkspace') : t('core.role.designerStudio')}</span>
              </span>
              {me.role === r && <Check className="size-4 text-accent-text" />}
            </button>
          ))}
        </div>
      )}
    </Menu>
  )
}

/** Bottom card: "designTab AI — On · 128 projects — 7 need attention ›" */
function AiCard({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const t = useT()
  const enabled = useApp((s) => s.settings.aiAssistant)
  const setSettings = useApp((s) => s.setSettings)
  const jobs = useMyJobs({ ignoreDiscipline: true })
  const attention = useAttentionJobs()
  const navigate = useNavigate()
  const active = jobs.filter((j) => !['approved', 'declined', 'cancelled'].includes(j.status)).length

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setSettings({ aiAssistant: !enabled })}
        className={cn('relative z-[1] mx-auto mt-2 flex size-12 items-center justify-center rounded-2xl', enabled ? 'glass-accent' : 'bg-[var(--surface-2)] text-ink-3')}
        aria-label={t('core.ai.name')}
      >
        <Sparkles className="size-5" />
      </button>
    )
  }
  return (
    <motion.div layout className="glass-accent relative z-[1] mt-2 overflow-hidden rounded-[24px] p-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-[var(--accent-ink)] text-accent">
          <motion.span animate={enabled ? { rotate: [0, 15, -10, 0], scale: [1, 1.15, 1] } : {}} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.5 }}>
            <Sparkles className="size-4" />
          </motion.span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium leading-tight">{t('core.ai.name')}</p>
          <p className="truncate text-[12px] opacity-75">{enabled ? t('core.ai.on', { count: active }) : t('core.ai.off')}</p>
        </div>
        <Toggle checked={enabled} onChange={(v) => setSettings({ aiAssistant: v })} size="sm" label={t('core.ai.name')} />
      </div>
      <AnimatePresence initial={false}>
        {enabled && (
          <motion.button
            type="button"
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 36, opacity: 1, marginTop: 10 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            onClick={() => {
              navigate('/overview#attention')
              onNavigate?.()
            }}
            className="flex w-full items-center justify-between rounded-full bg-[var(--surface)] px-3.5 text-[13px] font-medium text-ink"
          >
            {attention.length ? t('core.topbar.attention', { count: attention.length }) : t('core.topbar.allClear')}
            <ChevronRight className="size-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

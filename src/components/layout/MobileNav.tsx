import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useUI } from '@/store/ui'
import { Drawer } from '../ui/Overlay'
import { NAV } from './nav'
import { Sidebar } from './Sidebar'
import { useNavCounts } from './useNavCounts'
import { LanguageSwitcher } from './LanguageSwitcher'

/** Floating liquid-glass tab bar for phones/tablets. */
export function MobileTabBar() {
  const t = useT()
  const role = useApp((s) => s.settings.role)
  const { pathname } = useLocation()
  const counts = useNavCounts()
  const setUI = useUI((s) => s.set)
  const items = NAV[role].filter((i) => i.mobile).slice(0, 4)
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden safe-bottom">
      <div className="glass glass-strong glass-pill mx-auto flex max-w-md items-center justify-between p-1.5">
        {items.map((it) => {
          const active = pathname === it.path || pathname.startsWith(it.path + '/')
          const Icon = it.icon
          const count = it.count ? counts[it.count] : 0
          return (
            <NavLink key={it.path} to={it.path} className="relative z-[1] flex h-13 flex-1 flex-col items-center justify-center gap-0.5 rounded-full">
              {active && <motion.span layoutId="tabbar-pill" className="absolute inset-0 rounded-full bg-ink dark:bg-accent" transition={spring.pill} />}
              <span className={cn('relative z-[1] flex flex-col items-center gap-0.5', active ? 'text-[var(--surface)] dark:text-accent-ink' : 'text-ink-2')}>
                <motion.span animate={active ? { y: [0, -3, 0] } : {}} transition={{ duration: 0.4 }} className="relative">
                  <Icon className="size-5" strokeWidth={1.8} />
                  {count > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff6b3d] px-1 text-[9.5px] font-semibold text-white">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </motion.span>
                <span className="text-[10.5px] font-medium leading-none">{t(it.labelKey)}</span>
              </span>
            </NavLink>
          )
        })}
        <button
          type="button"
          onClick={() => setUI({ mobileNavOpen: true })}
          className="relative z-[1] flex h-13 flex-1 flex-col items-center justify-center gap-0.5 text-ink-2"
        >
          <MoreHorizontal className="size-5" />
          <span className="text-[10.5px] font-medium leading-none">{t('core.nav.more')}</span>
        </button>
      </div>
    </nav>
  )
}

/** Full navigation in a sheet (phones). */
export function MobileNavDrawer() {
  const open = useUI((s) => s.mobileNavOpen)
  const setUI = useUI((s) => s.set)
  const close = () => setUI({ mobileNavOpen: false })
  return (
    <Drawer open={open} onClose={close} side="left" width={320} header={<div className="flex justify-end px-3 pt-3"><LanguageSwitcher compact /></div>}>
      <Sidebar mobile onNavigate={close} />
    </Drawer>
  )
}

import { Check, Languages } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { LANGUAGES, useT } from '@/i18n'
import { useApp } from '@/store'
import { Menu } from '../ui/Menu'

/** Top-right language picker (English default, Deutsch, Türkçe). */
export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const t = useT()
  const lang = useApp((s) => s.settings.lang)
  const setLang = useApp((s) => s.setLang)
  const current = LANGUAGES.find((l) => l.id === lang)!
  return (
    <Menu
      width={210}
      trigger={({ onClick, open }) => (
        <motion.button
          type="button"
          onClick={onClick}
          whileTap={{ scale: 0.94 }}
          className={cn(
            'glass glass-pill flex h-12 items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-ink',
            compact ? 'w-10 justify-center px-0 h-10' : 'px-3.5',
            open && 'ring-2 ring-[var(--accent-line)]',
          )}
          aria-label={t('core.topbar.language')}
          title={t('core.topbar.language')}
        >
          <span className="relative z-[1] text-[16px] leading-none">{current.flag}</span>
          {!compact && <span className="relative z-[1]">{current.id}</span>}
        </motion.button>
      )}
    >
      {(close) => (
        <div className="p-1">
          <p className="flex items-center gap-1.5 px-2.5 pb-2 pt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            <Languages className="size-3.5" /> {t('core.topbar.language')}
          </p>
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setLang(l.id)
                close()
              }}
              className={cn('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[14px] hover:bg-[var(--surface-2)]', lang === l.id && 'bg-[var(--surface-2)] font-medium')}
            >
              <span className="text-[18px] leading-none">{l.flag}</span>
              <span className="flex-1">{l.native}</span>
              {lang === l.id && <Check className="size-4 text-accent-text" />}
            </button>
          ))}
        </div>
      )}
    </Menu>
  )
}

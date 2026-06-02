import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Languages, Moon, SunMedium } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { getLocaleLabel, useUISettings, type Locale } from '@shared/lib/ui-settings';

const locales: Locale[] = ['kk', 'ru', 'en'];

interface PreferencesControlsProps {
  className?: string;
  compact?: boolean;
}

export const PreferencesControls = ({ className, compact = false }: PreferencesControlsProps) => {
  const { locale, setLocale, theme, toggleTheme, t } = useUISettings();
  const [isLocalePanelOpen, setIsLocalePanelOpen] = useState(false);
  const localePanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLocalePanelOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (localePanelRef.current && !localePanelRef.current.contains(event.target as Node)) {
        setIsLocalePanelOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLocalePanelOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLocalePanelOpen]);

  const handleLocaleSelect = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setIsLocalePanelOpen(false);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-2xl border border-[#E3E9E4] bg-white px-2 py-2 shadow-[0_8px_20px_rgba(16,24,18,0.04)] dark:border-[#2F3B33] dark:bg-[#121914]',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
        className,
      )}
    >
      <div ref={localePanelRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setIsLocalePanelOpen((open) => !open)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E3E9E4] bg-white px-3 py-2 text-sm font-semibold text-[#26362B] transition-colors hover:bg-[#F5F8F5] dark:border-[#314036] dark:bg-[#18211B] dark:text-[#E6EEE8] dark:hover:bg-[#1D2821]"
          aria-expanded={isLocalePanelOpen}
          aria-haspopup="menu"
          title={t('preferences.language')}
        >
          <Languages className="h-4 w-4" />
          {!compact && <span className="text-xs font-semibold uppercase tracking-[0.12em]">{t('preferences.language')}</span>}
          <span className="rounded-lg bg-[#F5F8F5] px-2 py-1 text-xs font-bold text-[#2B6A4D] dark:bg-[#223027] dark:text-[#DFF0E6]">
            {getLocaleLabel(locale)}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 text-[#607167] transition-transform dark:text-[#9FB0A4]', isLocalePanelOpen && 'rotate-180')}
          />
        </button>

        <div
          className={cn(
            'pointer-events-none absolute right-0 top-[calc(100%+0.5rem)] z-20 w-40 translate-x-3 opacity-0 transition-all duration-200',
            isLocalePanelOpen && 'pointer-events-auto translate-x-0 opacity-100',
          )}
        >
          <div
            className="rounded-2xl border border-[#E3E9E4] bg-white p-1.5 shadow-[0_18px_40px_rgba(16,24,18,0.12)] dark:border-[#2F3B33] dark:bg-[#121914]"
            role="menu"
          >
            {locales.map((entry) => {
              const selected = entry === locale;

              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() => handleLocaleSelect(entry)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors',
                    selected
                      ? 'bg-[#2B6A4D] text-white'
                      : 'text-[#324338] hover:bg-[#F5F8F5] dark:text-[#C1D0C6] dark:hover:bg-[#1D2821]',
                  )}
                  role="menuitem"
                >
                  <span>{getLocaleLabel(entry)}</span>
                  {selected ? <span className="h-2 w-2 rounded-full bg-current opacity-80" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex items-center gap-2 rounded-xl border border-[#E3E9E4] bg-white px-3 py-2 text-sm font-semibold text-[#26362B] transition-colors hover:bg-[#F5F8F5] dark:border-[#314036] dark:bg-[#18211B] dark:text-[#E6EEE8] dark:hover:bg-[#1D2821]"
        title={t(theme === 'dark' ? 'preferences.light' : 'preferences.dark')}
      >
        {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {!compact && <span>{t(theme === 'dark' ? 'preferences.light' : 'preferences.dark')}</span>}
      </button>
    </div>
  );
};

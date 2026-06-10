import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Moon, SunMedium } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { useUISettings, type Locale } from '@shared/lib/ui-settings';

const localeOptions: Array<{ value: Locale; label: string; flagClass: string }> = [
  { value: 'en', label: 'English', flagClass: 'fi fi-gb' },
  { value: 'ru', label: 'Russian', flagClass: 'fi fi-ru' },
  { value: 'kk', label: 'Kazakh', flagClass: 'fi fi-kz' },
];

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

  const currentLocale = localeOptions.find((entry) => entry.value === locale) || localeOptions[0];

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-[#D6DDD8] bg-white px-2.5 py-2 dark:border-[#2F3B33] dark:bg-[#121914]',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
        className,
      )}
    >
      <div ref={localePanelRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setIsLocalePanelOpen((open) => !open)}
          className="inline-flex h-10 min-w-[5.2rem] items-center gap-1.5 rounded-full border-2 border-[#D6DDD8] bg-white px-3 pr-2.5 text-sm font-semibold text-[#26362B] transition-colors hover:border-[#C9D4CE] hover:bg-[#F8FAF8] dark:border-[#314036] dark:bg-[#18211B] dark:text-[#E6EEE8] dark:hover:bg-[#1D2821]"
          aria-expanded={isLocalePanelOpen}
          aria-haspopup="menu"
          title={t('preferences.language')}
        >
          <span
            className={cn(
              currentLocale.flagClass,
              'h-5 w-[1.45rem] rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.04)]',
            )}
            aria-hidden="true"
          />
          <ChevronDown
            className={cn('h-[18px] w-[18px] text-[#677381] transition-transform dark:text-[#A7B5AB]', isLocalePanelOpen && 'rotate-180')}
            strokeWidth={2.6}
          />
        </button>

        <div
          className={cn(
            'pointer-events-none absolute right-0 top-[calc(100%+0.5rem)] z-20 w-72 translate-x-2 opacity-0 transition-all duration-200',
            isLocalePanelOpen && 'pointer-events-auto translate-x-0 opacity-100',
          )}
        >
          <div
            className="rounded-[28px] border border-[#D6DDD8] bg-white p-2 dark:border-[#2F3B33] dark:bg-[#121914]"
            role="menu"
          >
            {localeOptions.map((entry) => {
              const selected = entry.value === locale;

              return (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => handleLocaleSelect(entry.value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors',
                    selected
                      ? 'bg-[#F3F6F4] text-[#1F3325] dark:bg-[#223427] dark:text-[#EAF2EC]'
                      : 'text-[#324338] hover:bg-[#F5F8F5] dark:text-[#C1D0C6] dark:hover:bg-[#1D2821]',
                  )}
                  role="menuitem"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        entry.flagClass,
                        'h-[1.15rem] w-[1.65rem] rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.04)]',
                      )}
                      aria-hidden="true"
                    />
                    <span className="tracking-[0.01em]">{entry.label}</span>
                  </span>
                  {selected ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1E6648] text-white dark:bg-[#4A966E]">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : null}
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

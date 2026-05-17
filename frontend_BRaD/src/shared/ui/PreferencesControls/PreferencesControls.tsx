import { Languages, Moon, SunMedium } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { getLocaleLabel, useUISettings, type Locale } from '@shared/lib/ui-settings';

const locales: Locale[] = ['kk', 'ru', 'en'];

interface PreferencesControlsProps {
  className?: string;
  compact?: boolean;
}

export const PreferencesControls = ({ className, compact = false }: PreferencesControlsProps) => {
  const { locale, setLocale, theme, toggleTheme, t } = useUISettings();

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-2xl border border-[#E3E9E4] bg-white px-2 py-2 shadow-[0_8px_20px_rgba(16,24,18,0.04)] dark:border-[#2F3B33] dark:bg-[#121914]',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
        className,
      )}
    >
      <div className="inline-flex items-center gap-1 text-[#607167] dark:text-[#9FB0A4]">
        <Languages className="h-4 w-4" />
        {!compact && <span className="text-xs font-semibold uppercase tracking-[0.12em]">{t('preferences.language')}</span>}
      </div>

      <div className="flex items-center gap-1 rounded-xl bg-[#F5F8F5] p-1 dark:bg-[#1A241D]">
        {locales.map((entry) => {
          const selected = entry === locale;

          return (
            <button
              key={entry}
              type="button"
              onClick={() => setLocale(entry)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-colors',
                selected
                  ? 'bg-[#2B6A4D] text-white'
                  : 'text-[#516257] hover:bg-white hover:text-[#213128] dark:text-[#A7B6AC] dark:hover:bg-[#243128] dark:hover:text-[#EFF5F0]',
              )}
            >
              {getLocaleLabel(entry)}
            </button>
          );
        })}
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

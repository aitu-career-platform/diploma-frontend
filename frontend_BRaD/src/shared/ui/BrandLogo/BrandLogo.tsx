import { cn } from '@shared/lib/utils';
import { useUISettings } from '@shared/lib/ui-settings';

interface BrandLogoProps {
  className?: string;
}

export const BrandLogo = ({ className }: BrandLogoProps) => {
  const { theme } = useUISettings();

  return (
    <img
      src={theme === 'dark' ? '/images/logo/new_logo_dark.png' : '/images/logo/new_logo_light.png'}
      alt="Scoutly Logo"
      className={cn('w-auto object-contain', className)}
    />
  );
};

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { X, Mail } from 'lucide-react';
import { Button, Input, PreferencesControls } from '@shared/ui';
import { useUserStore } from '@entities/user';
import { useUISettings } from '@shared/lib/ui-settings';

const requestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type RequestPasswordResetFormData = z.infer<typeof requestPasswordResetSchema>;

export const RequestPasswordResetPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const { requestPasswordReset } = useUserStore();
  const { t } = useUISettings();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestPasswordResetFormData>({
    resolver: zodResolver(requestPasswordResetSchema),
  });

  const onSubmit = async (data: RequestPasswordResetFormData) => {
    try {
      setError(null);
      await requestPasswordReset(data.email);
      setEmail(data.email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request password reset');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen app-shell flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="app-section-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F0D8]">
              <Mail className="h-8 w-8 text-[#2B6A4D]" />
            </div>
            <h2 className="app-title text-2xl dark:text-[#F0F6F1]">{t('auth.forgot.successTitle')}</h2>
            <p className="app-text-muted mb-6 mt-2 text-sm sm:text-base">
              {t('auth.forgot.successDescription', { email })}
            </p>
            <Button
              onClick={() => navigate(`/app/reset-password?email=${encodeURIComponent(email)}`)}
              variant="hero"
              size="lg"
              className="w-full"
            >
              {t('auth.forgot.enterCode')}
            </Button>
            <div className="mt-4">
              <Link to="/app/login" className="text-sm font-semibold text-[#2B6A4D] hover:underline">
                {t('auth.forgot.backToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <PreferencesControls compact />
        </div>
        <Link to="/app" className="mb-1 inline-flex items-center gap-3">
          <img src="/images/logo/logo.png" alt="BRaD Logo" className="h-24 w-auto object-contain" />
        </Link>

        <div className="app-section-card relative p-7 sm:p-8">
          <Link to="/app/login" className="absolute right-4 top-4 text-[#607456] transition-colors hover:text-[#2B3B23]">
            <X className="h-5 w-5" />
          </Link>
          <h2 className="app-title text-3xl dark:text-[#F0F6F1]">{t('auth.forgot.title')}</h2>
          <p className="app-text-muted mb-6 mt-1">
            {t('auth.forgot.description')}
          </p>

          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#22301B] dark:text-[#DCE8DF]">
                {t('auth.register.email')}
              </label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="you@example.com"
                className="h-11 rounded-xl border-[#9FB08A]/35 bg-white"
              />
              {errors.email && <p className="mt-1 text-sm text-red-700">{errors.email.message}</p>}
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-[#5E7253] dark:text-[#A2B0A6]">
            {t('auth.forgot.rememberPassword')}{' '}
            <Link to="/app/login" className="font-semibold text-[#2B6A4D] hover:underline">
              {t('auth.register.signIn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

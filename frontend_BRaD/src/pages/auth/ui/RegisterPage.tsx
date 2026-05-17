import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button, Input, PreferencesControls } from '@shared/ui';
import { useUserStore } from '@entities/user';
import { useUISettings } from '@shared/lib/ui-settings';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['user', 'hr']),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage = () => {
  const [error, setError] = useState<string | null>(null);
  const { register: registerUser } = useUserStore();
  const { t } = useUISettings();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'user',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      await registerUser(data.email, data.password, data.name, data.role);
      navigate(`/app/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen app-shell flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <PreferencesControls compact />
        </div>
        <Link to="/app" className="mb-1 inline-flex items-center gap-2">
          <img src="/images/logo/logo.png" alt="BRaD Logo" className="h-24 w-auto object-contain" />
        </Link>

        <div className="app-section-card relative p-7 sm:p-8">
          <Link to="/app" className="absolute right-4 top-4 text-[#607456] transition-colors hover:text-[#2B3B23]">
            <X className="h-5 w-5" />
          </Link>

          <h2 className="app-title text-3xl dark:text-[#F0F6F1]">{t('auth.register.title')}</h2>
          <p className="app-text-muted mb-6 mt-1">{t('auth.register.description')}</p>

          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-semibold text-[#22301B] dark:text-[#DCE8DF]">
                {t('auth.register.name')}
              </label>
              <Input
                id="name"
                {...register('name')}
                placeholder="John Doe"
                className="h-11 rounded-xl border-[#9FB08A]/35 bg-white"
              />
              {errors.name && <p className="mt-1 text-sm text-red-700">{errors.name.message}</p>}
            </div>

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

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#22301B] dark:text-[#DCE8DF]">
                {t('auth.register.password')}
              </label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="h-11 rounded-xl border-[#9FB08A]/35 bg-white"
              />
              {errors.password && <p className="mt-1 text-sm text-red-700">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="role" className="mb-2 block text-sm font-semibold text-[#22301B] dark:text-[#DCE8DF]">
                {t('auth.register.role')}
              </label>
              <select
                id="role"
                {...register('role')}
                className="flex h-11 w-full rounded-xl border border-[#9FB08A]/35 bg-white px-3 py-2 text-sm text-[#2B3B23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-[#314036] dark:bg-[#111814] dark:text-[#E7EFE8]"
              >
                 <option value="user">{t('auth.register.candidate')}</option>
                 <option value="hr">{t('auth.register.hr')}</option>
              </select>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('auth.register.submitting') : t('auth.register.submit')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#5E7253] dark:text-[#A2B0A6]">
              {t('auth.register.hasAccount')}{' '}
              <Link to="/app/login" className="font-semibold text-[#2B6A4D] hover:underline">
                {t('auth.register.signIn')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { X, CheckCircle } from 'lucide-react';
import { Button, Input } from '@shared/ui';
import { useUserStore } from '@entities/user';

const resetPasswordSchema = z
  .object({
    code: z.string().length(6, 'Code must be 6 digits'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { resetPassword } = useUserStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!email) {
      setError('Email is required');
      return;
    }

    try {
      setError(null);
      await resetPassword(email, data.code, data.newPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/app/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen app-shell flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="app-section-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="app-title text-2xl">Password updated</h2>
            <p className="app-text-muted mt-2">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/app" className="mb-1 inline-flex items-center gap-3">
          <img src="/images/logo/logo.png" alt="BRaD Logo" className="h-24 w-auto object-contain" />
        </Link>

        <div className="app-section-card relative p-7 sm:p-8">
          <Link to="/app/login" className="absolute right-4 top-4 text-[#607456] transition-colors hover:text-[#2B3B23]">
            <X className="h-5 w-5" />
          </Link>
          <h2 className="app-title text-3xl">Set new password</h2>
          <p className="app-text-muted mb-6 mt-1 text-sm sm:text-base">
            Enter the code sent to <strong>{email}</strong> and choose a new password.
          </p>

          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="code" className="mb-2 block text-sm font-semibold text-[#22301B]">
                Reset code
              </label>
              <Input
                id="code"
                type="text"
                maxLength={6}
                {...register('code')}
                placeholder="000000"
                className="h-11 rounded-xl border-[#9FB08A]/35 bg-white text-center text-xl tracking-[0.3em]"
              />
              {errors.code && <p className="mt-1 text-sm text-red-700">{errors.code.message}</p>}
            </div>

            <div>
              <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-[#22301B]">
                New password
              </label>
              <Input
                id="newPassword"
                type="password"
                {...register('newPassword')}
                placeholder="••••••••"
                className="h-11 rounded-xl border-[#9FB08A]/35 bg-white"
              />
              {errors.newPassword && <p className="mt-1 text-sm text-red-700">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-[#22301B]">
                Confirm new password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                placeholder="••••••••"
                className="h-11 rounded-xl border-[#9FB08A]/35 bg-white"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-700">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Reset password'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-[#5E7253]">
            <Link to="/app/forgot-password" className="font-semibold text-[#2B6A4D] hover:underline">
              Resend code
            </Link>
            {' or '}
            <Link to="/app/login" className="font-semibold text-[#2B6A4D] hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

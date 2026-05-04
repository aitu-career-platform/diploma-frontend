import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button, Input } from '@shared/ui';
import { useUserStore } from '@entities/user';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const [error, setError] = useState<string | null>(null);
  const { login } = useUserStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data.email, data.password);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen app-shell flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/app" className="mb-1 inline-flex items-center gap-3">
          <img src="/images/logo/logo.png" alt="BRaD Logo" className="h-24 w-auto object-contain" />
        </Link>

        <div className="app-section-card relative p-7 sm:p-8">
          <Link to="/app" className="absolute right-4 top-4 text-[#607456] transition-colors hover:text-[#2B3B23]">
            <X className="h-5 w-5" />
          </Link>

          <h2 className="app-title text-3xl">Welcome back</h2>
          <p className="app-text-muted mb-6 mt-1">Sign in to continue in BRaD workspace.</p>

          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#22301B]">
                Email
              </label>
              <Input
                id="email"
                type="text"
                {...register('email')}
                placeholder="you@example.com"
                className="h-11 rounded-xl border-[#9FB08A]/35 bg-white"
              />
              {errors.email && <p className="mt-1 text-sm text-red-700">{errors.email.message}</p>}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-[#22301B]">
                  Password
                </label>
                <Link to="/app/forgot-password" className="text-sm font-semibold text-[#2B6A4D] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="h-11 rounded-xl border-[#9FB08A]/35 bg-white"
              />
              {errors.password && <p className="mt-1 text-sm text-red-700">{errors.password.message}</p>}
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="mb-4 rounded-lg border border-[#2B3B23]/10 bg-[#F4F8EA] px-4 py-3 text-left text-sm text-[#4A5E3D]">
              Admin login: admin@mail.ru / 123456
            </div>
            <p className="text-sm text-[#5E7253]">
              Don't have an account?{' '}
              <Link to="/app/register" className="font-semibold text-[#2B6A4D] hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

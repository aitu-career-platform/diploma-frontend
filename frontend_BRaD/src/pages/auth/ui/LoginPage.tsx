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
      const nextUser = useUserStore.getState().currentUser;
      navigate(nextUser?.role === 'admin' ? '/app/admin' : '/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#EBEDDF' }}>
      <div className="w-full max-w-md">
        <Link to="/app" className="inline-flex items-center gap-3 mb-0 transition-colors">
          <img 
            src="/images/logo/logo.png" 
            alt="BRaD Logo" 
            className="h-24 w-auto object-contain"
          />
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8 relative" style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
          <Link
            to="/app"
            className="absolute top-4 right-4 transition-colors"
            style={{ color: 'rgba(51, 58, 47, 0.6)' }}
          >
            <X className="w-5 h-5" />
          </Link>
          <h2 className="font-heading text-3xl font-bold mb-2" style={{ color: '#333A2F' }}>Welcome Back</h2>
          <p className="mb-6" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>Sign in to your account</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                Email
              </label>
              <Input
                id="email"
                type="text"
                {...register('email')}
                placeholder="you@example.com"
                className="h-12"
                style={{ 
                  borderColor: 'rgba(51, 58, 47, 0.2)',
                  borderRadius: '0.75rem'
                }}
              />
              {errors.email && (
                <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium" style={{ color: '#333A2F' }}>
                  Password
                </label>
                <Link 
                  to="/app/forgot-password" 
                  className="text-sm hover:underline font-medium" 
                  style={{ color: '#333A2F' }}
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="h-12"
                style={{ 
                  borderColor: 'rgba(51, 58, 47, 0.2)',
                  borderRadius: '0.75rem'
                }}
              />
              {errors.password && (
                <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{errors.password.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              variant="hero" 
              size="lg" 
              className="w-full" 
              disabled={isSubmitting}
              style={{ 
                backgroundColor: '#333A2F', 
                color: 'white',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="mb-4 rounded-lg border border-black/5 px-4 py-3 text-left text-sm" style={{ backgroundColor: '#F7F8F1', color: 'rgba(51, 58, 47, 0.75)' }}>
              Test admin: `admin@mail.ru` / `123456`
            </div>
            <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
              Don't have an account?{' '}
              <Link to="/app/register" className="hover:underline font-medium" style={{ color: '#333A2F' }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

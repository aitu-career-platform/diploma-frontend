import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button, Input } from '@shared/ui';
import { useUserStore } from '@entities/user';

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
      // Redirect to email verification page
      navigate(`/app/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#EBEDDF' }}>
      <div className="w-full max-w-md">
        <Link to="/app" className="inline-flex items-center gap-2 mb-2 transition-colors">
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
          <h2 className="font-heading text-3xl font-bold mb-2" style={{ color: '#333A2F' }}>Create Account</h2>
          <p className="mb-6" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>Join BRaD. and start your journey</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                Full Name
              </label>
              <Input
                id="name"
                {...register('name')}
                placeholder="John Doe"
                className="h-12"
                style={{ 
                  borderColor: 'rgba(51, 58, 47, 0.2)',
                  borderRadius: '0.75rem'
                }}
              />
              {errors.name && (
                <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                Email
              </label>
              <Input
                id="email"
                type="email"
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
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                Password
              </label>
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

            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                I am a
              </label>
              <select
                id="role"
                {...register('role')}
                className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                style={{ 
                  borderColor: 'rgba(51, 58, 47, 0.2)',
                  backgroundColor: 'white',
                  color: '#333A2F'
                }}
              >
                <option value="user">User</option>
                <option value="hr">HR</option>
              </select>
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
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
              Already have an account?{' '}
              <Link to="/app/login" className="hover:underline font-medium" style={{ color: '#333A2F' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


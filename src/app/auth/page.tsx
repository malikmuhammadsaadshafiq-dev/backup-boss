'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Github, 
  Chrome, 
  AlertCircle,
  HardHat,
  Loader2
} from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isLogin && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          mode: isLogin ? 'login' : 'signup'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      setErrors({ 
        submit: error instanceof Error ? error.message : 'An error occurred. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider: string) => {
    console.log(`OAuth with ${provider}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-[#2C3E50] text-white px-4 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <HardHat className="w-6 h-6" />
          <span className="font-bold text-lg tracking-tight">Backup Boss</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white shadow-xl border border-slate-200">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setErrors({});
                }}
                className={`flex-1 py-4 text-sm font-semibold tracking-wide uppercase transition-colors ${
                  isLogin 
                    ? 'bg-[#2C3E50] text-white' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setErrors({});
                }}
                className={`flex-1 py-4 text-sm font-semibold tracking-wide uppercase transition-colors ${
                  !isLogin 
                    ? 'bg-[#2C3E50] text-white' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Sign Up
              </button>
            </div>

            <div className="p-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-slate-600 mb-8 text-sm">
                {isLogin 
                  ? 'Sign in to access your business continuity dashboard' 
                  : 'Start documenting your business operations today'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${
                        errors.email ? 'border-red-500' : 'border-slate-300'
                      } text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C3E50] focus:border-transparent transition-all`}
                      placeholder="owner@company.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${
                        errors.password ? 'border-red-500' : 'border-slate-300'
                      } text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C3E50] focus:border-transparent transition-all`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.password}
                    </p>
                  )}
                </div>

                {!isLogin && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${
                          errors.confirmPassword ? 'border-red-500' : 'border-slate-300'
                        } text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C3E50] focus:border-transparent transition-all`}
                        placeholder="••••••••"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                )}

                {errors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {errors.submit}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#2C3E50] text-white py-3 px-4 font-semibold uppercase tracking-wider hover:bg-[#34495E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2C3E50] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500 font-medium">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleOAuth('google')}
                  type="button"
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2C3E50] transition-colors"
                >
                  <Chrome className="w-5 h-5" />
                  <span className="text-sm">Google</span>
                </button>
                <button
                  onClick={() => handleOAuth('github')}
                  type="button"
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2C3E50] transition-colors"
                >
                  <Github className="w-5 h-5" />
                  <span className="text-sm">GitHub</span>
                </button>
              </div>

              <p className="mt-8 text-center text-sm text-slate-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="font-semibold text-[#2C3E50] hover:underline focus:outline-none"
                >
                  {isLogin ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            Protected by industry-standard encryption. Your data stays yours.
          </p>
        </div>
      </main>
    </div>
  );
}
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirectUrl') || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Only redirect if we have a session AND we're not already on a sign-in page with a redirect parameter
        if (session && !window.location.pathname.includes('/auth/sign-in')) {
          console.log("Already authenticated, redirecting to:", redirectUrl);
          window.location.href = redirectUrl;
        }
      } catch (err) {
        console.error("Error checking session:", err);
        // Don't redirect on error
      }
    };
    
    checkSession();
  }, [redirectUrl]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast.success('Signed in successfully');
      console.log("Redirecting to:", redirectUrl);
      
      // Reliable redirect after successful sign-in
      window.location.href = redirectUrl;
    } catch (error: any) {
      setError(error.message || 'Failed to sign in');
      toast.error('Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Store the redirect URL in local storage to use after OAuth callback
      if (redirectUrl !== '/dashboard') {
        localStorage.setItem('authRedirectUrl', redirectUrl);
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with Google');
      toast.error('Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <Button asChild variant="ghost" size="sm" className="mb-6">
            <Link href="/" className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
          </Button>
          
          <h1 className="text-center text-2xl font-bold tracking-tight">
            Sign in to your account
          </h1>
          <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
            Turn your face into an awesome action figure
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/50 dark:text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  Forgot your password?
                </a>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300 dark:border-neutral-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                Sign in with Google
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
            Don't have an account?{' '}
            <Link href="/auth/sign-up" className="text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 
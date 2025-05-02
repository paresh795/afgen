"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, ImagePlus, History, CreditCard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase, getUser, getUserCredits } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userData, setUserData] = useState<{
    name: string;
    email: string | undefined;
    credits: number;
  }>({
    name: 'Loading...',
    email: undefined,
    credits: 0,
  });

  // Function to refresh credits
  const refreshCredits = async () => {
    try {
      const user = await getUser();
      if (user) {
        const credits = await getUserCredits(user.id);
        setUserData(prev => ({ ...prev, credits }));
        return credits;
      }
    } catch (error) {
      console.error('Error refreshing credits:', error);
    }
    return null;
  };

  // Listen for URL query parameters that indicate a purchase was made
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const purchaseStatus = searchParams.get('purchase');
    
    if (purchaseStatus === 'success') {
      // Show success message
      toast.success('Payment successful! Your credits have been added.', {
        duration: 5000,
      });
      
      // Clean up the URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      
      // Refresh credits after a short delay to allow webhook processing
      setTimeout(() => {
        refreshCredits().then(newCredits => {
          if (newCredits !== null) {
            toast.success(`Your balance: ${newCredits} credits`, { 
              icon: '💰', 
              duration: 3000 
            });
          }
        });
      }, 2000);
    } else if (purchaseStatus === 'canceled') {
      toast.error('Payment was canceled.');
      
      // Clean up the URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Refresh credits every 15 seconds while dashboard is open
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshCredits();
    }, 15000);
    
    // Listen for custom refresh credits event
    const handleRefreshCredits = () => {
      refreshCredits();
    };
    
    window.addEventListener('refreshCredits', handleRefreshCredits);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('refreshCredits', handleRefreshCredits);
    };
  }, []);

  useEffect(() => {
    // Function to load user data
    async function loadUserData() {
      console.log('[Layout] loadUserData: START');
      try {
        // Just get the user data, we don't need to log it here anymore
        await supabase.auth.getUser(); 

        // Check if we have an active user session
        console.log('[Layout] loadUserData: Checking session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('[Layout] loadUserData: getSession result:', { session: !!session, error: sessionError?.message });

        // Use a grace period before redirecting to handle race conditions
        // where the session might be momentarily missing due to refreshing
        if (!session) {
          console.log('[Layout] loadUserData: No session initially, setting timeout.');
          setTimeout(async () => {
            console.log('[Layout] loadUserData: Timeout check starting...');
            const { data: { session: retrySession }, error: retrySessionError } = await supabase.auth.getSession();
            console.log('[Layout] loadUserData: Timeout getSession result:', { session: !!retrySession, error: retrySessionError?.message });
            
            if (!retrySession) {
              console.log('[Layout] loadUserData: Still no session after timeout, redirecting!');
              // Only redirect if we're still mounted
              if (true) {
                window.location.href = `/auth/sign-in?redirectUrl=${window.location.pathname}`;
              }
            } else {
              // We found a session on retry
              const user = retrySession.user;
              console.log(`[Layout] loadUserData: Session found on retry, user ID: ${user.id}. Fetching credits...`);
              const credits = await getUserCredits(user.id);
              console.log(`[Layout] loadUserData: Credits received after retry: ${credits}`);
              
              setUserData({
                name: user.email?.split('@')[0] || 'User',
                email: user.email,
                credits,
              });
            }
          }, 500); // Short delay to allow for session refresh
          
          return;
        }
        
        // We have a session, load user data
        const user = session.user;
        console.log(`[Layout] loadUserData: Initial session valid, user ID: ${user.id}. Fetching credits...`);
        const credits = await getUserCredits(user.id);
        console.log(`[Layout] loadUserData: Credits received initially: ${credits}`);
        
        setUserData({
          name: user.email?.split('@')[0] || 'User',
          email: user.email,
          credits,
        });
      } catch (error) {
        console.error('[Layout] Error loading user data:', error);
        toast.error('Failed to load user data');
      }
      console.log('[Layout] loadUserData: END');
    }

    loadUserData();
    
    // Set up an auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          window.location.href = '/auth/sign-in';
        } else if (event === 'SIGNED_IN' && session) {
          const user = session.user;
          const credits = await getUserCredits(user.id);
          
          setUserData({
            name: user.email?.split('@')[0] || 'User',
            email: user.email,
            credits,
          });
        }
      }
    );
    
    // Cleanup the listener
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            ActionFig
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
              <span className="font-bold text-xl">{userData.credits}</span> 
              <span className="text-xs uppercase tracking-wide">credits</span>
              <button 
                onClick={() => {
                  refreshCredits().then(() => {
                    toast.success('Credits refreshed');
                  });
                }}
                className="ml-1 rounded-full p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700" 
                aria-label="Refresh credits"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              </button>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/buy">Buy Credits</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
          <nav className="flex flex-col p-4">
            <div className="mb-6 rounded-lg bg-white p-4 shadow-sm dark:bg-neutral-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
                  <User className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
                </div>
                <div>
                  <p className="font-medium">{userData.name}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {userData.email || 'Loading...'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Link
                href="/dashboard/generate"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800"
              >
                <ImagePlus className="h-4 w-4" />
                New Figure
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800"
              >
                <History className="h-4 w-4" />
                My Figures
              </Link>
              <Link
                href="/dashboard/history"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800"
              >
                <CreditCard className="h-4 w-4" />
                Billing History
              </Link>
            </div>

            <div className="mt-auto pt-6">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-neutral-600 dark:text-neutral-400"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-white dark:bg-neutral-950">
          <div className="container mx-auto px-4 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 
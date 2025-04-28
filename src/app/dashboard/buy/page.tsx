"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CREDIT_PLANS } from '@/lib/stripe-config';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import stripePromise from '@/lib/stripe-client';

export default function BuyCreditsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [authDebug, setAuthDebug] = useState<any>(null);
  const [debugAction, setDebugAction] = useState<string>('add');
  const [debugAmount, setDebugAmount] = useState<number>(1);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState<boolean>(false);

  const checkAuth = async () => {
    try {
      setAuthDebug({ loading: true });
      
      // Check client-side auth
      const { data: clientData, error: clientError } = await supabase.auth.getSession();
      
      // Check server-side auth through API
      const response = await fetch('/api/auth-check', {
        credentials: 'same-origin'
      });
      const serverData = await response.json();
      
      setAuthDebug({
        loading: false,
        client: {
          hasSession: !!clientData.session,
          error: clientError?.message,
        },
        server: serverData
      });
      
    } catch (error: any) {
      setAuthDebug({
        loading: false,
        error: error.message
      });
    }
  };

  // Debug function to manually control credits
  const handleDebugCredits = async () => {
    try {
      setDebugLoading(true);
      setDebugResult(null);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast.error('You must be signed in to use this function');
        return;
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/debug/credits', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: debugAction,
          amount: Number(debugAmount),
        }),
        credentials: 'include',
      });
      
      const result = await response.json();
      setDebugResult(result);
      
      if (result.success) {
        toast.success(`Credits updated: ${result.previousBalance} → ${result.newBalance}`);
        // Trigger a refresh of the parent dashboard to update credit display
        window.dispatchEvent(new CustomEvent('refreshCredits'));
      } else {
        toast.error(result.error || 'Failed to update credits');
      }
    } catch (error: any) {
      console.error('Debug credits error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setDebugLoading(false);
    }
  };

  const handlePurchase = async (planId: string) => {
    try {
      console.log('===== PURCHASE BUTTON CLICKED =====');
      console.log('Plan ID:', planId);
      
      // Set loading state for specific plan
      setIsLoading(planId);
      
      // Get current auth session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Auth session:', session ? 'Valid session' : 'No session', sessionError);
      
      if (sessionError || !session) {
        console.error('Auth session error:', sessionError || 'No session found');
        toast.error('Please sign in to purchase credits');
        
        // Try to refresh auth in case it's just an expired token
        await supabase.auth.refreshSession();
        
        // Check if that fixed it
        const { data: { session: refreshedSession } } = await supabase.auth.getSession();
        
        if (!refreshedSession) {
          // Still no session after refresh, redirect to sign in
          router.push('/auth/sign-in');
          return;
        }
      }
      
      // Create site URLs for success/cancel
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const successUrl = `${siteUrl}/dashboard?purchase=success`;
      const cancelUrl = `${siteUrl}/dashboard/buy?canceled=true`;
      
      console.log(`Creating checkout session for plan ID: ${planId}`);
      
      // Create headers with authorization token if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('Using token auth with Bearer token');
      } else {
        console.log('No access token available, relying on cookies');
      }
      
      // Make sure we have the raw price ID
      const selectedPlan = CREDIT_PLANS.find(p => p.id === planId);
      if (!selectedPlan) {
        throw new Error('Invalid plan selected');
      }
      
      // Raw price ID from environment variables to ensure string comparison works
      let rawPriceId = planId;
      if (typeof planId === 'function' || planId === '[object Object]') {
        // If we somehow got a function (from client import), use env variables directly
        rawPriceId = selectedPlan.name === 'Single' 
          ? process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE_ID || ''
          : process.env.NEXT_PUBLIC_STRIPE_PRICE_GROUP_ID || '';
          
        console.log(`Using environment variable price ID: ${rawPriceId}`);
      }
      
      console.log('Using price ID:', rawPriceId);
      console.log('About to fetch to /api/stripe/create-checkout');
      
      try {
        // Create a checkout session through our API
        const response = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            priceId: rawPriceId,
            successUrl,
            cancelUrl,
          }),
          credentials: 'include', // Include all cookies
        });
        
        console.log('Fetch response status:', response.status);
        
        if (!response.ok) {
          let errorMessage = 'Failed to create checkout session';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
            console.error('API error response:', errorData);
          } catch (e) {
            console.error('Failed to parse error response', e);
          }
          
          console.error(`API error (${response.status}): ${errorMessage}`);
          
          // If unauthorized error, try to sign in again
          if (response.status === 401) {
            toast.error('Your session has expired. Please sign in again.');
            router.push('/auth/sign-in');
            return;
          }
          
          throw new Error(errorMessage);
        }

        const checkoutData = await response.json();
        console.log('Checkout data:', checkoutData);
        
        // Redirect to Stripe Checkout
        if (checkoutData?.url) {
          console.log('Redirecting to Stripe:', checkoutData.url);
          window.location.href = checkoutData.url;
        } else {
          throw new Error('No checkout URL returned');
        }
      } catch (fetchError: any) {
        console.error('Fetch operation failed:', fetchError);
        toast.error(`Request failed: ${fetchError.message}`);
      }
      
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(`Failed to initiate checkout: ${error.message || 'Please try again.'}`);
    } finally {
      setIsLoading(null);
    }
  };

  // Debug function to check environment variables
  const checkEnvironmentVars = () => {
    console.log('Environment variables check:');
    console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Set' : 'Not set');
    console.log('NEXT_PUBLIC_STRIPE_PRICE_SINGLE_ID:', process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE_ID);
    console.log('NEXT_PUBLIC_STRIPE_PRICE_GROUP_ID:', process.env.NEXT_PUBLIC_STRIPE_PRICE_GROUP_ID);
  };
  
  // Function to check Stripe API configuration
  const [stripeConfig, setStripeConfig] = useState<any>(null);
  const [isCheckingStripe, setIsCheckingStripe] = useState(false);
  
  const checkStripeConfig = async () => {
    try {
      setIsCheckingStripe(true);
      const response = await fetch('/api/debug/stripe');
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      const data = await response.json();
      console.log('Stripe config check:', data);
      setStripeConfig(data);
    } catch (error: any) {
      console.error('Failed to check Stripe config:', error);
      toast.error(`Stripe config check failed: ${error.message}`);
    } finally {
      setIsCheckingStripe(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href="/dashboard" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Buy Credits</h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Purchase credits to generate action figures
            </p>
          </div>
          <div className="flex gap-2">
            {process.env.NODE_ENV === 'development' && (
              <>
                <Button
                  variant="outline"
                  size="sm" 
                  onClick={() => document.getElementById('debugPanel')?.classList.toggle('hidden')}
                >
                  Debug Credits
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkEnvironmentVars}
                >
                  Check Env
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkStripeConfig}
                  disabled={isCheckingStripe}
                >
                  {isCheckingStripe ? 'Checking...' : 'Check Stripe'}
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkAuth}
              disabled={authDebug?.loading}
            >
              {authDebug?.loading ? 'Checking...' : 'Debug Auth'}
            </Button>
          </div>
        </div>
        
        {/* Debug panel */}
        {process.env.NODE_ENV === 'development' && (
          <div id="debugPanel" className="hidden mt-4 p-4 border rounded bg-neutral-50 dark:bg-neutral-900 text-sm">
            <h3 className="font-medium mb-2">Debug Credit System</h3>
            <div className="flex gap-2 mb-4">
              <select
                className="border rounded px-3 py-2 bg-white dark:bg-neutral-800"
                value={debugAction}
                onChange={(e) => setDebugAction(e.target.value)}
              >
                <option value="add">Add Credits</option>
                <option value="set">Set Credits</option>
                <option value="clear">Clear Credits</option>
              </select>
              {debugAction !== 'clear' && (
                <input
                  type="number"
                  min="0"
                  className="border rounded px-3 py-2 bg-white dark:bg-neutral-800 w-20"
                  value={debugAmount}
                  onChange={(e) => setDebugAmount(Number(e.target.value))}
                />
              )}
              <Button 
                variant="default"
                size="sm"
                onClick={handleDebugCredits}
                disabled={debugLoading}
              >
                {debugLoading ? 'Processing...' : 'Apply'}
              </Button>
            </div>
            {debugResult && (
              <pre className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded overflow-auto">
                {JSON.stringify(debugResult, null, 2)}
              </pre>
            )}
          </div>
        )}
        
        {authDebug && !authDebug.loading && (
          <div className="mt-4 p-4 border rounded bg-neutral-50 dark:bg-neutral-900 text-sm overflow-auto">
            <pre>{JSON.stringify(authDebug, null, 2)}</pre>
          </div>
        )}

        {/* Display Stripe config results */}
        {stripeConfig && (
          <div className="mt-4 p-4 border rounded bg-neutral-50 dark:bg-neutral-900 text-sm overflow-auto">
            <h3 className="font-medium mb-2">Stripe Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-xs uppercase">Keys</h4>
                <ul className="mt-1 text-xs">
                  <li>Public Key: {stripeConfig.stripeKeys.publicKeyAvailable ? '✅' : '❌'}</li>
                  <li>Secret Key: {stripeConfig.stripeKeys.secretKeyAvailable ? '✅' : '❌'}</li>
                  <li>Webhook Secret: {stripeConfig.stripeKeys.webhookSecretAvailable ? '✅' : '❌'}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-xs uppercase">Price IDs</h4>
                <ul className="mt-1 text-xs">
                  <li>Single (Env): {stripeConfig.priceIds.singleFromEnv || 'Not set'}</li>
                  <li>Group (Env): {stripeConfig.priceIds.groupFromEnv || 'Not set'}</li>
                  <li>Single (Config): {stripeConfig.priceIds.singleFromConfig || 'Not set'}</li>
                  <li>Group (Config): {stripeConfig.priceIds.groupFromConfig || 'Not set'}</li>
                </ul>
              </div>
            </div>
            <div className="mt-2">
              <h4 className="font-medium text-xs uppercase">API Test</h4>
              {stripeConfig.stripeApiTest.success ? (
                <p className="text-xs text-green-600">✅ API connection successful</p>
              ) : (
                <p className="text-xs text-red-600">❌ API connection failed: {stripeConfig.stripeApiTest.error}</p>
              )}
            </div>
            <p className="mt-4 text-xs text-neutral-500">Checked at: {stripeConfig.timestamp}</p>
          </div>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {CREDIT_PLANS.map((plan) => (
          <div 
            key={plan.id}
            className={`rounded-lg border ${plan.popular ? 'border-blue-500 dark:border-blue-400' : 'border-neutral-200 dark:border-neutral-700'} bg-white p-6 shadow-sm dark:bg-neutral-800 ${plan.popular ? 'shadow-md' : ''} relative`}
          >
            {plan.popular && (
              <div className="absolute -top-3 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Popular
              </div>
            )}
            <h2 className="text-xl font-bold">{plan.name} Plan</h2>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">{plan.description}</p>
            <p className="mt-4 text-3xl font-bold">{plan.priceDisplay}</p>

            <ul className="mt-6 space-y-3">
              <li className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-1 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center dark:bg-green-900">
                  <Check className="h-3 w-3 text-green-600 dark:text-green-300" />
                </div>
                <span>{plan.credits} {plan.credits === 1 ? 'credit' : 'credits'} for action figure generation</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-1 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center dark:bg-green-900">
                  <Check className="h-3 w-3 text-green-600 dark:text-green-300" />
                </div>
                <span>High-resolution image download</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-1 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center dark:bg-green-900">
                  <Check className="h-3 w-3 text-green-600 dark:text-green-300" />
                </div>
                <span>Full customization options</span>
              </li>
              {plan.popular && (
                <li className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-1 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center dark:bg-green-900">
                    <Check className="h-3 w-3 text-green-600 dark:text-green-300" />
                  </div>
                  <span>42% bulk discount</span>
                </li>
              )}
            </ul>

            <div className="mt-8">
              <Button
                className={`w-full ${plan.popular ? 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700' : ''}`}
                onClick={() => handlePurchase(plan.id)}
                disabled={isLoading === plan.id}
              >
                {isLoading === plan.id 
                  ? 'Processing...' 
                  : `Buy ${plan.name} Plan`
                }
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-lg font-bold">Frequently Asked Questions</h3>
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="font-medium">How do credits work?</h4>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Each credit allows you to generate one action figure from a face photo. Credits never expire.
            </p>
          </div>
          <div>
            <h4 className="font-medium">What payment methods do you accept?</h4>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              We accept all major credit cards via our secure payment processor, Stripe.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Can I get a refund?</h4>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Due to the digital nature of our product, all sales are final. If you experience technical issues, please contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
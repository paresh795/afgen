"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import stripePromise from '@/lib/stripe-client';
import { CREDIT_PLANS } from '@/lib/stripe-config';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function BuyCreditsPage() {
  const router = useRouter();
  // State only for purchase loading state
  const [isLoading, setIsLoading] = useState(false); 
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  // Effect can be kept if needed for other reasons, or removed if only for debug
  useEffect(() => {
    // Example: Could check auth status here if needed
  }, []);

  const handlePurchase = async (planId: string) => {
    setIsLoading(true);
    setLoadingPlanId(planId);

    try {
      // 1. Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to purchase credits.');
        router.push('/auth/sign-in?redirectUrl=/dashboard/buy');
        return;
      }

      // 2. Create Checkout Session via API
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` // Send token for auth
        },
        body: JSON.stringify({
          priceId: planId,
          successUrl: `${window.location.origin}/dashboard?purchase=success`,
          cancelUrl: `${window.location.origin}/dashboard/buy?canceled=true`,
        }),
      });

      const checkoutSession = await response.json();

      if (!response.ok || !checkoutSession.url) {
        throw new Error(checkoutSession.error || 'Failed to create checkout session');
      }

      // 3. Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe.js has not loaded yet.');
      }
      
      const { error } = await stripe.redirectToCheckout({ sessionId: checkoutSession.id });
      if (error) {
        throw error;
      }
    } catch (error: unknown) {
      console.error('Purchase Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown purchase error';
      toast.error(`Error: ${message}`);
    } finally {
      setIsLoading(false);
      setLoadingPlanId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Buy Credits</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Purchase credits to generate your action figures. 1 credit = 1 figure.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {CREDIT_PLANS.map((plan) => (
          <Card 
            key={plan.id} 
            className={plan.popular ? 'border-2 border-primary' : ''}
          >
            <CardHeader>
              {plan.popular && (
                <span className="mb-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Popular
                </span>
              )}
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-3xl font-bold">{plan.priceDisplay}</p>
              <ul className="mb-6 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <li>✓ {plan.credits} credit{plan.credits > 1 ? 's' : ''}</li>
                <li>✓ High-resolution PNG</li>
                {plan.id === CREDIT_PLANS[1].id && (
                  <li>✓ Best value</li>
                )}
              </ul>
              <Button 
                className="w-full gap-2" 
                onClick={() => handlePurchase(plan.id)}
                disabled={isLoading} // Disable all buttons if any purchase is loading
              >
                {isLoading && loadingPlanId === plan.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Redirecting...
                  </>
                ) : (
                  'Buy Now'
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
} 
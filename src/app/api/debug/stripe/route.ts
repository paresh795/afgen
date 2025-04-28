import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PRICE_IDS } from '@/lib/stripe-config';

// This endpoint is for debugging Stripe configuration
// Should only be accessible in development
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    // Collect diagnostic information
    const diagnostics: any = {
      environment: process.env.NODE_ENV,
      stripeKeys: {
        publicKeyAvailable: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        publicKeyPrefix: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 7),
        secretKeyAvailable: !!process.env.STRIPE_SECRET_KEY,
        secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
        webhookSecretAvailable: !!process.env.STRIPE_WEBHOOK_SECRET,
      },
      priceIds: {
        singleFromEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE_ID,
        groupFromEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROUP_ID,
        singleFromConfig: PRICE_IDS.SINGLE,
        groupFromConfig: PRICE_IDS.GROUP,
      },
      stripeApiTest: 'pending',
      timestamp: new Date().toISOString(),
    };

    // Try to call the Stripe API to verify the secret key
    try {
      // Just fetch a small amount of data to verify connectivity
      const balance = await stripe.balance.retrieve();
      diagnostics.stripeApiTest = {
        success: true,
        available: balance.available.map(b => ({
          amount: b.amount,
          currency: b.currency,
        })),
      };
    } catch (stripeError: any) {
      diagnostics.stripeApiTest = {
        success: false,
        error: stripeError.message,
      };
    }

    return NextResponse.json(diagnostics);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Diagnostic error: ${error.message}` },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 
 
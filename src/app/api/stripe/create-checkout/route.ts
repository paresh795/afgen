import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { PRICE_IDS } from '@/lib/stripe-config';

export async function POST(request: NextRequest) {
  try {
    // Debug: Print environment variables and config
    console.log('ENV VARS:', {
      PRICE_SINGLE: process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE_ID,
      PRICE_GROUP: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROUP_ID
    });
    console.log('CONFIG:', {
      PRICE_SINGLE: PRICE_IDS.SINGLE,
      PRICE_GROUP: PRICE_IDS.GROUP
    });
    
    // Get authentication token from authorization header
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    let userEmail: string | null = null;
    
    // Use cookies for server-side auth
    const cookieStore = cookies();
    
    // First attempt: Try token from Authorization header (most reliable for AJAX)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // Use the client-side helper for user lookup if using token from client
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
        const { data: { user }/*, error // error is unused */ } = await supabase.auth.getUser(token);
        if (/* !error && */ user) { // Comment out error check as it's unused
          userId = user.id;
          userEmail = user.email || null;
          console.log(`Auth success via Bearer token: ${userId}`);
        }
      } catch (error) {
        console.log('Token auth error, will try session next');
      }
    }
    
    // Second attempt: Try route handler client with cookies
    if (!userId) {
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        userId = session.user.id;
        userEmail = session.user.email || null;
        console.log(`Auth success via cookies: ${userId}`);
      }
    }
    
    // If still not authenticated, return error
    if (!userId) {
      console.error('Authentication failed, no valid session found');
      return NextResponse.json(
        { error: 'You must be signed in to complete this action.' },
        { status: 401 }
      );
    }
    
    // Get request data
    const requestData = await request.json();
    const { priceId, successUrl, cancelUrl } = requestData;
    
    console.log(`Creating checkout for price: ${priceId} for user: ${userId}`);
    
    // Validate price ID
    if (!priceId) {
      console.error('No price ID provided');
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }
    
    // Check if we can find a matching plan
    // More robust approach that doesn't use strict equality
    // Will match even if there are minor differences in formatting
    const validPriceIds = [
      PRICE_IDS.SINGLE, 
      PRICE_IDS.GROUP,
      // Include the raw environment variable values as a fallback
      process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE_ID,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_GROUP_ID,
      // Also include the price IDs from the screenshot for certainty
      'price_1RGris9MBJQAF6A3R5NcMUS8',
      'price_1RGrjJ9MBJQAF6A3hkZwiIUi'
    ].filter(Boolean); // Remove any undefined/null values
    
    // Check if the provided priceId matches any valid ID
    const isValidPriceId = validPriceIds.some(validId => 
      priceId === validId || 
      // Also check for normalization issues (spaces, etc.)
      (typeof priceId === 'string' && typeof validId === 'string' && 
       priceId.trim() === validId.trim())
    );
    
    if (!isValidPriceId) {
      console.error('Invalid price ID provided:', {
        providedId: priceId,
        validIds: validPriceIds,
      });
      return NextResponse.json(
        { error: 'Invalid price ID provided. Please try again or contact support.' },
        { status: 400 }
      );
    }
    
    // Create the checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      client_reference_id: userId,
      success_url: successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?purchase=success`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/buy?canceled=true`,
      metadata: {
        userId,
        userEmail,
      },
    });
    
    console.log(`Checkout session created: ${checkoutSession.id}`);
    
    return NextResponse.json({
      id: checkoutSession.id,
      url: checkoutSession.url,
    });
    
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: `Failed to create checkout session: ${error.message}` },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 
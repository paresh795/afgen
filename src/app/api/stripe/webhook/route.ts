import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-server';

// Initialize Stripe with the secret key
const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || '',
  {
    apiVersion: undefined,
    typescript: true,
  }
);

// Define credit amounts for each price ID directly (server-side)
const PRICE_CREDITS: Record<string, { credits: number; amount: number }> = {
  // Hard-coded price IDs from .env.local
  'price_1RGris9MBJQAF6A3R5NcMUS8': { credits: 1, amount: 199 }, // Single
  'price_1RGrjJ9MBJQAF6A3hkZwiIUi': { credits: 4, amount: 699 }, // Group
};

export async function POST(request: NextRequest) {
  // ADD THIS LINE FOR EARLY LOGGING
  // console.log('[Webhook] Received request'); 
  
  const body = await request.text();
  const signature = headers().get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    // Verify the event with the webhook secret
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown webhook error';
    console.error(`Webhook signature verification failed: ${message}`);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  // console.log(`Received Stripe webhook event: ${event.type}`);

  // Handle the event based on its type
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Make sure we have the client_reference_id (user's ID)
    if (!session.client_reference_id) {
      console.error('No client_reference_id found in session');
      return new NextResponse('No user ID in session', { status: 400 });
    }

    const userId = session.client_reference_id;
    
    // First, try to get the price ID from the session metadata if available
    // This is a more reliable approach
    let priceId = '';
    let creditsToAdd = 0;
    
    // Try to get expanded session with line items
    try {
      // console.log(`Retrieving complete session details for ${session.id}`);
      const expandedSession = await stripe.checkout.sessions.retrieve(
        session.id,
        { expand: ['line_items.data.price'] }
      );
      
      // Log what we received
      // console.log(`Session details retrieved:`, {
      //  hasLineItems: !!expandedSession.line_items,
      //  lineItemsCount: expandedSession.line_items?.data?.length || 0
      // });
      
      // Extract the price ID from the first line item
      if (expandedSession.line_items?.data && expandedSession.line_items.data.length > 0) {
        const lineItem = expandedSession.line_items.data[0];
        priceId = lineItem.price?.id || '';
        
        // console.log(`Found price ID in expanded session: ${priceId}`);
      }
    } catch (error) {
      console.error('Error retrieving expanded session:', error);
    }
    
    // If we have a valid price ID, look up the credits
    if (priceId) {
      // Check if we have a predetermined credit amount for this price ID
      if (priceId in PRICE_CREDITS) {
        creditsToAdd = PRICE_CREDITS[priceId].credits;
        // console.log(`Matched price ID ${priceId} to ${creditsToAdd} credits`);
      } else {
        // Fallback to environment variables if available
        // console.log(`Price ID ${priceId} not in predefined mapping, checking against env vars`);
        
        // Check against environment variables
        if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE_ID) {
          creditsToAdd = 1;
          // console.log(`Matched price ID to SINGLE via env var: ${creditsToAdd} credits`);
        } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_GROUP_ID) {
          creditsToAdd = 4;
          // console.log(`Matched price ID to GROUP via env var: ${creditsToAdd} credits`);
        }
      }
    }
    
    // If we still couldn't determine credits, use a fallback
    if (!creditsToAdd) {
      // console.log(`Could not determine credits from price ID, using fallback logic`);
      
      // Fallback to session amount if available
      const amountTotal = session.amount_total;
      if (amountTotal) {
        // If amount is closer to $6.99, it's likely a group plan
        creditsToAdd = amountTotal >= 500 ? 4 : 1;
        // console.log(`Using amount-based fallback, amount: ${amountTotal}, credits: ${creditsToAdd}`);
      } else {
        // Final fallback: default to 1 credit
        creditsToAdd = 1;
        // console.log(`Using absolute fallback: 1 credit`);
      }
    }
    
    // Add the credits to the user's account
    // console.log(`Adding ${creditsToAdd} credits to user ${userId} from session ${session.id}`);
    await addCreditsToUser(userId, creditsToAdd, session.id);
  }

  return new NextResponse('Success', { status: 200 });
}

/**
 * Add credits to a user's account
 */
async function addCreditsToUser(userId: string, creditsToAdd: number, sessionId: string) {
  try {
    // console.log(`[CREDITS] Adding ${creditsToAdd} credits to user ${userId}`);
    
    // Get current credits
    const { data: creditsData, error: creditsError } = await supabaseAdmin
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single();
    
    if (creditsError) {
      console.error(`Error fetching user credits:`, creditsError);
      
      // If no row found, create a new one
      if (creditsError.message.includes('No rows found')) {
        const { error: insertError } = await supabaseAdmin
          .from('credits')
          .insert({
            user_id: userId,
            balance: creditsToAdd,
            updated_at: new Date().toISOString(),
          });
          
        if (insertError) {
          throw new Error(`Error creating credits record: ${insertError.message}`);
        }
        
        console.log(`[CREDITS] Created new credits record with ${creditsToAdd} credits for user ${userId}`);
        
        // Continue with recording the payment after creating the credits record
        await recordPayment(userId, creditsToAdd, sessionId);
        return;
      } else {
        throw new Error(`Error fetching user credits: ${creditsError.message}`);
      }
    }
    
    // Calculate new balance
    const currentBalance = creditsData?.balance || 0;
    const newBalance = currentBalance + creditsToAdd;
    
    // console.log(`[CREDITS] Updating balance from ${currentBalance} to ${newBalance} for user ${userId}`);
    
    // Update credits
    const { error: updateError } = await supabaseAdmin
      .from('credits')
      .upsert({
        user_id: userId,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      });
      
    if (updateError) {
      throw new Error(`Error updating credits: ${updateError.message}`);
    }
    
    // Record the payment
    await recordPayment(userId, creditsToAdd, sessionId);
    
    // console.log(`[CREDITS] Successfully added ${creditsToAdd} credits to user ${userId}`);
    
  } catch (error) {
    console.error('[CREDITS] Error adding credits to user:', error);
    throw error;
  }
}

/**
 * Record a payment in the payments table
 */
async function recordPayment(userId: string, creditsAdded: number, sessionId: string) {
  try {
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: userId,
        stripe_session: sessionId,
        // Amount based on credits - UPDATED FOR NEW GROUP PRICE
        amount_cents: creditsAdded === 1 ? 199 : 499,
        credits_added: creditsAdded,
        status: 'completed',
        created_at: new Date().toISOString(),
      });
      
    if (paymentError) {
      console.error(`[PAYMENT] Error recording payment:`, paymentError);
      // Don't throw here - credits were already added
    } else {
      // console.log(`[PAYMENT] Successfully recorded payment for ${creditsAdded} credits`);
    }
  } catch (error) {
    console.error('[PAYMENT] Error recording payment:', error);
    // Don't throw - payment recording is secondary to adding credits
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 
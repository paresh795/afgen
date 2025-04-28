import Stripe from 'stripe';
import { formatPrice } from './utils';
import { PRICE_IDS } from './stripe-config';

// Initialize Stripe with secret key
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || '',
  {
    apiVersion: undefined, // Let Stripe use the latest API version
    typescript: true,
  }
);

// Export PRICE_IDS for convenience in server components
export { PRICE_IDS };

// Create a Stripe Checkout Session
export async function createCheckoutSession({
  priceId,
  userId,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
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
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
  });

  return session;
}

// Get a user's payment history
export async function getUserPaymentHistory(userId: string) {
  // Just get all recent sessions and filter manually
  // This is a simplified approach for the MVP
  const sessions = await stripe.checkout.sessions.list({
    limit: 100,
    expand: ['data.line_items'],
  });

  // Filter for this user's sessions
  const userSessions = sessions.data.filter(
    (session) => session.client_reference_id === userId
  );

  return userSessions.slice(0, 10).map((session) => ({
    id: session.id,
    amount: formatPrice(session.amount_total || 0),
    status: session.payment_status || 'unknown',
    created: new Date(session.created * 1000),
    credits: session.metadata?.credits || '0',
  }));
} 
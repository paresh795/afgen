"use client";

import { loadStripe } from '@stripe/stripe-js';

// Debug logging for Stripe key
console.log('Stripe key status:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Publishable key is set' : 'Publishable key is NOT set');

// Safety check for key availability
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!publishableKey) {
  console.error('CRITICAL ERROR: Stripe publishable key is not available. Check your environment variables.');
}

// Load Stripe.js client side only with publishable key
const stripePromise = loadStripe(publishableKey || '');

// Export with diagnostics
export default stripePromise; 
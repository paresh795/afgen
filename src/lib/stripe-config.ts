"use client";

// Price IDs from Stripe dashboard
export const PRICE_IDS = {
  SINGLE: process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE_ID || 'price_single_199',
  GROUP: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROUP_ID || 'price_group_699',
};

// Credit plans
export const CREDIT_PLANS = [
  {
    id: PRICE_IDS.SINGLE,
    name: 'Single',
    description: 'Generate 1 action figure',
    priceDisplay: '$1.99',
    priceCents: 199,
    credits: 1,
  },
  {
    id: PRICE_IDS.GROUP,
    name: 'Group',
    description: 'Generate up to 4 action figures',
    priceDisplay: '$4.99',
    priceCents: 499,
    credits: 4,
    popular: true,
  },
]; 
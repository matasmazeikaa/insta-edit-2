import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export interface UsageInfo {
  canGenerate: boolean;
  isPremium: boolean;
  used: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
}

export interface SubscriptionInfo {
  status: 'free' | 'active' | 'canceled' | 'past_due';
  currentPeriodEnd?: string;
  priceId?: string;
}

/**
 * Check if user can use AI features
 */
export async function checkAIUsage(): Promise<UsageInfo> {
  const response = await fetch('/api/ai/check-usage');
  
  if (!response.ok) {
    throw new Error('Failed to check AI usage');
  }
  
  return response.json();
}

/**
 * Increment AI usage after a successful generation
 */
export async function incrementAIUsage(
  generationType: string = 'video_analysis',
  metadata?: Record<string, any>
): Promise<{ success: boolean; newCount: number }> {
  const response = await fetch('/api/ai/increment-usage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ generationType, metadata }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to increment AI usage');
  }
  
  return response.json();
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(priceId: string): Promise<void> {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priceId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }
  
  const { url } = await response.json();
  
  // Redirect to Stripe checkout
  if (url) {
    window.location.href = url;
  }
}

/**
 * Open customer portal for subscription management
 */
export async function openCustomerPortal(): Promise<void> {
  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to open customer portal');
  }
  
  const { url } = await response.json();
  
  if (url) {
    window.location.href = url;
  }
}

// Price IDs - Update these with your actual Stripe price IDs
export const PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || 'price_monthly',
  yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY || 'price_yearly',
};

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      '3 AI generations per month',
      'Basic video editing',
      'Export in 720p',
      'Community support',
    ],
    limitations: [
      'Limited AI features',
      'Watermark on exports',
    ],
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    features: [
      'Unlimited AI generations',
      'Advanced video editing',
      'Export in 4K',
      'Priority support',
      'No watermarks',
      'Cloud storage for projects',
      'Advanced AI features',
    ],
  },
};


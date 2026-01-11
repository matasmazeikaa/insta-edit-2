# Stripe Integration Setup Guide

This guide walks you through setting up Stripe payments for InstaEdit.

## 1. Stripe Account Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Navigate to the Dashboard

## 2. Create Products & Prices

In your Stripe Dashboard:

1. Go to **Products** → **Add Product**
2. Create a product called "InstaEdit Pro"
3. Add two prices:
   - **Monthly**: $9.99/month (recurring)
   - **Yearly**: $99.99/year (recurring)
4. Copy the `price_xxx` IDs for each

## 3. Get API Keys

1. Go to **Developers** → **API Keys**
2. Copy your **Publishable key** (starts with `pk_`)
3. Copy your **Secret key** (starts with `sk_`)

## 4. Set Up Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/stripe/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)

## 5. Configure Customer Portal

1. Go to **Settings** → **Billing** → **Customer portal**
2. Enable the portal
3. Configure allowed actions:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to view invoice history
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to switch plans

## 6. Environment Variables

Add these to your `.env.local`:

```env
# Supabase (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Stripe Price IDs (from step 2)
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_YEARLY=price_xxx
```

> **Note**: The `SUPABASE_SERVICE_ROLE_KEY` is required for webhook handling to bypass Row Level Security.

## 7. Database Migration

Run the Supabase migration to create the required tables:

```bash
supabase db push
```

Or run manually:

```sql
-- See supabase/migrations/002_create_subscriptions_and_ai_usage.sql
```

## 8. Testing

### Test Cards
Use these test card numbers in test mode:
- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **Requires auth**: `4000 0025 0000 3155`

### Test Webhook Locally
Use the Stripe CLI to forward webhooks to localhost:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Features Implemented

### For Users:
- ✅ 3 free AI generations per month
- ✅ Unlimited AI generations with Pro subscription
- ✅ Subscription management page (`/subscription`)
- ✅ Upgrade prompts when limit reached
- ✅ Cancel subscription via Stripe Customer Portal

### Technical:
- ✅ Checkout session creation
- ✅ Webhook handling for subscription events
- ✅ Customer portal for self-service
- ✅ AI usage tracking and limits
- ✅ Row-level security on user data

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stripe/checkout` | POST | Create checkout session |
| `/api/stripe/webhook` | POST | Handle Stripe webhooks |
| `/api/stripe/portal` | POST | Create customer portal session |
| `/api/ai/check-usage` | GET | Check AI usage limits |
| `/api/ai/increment-usage` | POST | Increment AI usage counter |

## Troubleshooting

### Webhook not receiving events
1. Check the webhook URL is correct
2. Ensure the signing secret matches
3. Check Stripe Dashboard for failed webhook deliveries

### Customer portal not working
1. Ensure you've enabled it in Stripe settings
2. Check the user has a `stripeCustomerId` in the database

### Usage not resetting
The `aiGenerationsUsed` counter resets monthly based on `aiGenerationsResetAt`. You can also call the `reset_monthly_ai_generations()` function in Supabase to reset manually.


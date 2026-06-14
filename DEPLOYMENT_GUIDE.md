# The Patternizer Deployment Guide

This folder is now structured like a small Vercel project.

## What You Have

- `index.html`: CRED-style landing page with Sign in and demo entry.
- `the-patternizer.html`: the actual Patternizer app.
- `api/access-status.js`: checks Supabase to see whether a signed-in user is paid.
- `api/create-razorpay-order.js`: creates a Razorpay checkout order.
- `api/razorpay-webhook.js`: receives Razorpay payment confirmation and marks the user paid in Supabase.
- `supabase-schema.sql`: database table, RLS policy, and auto-profile trigger.
- `package.json`: serverless API dependencies for Vercel.
- `vercel.json`: makes `/` load the landing page.

## How The Business Flow Works

1. User opens the Vercel landing page.
2. User clicks Sign in.
3. Supabase authenticates the user.
4. Vercel calls `/api/access-status`.
5. If `is_paid = true`, user opens `the-patternizer.html?access=paid`.
6. If `is_paid = false`, user opens `the-patternizer.html?access=demo`.
7. Demo mode lets the user upload any supported file, but only the first 30 rows are analysed.
8. Demo users see the always-visible `ANALYSE FULL DATA` button.
9. That button calls `/api/create-razorpay-order` and opens Razorpay checkout.
10. Razorpay calls `/api/razorpay-webhook` after successful payment.
11. The webhook verifies the signature and updates Supabase `profiles.is_paid = true`.
12. Next sign-in gives the user full access.

## Step By Step Setup

### 1. Create Supabase Project

1. Go to Supabase.
2. Create a new project.
3. Open SQL Editor.
4. Paste and run everything from `supabase-schema.sql`.
5. Go to Authentication settings.
6. Enable email magic-link/OTP sign-in.
7. Add your Vercel URL to allowed redirect URLs after deployment.

### 2. Fill Supabase Keys In Landing Page

Open `index.html` and replace:

```js
const SUPABASE_URL = "REPLACE_WITH_SUPABASE_URL";
const SUPABASE_ANON_KEY = "REPLACE_WITH_SUPABASE_ANON_KEY";
```

Use:

- Supabase Project URL
- Supabase anon public key

Do not put the service role key in HTML.

### 3. Create Razorpay Account

1. Create a Razorpay account.
2. Get test keys first.
3. Later switch to live keys after testing.
4. Create a webhook in Razorpay:
   - URL: `https://YOUR-VERCEL-DOMAIN.vercel.app/api/razorpay-webhook`
   - Events: `payment.captured` and `order.paid`
5. Copy the webhook secret.

### 4. Deploy To Vercel

1. Put this `outputs` folder into a GitHub repository.
2. Import the repository in Vercel.
3. Set the project root to this folder if needed.
4. Add these Environment Variables in Vercel:

```txt
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
PATTERNIZER_PRICE_PAISE=49900
```

`PATTERNIZER_PRICE_PAISE=49900` means INR 499. Change it to your price.

### 5. Test The Product

Test demo:

1. Open the landing page.
2. Click `Try demo with 30 rows`.
3. Upload a large file.
4. Confirm the Quick Summary says Demo and only 30 rows are analysed.
5. Confirm `ANALYSE FULL DATA` is visible.

Test paid:

1. Sign in with your email.
2. In Supabase, manually set your row in `profiles` to `is_paid = true`.
3. Sign in again.
4. Confirm full data is analysed.

Test payment:

1. Use Razorpay test mode.
2. Click `ANALYSE FULL DATA`.
3. Complete test payment.
4. Check Razorpay webhook delivery.
5. Check Supabase `profiles.is_paid`.

## Important Security Notes

- Demo limits in the browser are useful for product behavior, but paid access must be enforced by Supabase/server checks in production.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.
- Never mark a user paid from the Razorpay client handler alone.
- The webhook is the trusted payment source because it verifies Razorpay's signature.
- Keep RLS enabled on Supabase tables exposed to the browser.

## What To Improve Before Launch

- Link Razorpay orders to Supabase user IDs, not only email.
- Add a pricing page and invoice/GST handling.
- Add a subscription table if you want monthly access instead of lifetime unlock.
- Add a logout button.
- Add a real account page with access status.
- Add server-side file processing if datasets become very large or sensitive.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  monthly: 'price_1TlWqQPsEaep6taMVSjiktWo',
  season:  'price_1TlWp4PsEaep6taMXgtBhgJB',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plan } = req.body;
  const priceId = PRICES[plan];

  if (!priceId) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  // Get the logged-in user from the auth token (if present)
  let userEmail = null;
  let userId = null;
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (token) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userEmail = user.email;
        userId = user.id;
      }
    } catch (e) {
      // Non-fatal — proceed without user context
    }
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://orangeff.app';

    const session = await stripe.checkout.sessions.create({
      mode: plan === 'monthly' ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?subscribed=true`,
      cancel_url:  `${appUrl}/pricing`,
      allow_promotion_codes: true,
      // Pre-fill email if user is logged in
      ...(userEmail && { customer_email: userEmail }),
      metadata: {
        plan,
        // Pass user ID so the webhook can link subscription to Supabase user
        ...(userId && { supabase_user_id: userId }),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
}

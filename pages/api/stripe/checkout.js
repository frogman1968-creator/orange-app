import Stripe from 'stripe';

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

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://orange-app-sigma.vercel.app';

    const session = await stripe.checkout.sessions.create({
      mode: plan === 'monthly' ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?subscribed=true`,
      cancel_url:  `${appUrl}/pricing`,
      allow_promotion_codes: true,
      metadata: { plan },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
}

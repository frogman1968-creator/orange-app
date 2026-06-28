import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const session = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const customerId = session.customer;
      const plan      = session.metadata?.plan;
      const email     = session.customer_details?.email;
      // supabase_user_id is passed from checkout.js metadata when user is logged in
      const userId    = session.metadata?.supabase_user_id || null;

      await supabase.from('subscriptions').upsert({
        stripe_customer_id: customerId,
        email,
        user_id: userId,
        plan,
        status: 'active',
        created_at: new Date().toISOString(),
      }, { onConflict: 'stripe_customer_id' });
      break;
    }

    case 'customer.subscription.deleted': {
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('stripe_customer_id', session.customer);
      break;
    }

    case 'invoice.payment_failed': {
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_customer_id', session.customer);
      break;
    }
  }

  res.json({ received: true });
}

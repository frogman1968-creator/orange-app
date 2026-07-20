import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Service-role client — bypasses RLS, required for admin user lookups
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

/**
 * Look up a Supabase user ID by email using the Admin API.
 * The client SDK cannot query auth.users directly — must use auth.admin.
 */
async function getUserIdByEmail(email) {
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error || !data?.users) return null;
    const match = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    return match?.id || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  console.log(`[stripe/webhook] Event received: ${event.type} | id: ${event.id}`);

  const obj = event.data.object;

  switch (event.type) {

    case 'checkout.session.completed': {
      const customerId = obj.customer;
      const plan       = obj.metadata?.plan;
      const email      = obj.customer_details?.email;

      // Prefer user_id from metadata (set at checkout when user was logged in)
      let userId = obj.metadata?.supabase_user_id || null;

      // Fallback: look up by email via Admin API
      if (!userId && email) {
        userId = await getUserIdByEmail(email);
        console.log(`[stripe/webhook] Email fallback lookup for ${email}: userId=${userId}`);
      }

      console.log(`[stripe/webhook] checkout.session.completed | customer=${customerId} plan=${plan} userId=${userId} email=${email}`);

      const { error } = await supabase.from('subscriptions').upsert({
        stripe_customer_id: customerId,
        email,
        user_id:    userId,
        plan:       plan || 'unknown',
        status:     'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'stripe_customer_id' });

      if (error) console.error('[stripe/webhook] Supabase upsert error:', error.message);
      else console.log('[stripe/webhook] Subscription upserted successfully');
      break;
    }

    case 'customer.subscription.updated': {
      const sub = obj;
      console.log(`[stripe/webhook] subscription.updated | customer=${sub.customer} status=${sub.status}`);
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: sub.status, updated_at: new Date().toISOString() })
        .eq('stripe_customer_id', sub.customer);
      if (error) console.error('[stripe/webhook] Update error:', error.message);
      break;
    }

    case 'customer.subscription.deleted': {
      console.log(`[stripe/webhook] subscription.deleted | customer=${obj.customer}`);
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('stripe_customer_id', obj.customer);
      break;
    }

    case 'invoice.payment_failed': {
      console.log(`[stripe/webhook] invoice.payment_failed | customer=${obj.customer}`);
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('stripe_customer_id', obj.customer);
      break;
    }

    default:
      console.log(`[stripe/webhook] Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
}

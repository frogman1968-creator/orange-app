/**
 * POST /api/push/subscribe
 * Stores a push subscription in Supabase.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const subscription = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase.from('push_subscriptions').upsert({
      endpoint:    subscription.endpoint,
      p256dh:      subscription.keys?.p256dh,
      auth:        subscription.keys?.auth,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'endpoint' });

    res.json({ ok: true });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ error: err.message });
  }
}

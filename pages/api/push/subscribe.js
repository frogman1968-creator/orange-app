/**
 * POST /api/push/subscribe
 * Stores a push subscription in Supabase, linked to the authenticated user.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const subscription = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });

  // Get user from auth header (optional — anon subscriptions still work)
  const token = req.headers.authorization?.replace('Bearer ', '');
  let userId = null;

  if (token) {
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    userId = user?.id || null;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase.from('push_subscriptions').upsert({
      endpoint:   subscription.endpoint,
      p256dh:     subscription.keys?.p256dh,
      auth:       subscription.keys?.auth,
      user_id:    userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });

    res.json({ ok: true });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/push/send
 * Sends a push notification to all subscribed users (or a specific endpoint).
 *
 * Body: { title, body, url, tag, endpoint? }
 * If endpoint is provided, sends only to that subscriber.
 * Otherwise broadcasts to all.
 *
 * Required env vars:
 *   VAPID_PRIVATE_KEY
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *   VAPID_SUBJECT (mailto:you@yourdomain.com)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * To generate VAPID keys, run:
 *   npx web-push generate-vapid-keys
 */

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:frogman1968@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { title, body, url, tag, endpoint } = req.body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Fetch target subscriptions
  let query = supabase.from('push_subscriptions').select('*');
  if (endpoint) query = query.eq('endpoint', endpoint);
  const { data: subs, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  if (!subs?.length) return res.json({ sent: 0 });

  const payload = JSON.stringify({ title, body, url: url || '/dashboard', tag });
  let sent = 0, failed = 0;

  await Promise.allSettled(subs.map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err) {
      failed++;
      // Remove expired/invalid subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  }));

  res.json({ sent, failed });
}

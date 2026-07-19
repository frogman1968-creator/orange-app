/**
 * GET /api/push/triggers/lineup-reminder
 * Cron: 0 15 * * 0  (Sunday 11am ET = 15:00 UTC)
 *
 * Sends a "Lineup locks in 2 hours" push to all subscribers.
 * Secured by CRON_SECRET so only Vercel cron (or your server) can call it.
 */

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:frogman1968@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export default async function handler(req, res) {
  // Vercel cron passes Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth');

  if (error) return res.status(500).json({ error: error.message });
  if (!subs?.length) return res.json({ sent: 0 });

  const payload = JSON.stringify({
    title: '🏈 Lineup locks in 2 hours',
    body:  'Check your starters before kickoff — Orange has your back.',
    url:   '/lineup',
    tag:   'lineup-reminder',
  });

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
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  }));

  console.log(`[lineup-reminder] sent=${sent} failed=${failed}`);
  res.json({ sent, failed });
}

/**
 * POST /api/trash/confirm
 * Winner marks a resolved bet as paid or flags the opponent as a deadbeat.
 *
 * Body: { bet_id, action: 'paid' | 'deadbeat' }
 * Only the bet owner (user who created it) can call this, and only on won bets.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const { bet_id, action } = req.body;
  if (!bet_id || !action) return res.status(400).json({ error: 'bet_id and action required' });
  if (!['paid', 'deadbeat'].includes(action)) return res.status(400).json({ error: 'action must be paid or deadbeat' });

  // Fetch the bet — RLS ensures this user owns it
  const { data: bet, error: fetchErr } = await supabase
    .from('trash_talk_bets')
    .select('*')
    .eq('id', bet_id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !bet) return res.status(404).json({ error: 'Bet not found' });
  if (bet.status !== 'won') return res.status(400).json({ error: 'Can only confirm payment on won bets' });
  if (bet.payment_status === 'paid') return res.status(400).json({ error: 'Already marked as paid' });

  const { data: updated, error: updateErr } = await supabase
    .from('trash_talk_bets')
    .update({ payment_status: action })
    .eq('id', bet_id)
    .select()
    .single();

  if (updateErr) return res.status(500).json({ error: updateErr.message });

  return res.json({ bet: updated });
}

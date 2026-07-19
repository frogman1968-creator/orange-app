/**
 * GET /api/trash/share?token=UUID
 * Public endpoint — no auth required.
 * Returns bet details for the shareable challenge page.
 */

import { createClient } from '@supabase/supabase-js';

const BET_TYPE_LABELS = {
  total_score: 'Total Team Score',
  rb_pts:      'RB Points',
  wr_pts:      'WR Points',
  qb_pts:      'QB Points',
  te_pts:      'TE Points',
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token required' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: bet, error } = await supabase
    .from('trash_talk_bets')
    .select('id, my_team_name, opp_team_name, week, stake, bet_type, status, payment_status, created_at, league_key')
    .eq('share_token', token)
    .single();

  if (error || !bet) return res.status(404).json({ error: 'Bet not found' });

  return res.json({
    id:            bet.id,
    challenger:    bet.my_team_name,
    opponent:      bet.opp_team_name,
    week:          bet.week,
    stake:         bet.stake,
    betType:       BET_TYPE_LABELS[bet.bet_type] || bet.bet_type,
    status:        bet.status,
    paymentStatus: bet.payment_status,
    createdAt:     bet.created_at,
  });
}

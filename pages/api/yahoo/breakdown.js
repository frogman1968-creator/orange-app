/**
 * GET /api/yahoo/breakdown?team_key=XXX&league_key=XXX
 *
 * Fetches all data needed for the Monday Breakdown:
 *   - Last completed matchup (week, result, scores, opponent)
 *   - User's roster with per-player points (starters + bench)
 *   - Cached league scoring summary
 *
 * Returns structured breakdown data ready for AI processing.
 */

import { createClient } from '@supabase/supabase-js';
import { getYahooToken } from '../../../lib/getYahooToken';
import { getLastCompletedMatchup, getRosterWithScores } from '../../../lib/yahooApi';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { team_key, league_key } = req.query;
  if (!team_key || !league_key) {
    return res.status(400).json({ error: 'team_key and league_key required' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const { access_token, error: tokenErr } = await getYahooToken(user.id, supabase);
  if (tokenErr) return res.status(401).json({ error: tokenErr, reconnect: true });

  try {
    // 1. Get last completed matchup
    const matchup = await getLastCompletedMatchup(access_token, team_key);
    if (!matchup) {
      return res.status(404).json({ error: 'No completed matchup found yet. Check back after your first game.' });
    }

    // 2. Get user's roster with actual scores for that week
    const { starters, bench } = await getRosterWithScores(access_token, team_key, matchup.week);

    // 3. Pull cached scoring summary from Supabase
    const { data: leagueSettings } = await supabase
      .from('league_settings')
      .select('scoring_summary, scoring_format')
      .eq('user_id', user.id)
      .eq('league_key', league_key)
      .single();

    return res.json({
      week:          matchup.week,
      result:        matchup.result,
      myScore:       matchup.myScore,
      oppScore:      matchup.oppScore,
      oppTeamName:   matchup.oppTeamName,
      starters,
      bench,
      scoringSummary: leagueSettings?.scoring_summary || null,
      scoringFormat:  leagueSettings?.scoring_format  || 'Standard',
    });
  } catch (err) {
    console.error('Breakdown data error:', err);
    return res.status(500).json({ error: 'Failed to load breakdown data from Yahoo.' });
  }
}

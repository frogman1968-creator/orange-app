/**
 * POST /api/trash/settle
 * Fetches live/final Yahoo scores for the current week and resolves
 * any pending bets for the requesting user.
 *
 * Body: { league_key, team_key }
 * Returns: { resolved: number, bets: updatedBets[] }
 */

import { createClient } from '@supabase/supabase-js';
import { getYahooToken } from '../../../lib/getYahooToken';

const BASE = 'https://fantasysports.yahooapis.com/fantasy/v2';

async function yahooFetch(path, accessToken) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Yahoo API ${res.status}`);
  return res.json();
}

/**
 * Get all team scores for a league in a given week.
 * Returns map: { teamKey: points }
 */
async function getWeekScores(accessToken, leagueKey, week) {
  const data = await yahooFetch(
    `/league/${leagueKey}/scoreboard;week=${week}?format=json`,
    accessToken
  );

  const matchups = data?.fantasy_content?.league?.[1]?.scoreboard?.[0]?.matchups;
  const scores = {};
  const count = matchups?.count || 0;

  for (let i = 0; i < count; i++) {
    const matchup = matchups[i]?.matchup;
    if (!matchup) continue;
    const teams = matchup['0']?.teams;
    for (let t = 0; t <= 1; t++) {
      const team = teams?.[String(t)]?.team;
      if (!team) continue;
      const teamKey = team[0]?.find?.(x => x?.team_key)?.team_key;
      const pts     = parseFloat(team[1]?.team_points?.total || 0);
      if (teamKey) scores[teamKey] = pts;
    }
  }

  return scores;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const { league_key, week } = req.body;
  if (!league_key || !week) return res.status(400).json({ error: 'league_key and week required' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get Yahoo token
  const { access_token, error: tokenErr } = await getYahooToken(user.id, supabase);
  if (tokenErr) return res.status(401).json({ error: tokenErr, reconnect: true });

  // Fetch scores
  let scores;
  try {
    scores = await getWeekScores(access_token, league_key, week);
  } catch (err) {
    return res.status(500).json({ error: 'Could not fetch scores from Yahoo' });
  }

  // Fetch pending bets for this user + league + week
  const { data: pendingBets, error: fetchErr } = await supabase
    .from('trash_talk_bets')
    .select('*')
    .eq('user_id', user.id)
    .eq('league_key', league_key)
    .eq('week', parseInt(week, 10))
    .eq('status', 'pending');

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!pendingBets || pendingBets.length === 0) {
    return res.json({ resolved: 0, bets: [] });
  }

  // Resolve each bet
  const updates = [];
  for (const bet of pendingBets) {
    const myPts  = scores[bet.my_team_key];
    const oppPts = scores[bet.opp_team_key];

    // Only resolve if both scores are present
    if (myPts === undefined || oppPts === undefined) continue;

    let status = 'tied';
    if (myPts > oppPts) status = 'won';
    else if (myPts < oppPts) status = 'lost';

    const { data: updated } = await supabase
      .from('trash_talk_bets')
      .update({ status, my_pts: myPts, opp_pts: oppPts })
      .eq('id', bet.id)
      .select()
      .single();

    if (updated) updates.push(updated);
  }

  return res.json({ resolved: updates.length, bets: updates });
}

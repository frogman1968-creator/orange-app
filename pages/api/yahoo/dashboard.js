/**
 * GET /api/yahoo/dashboard
 * Returns everything the dashboard needs in one call:
 * - User's league info
 * - Their team's current roster
 * - Current week matchup
 * - League standings
 *
 * Requires: Authorization: Bearer <supabase_access_token>
 * Query:    ?league_key=nfl.l.XXXXX&team_key=nfl.t.XXXXX
 */

import { createClient } from '@supabase/supabase-js';
import { getYahooToken } from '../../../lib/getYahooToken';
import {
  getLeagueStandings,
  getTeamRoster,
  getCurrentMatchup,
} from '../../../lib/yahooApi';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { league_key, team_key } = req.query;
  if (!league_key || !team_key) {
    return res.status(400).json({ error: 'league_key and team_key required' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get Supabase user
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  // Check Yahoo account is connected
  const { data: tokenRow } = await supabase
    .from('yahoo_tokens')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (!tokenRow) return res.status(404).json({ error: 'Yahoo account not connected', reconnect: true });

  const { access_token, error } = await getYahooToken(user.id, supabase);
  if (error) return res.status(401).json({ error, reconnect: true });

  try {
    // Fetch all data in parallel
    const [standingsData, roster, matchup] = await Promise.all([
      getLeagueStandings(access_token, league_key),
      getTeamRoster(access_token, team_key),
      getCurrentMatchup(access_token, team_key),
    ]);

    return res.json({
      league:   standingsData.leagueInfo,
      teams:    standingsData.teams,
      roster,
      matchup,
    });
  } catch (err) {
    console.error('Yahoo dashboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch data from Yahoo' });
  }
}

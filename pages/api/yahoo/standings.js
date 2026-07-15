/**
 * GET /api/yahoo/standings
 * Returns all teams in a league with win/loss records and points.
 *
 * Query: ?league_key=nfl.l.XXXXX
 * Requires: Authorization: Bearer <supabase_access_token>
 */

import { createClient } from '@supabase/supabase-js';
import { getYahooToken } from '../../../lib/getYahooToken';
import { getLeagueStandings } from '../../../lib/yahooApi';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { league_key } = req.query;
  if (!league_key) return res.status(400).json({ error: 'league_key required' });

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

  const { data: tokenRow } = await supabase
    .from('yahoo_tokens')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (!tokenRow) return res.status(404).json({ error: 'Yahoo account not connected', reconnect: true });

  const { access_token, error } = await getYahooToken(user.id, supabase);
  if (error) return res.status(401).json({ error, reconnect: true });

  try {
    const { teams } = await getLeagueStandings(access_token, league_key);
    return res.json({ teams });
  } catch (err) {
    console.error('Standings error:', err);
    return res.status(500).json({ error: 'Failed to fetch standings from Yahoo' });
  }
}

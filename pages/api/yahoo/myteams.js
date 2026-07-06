/**
 * GET /api/yahoo/myteams
 * Returns the user's NFL fantasy teams with league_key and team_key.
 * Used to bootstrap the dashboard without needing the user to select a league.
 *
 * Requires: Authorization: Bearer <supabase_access_token>
 */

import { createClient } from '@supabase/supabase-js';
import { getYahooToken } from '../../../lib/getYahooToken';

const BASE = 'https://fantasysports.yahooapis.com/fantasy/v2';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

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
    const resp = await fetch(
      `${BASE}/users;use_login=1/games;game_keys=nfl/teams?format=json`,
      { headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' } }
    );

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Yahoo myteams error:', text);
      return res.status(502).json({ error: 'Failed to fetch teams from Yahoo' });
    }

    const data = await resp.json();
    const gamesObj = data?.fantasy_content?.users?.[0]?.user?.[1]?.games;
    const teams = [];

    const gameCount = gamesObj?.count || 0;
    for (let g = 0; g < gameCount; g++) {
      const game = gamesObj[g]?.game;
      if (!game) continue;
      const teamsObj = game[1]?.teams;
      const teamCount = teamsObj?.count || 0;
      for (let t = 0; t < teamCount; t++) {
        const teamArr = teamsObj[t]?.team?.[0];
        if (!teamArr) continue;
        const teamKey   = teamArr.find(x => x?.team_key)?.team_key;
        const name      = teamArr.find(x => x?.name)?.name;
        const leagueKey = teamKey?.split('.t.')?.[0]; // e.g. nfl.l.XXXXX
        if (teamKey && leagueKey) {
          teams.push({ teamKey, leagueKey, name });
        }
      }
    }

    return res.json({ teams });
  } catch (err) {
    console.error('myteams error:', err);
    return res.status(500).json({ error: 'Failed to fetch teams' });
  }
}

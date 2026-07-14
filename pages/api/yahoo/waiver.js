/**
 * GET /api/yahoo/waiver
 * Returns ranked free agent / waiver wire players for a league.
 *
 * Query: ?league_key=nfl.l.XXXXX&team_key=nfl.t.XXXXX
 * Requires: Authorization: Bearer <supabase_access_token>
 */

import { createClient } from '@supabase/supabase-js';
import { getYahooToken } from '../../../lib/getYahooToken';
import { getFreeAgents, getTeamRoster } from '../../../lib/yahooApi';

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
    const [freeAgents, roster] = await Promise.all([
      getFreeAgents(access_token, league_key, 30),
      getTeamRoster(access_token, team_key),
    ]);

    // Score each player — higher = better pickup
    const rosterPositions = roster.map(p => p.position);
    const positionNeeds = {
      QB:  rosterPositions.filter(p => p === 'QB').length < 2  ? 1.2 : 0.8,
      RB:  rosterPositions.filter(p => p === 'RB').length < 3  ? 1.3 : 0.7,
      WR:  rosterPositions.filter(p => p === 'WR').length < 3  ? 1.3 : 0.7,
      TE:  rosterPositions.filter(p => p === 'TE').length < 2  ? 1.2 : 0.8,
      K:   rosterPositions.filter(p => p === 'K').length  < 1  ? 1.1 : 0.5,
      DEF: rosterPositions.filter(p => p === 'DEF').length < 1 ? 1.1 : 0.5,
    };

    const ranked = freeAgents
      .map((p, index) => {
        const needMultiplier = positionNeeds[p.position] || 1.0;
        const addRankScore   = Math.max(0, 30 - index) * 2; // higher = more adds
        const projScore      = p.projectedPts * 1.5;
        const healthPenalty  = p.injuryNote ? -8 : 0;
        const score          = (addRankScore + projScore) * needMultiplier + healthPenalty;

        return { ...p, score: Math.round(score * 10) / 10, needMultiplier };
      })
      .sort((a, b) => b.score - a.score);

    return res.json({ players: ranked, roster });
  } catch (err) {
    console.error('Waiver wire error:', err);
    return res.status(500).json({ error: 'Failed to fetch waiver data from Yahoo' });
  }
}

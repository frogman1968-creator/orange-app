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

    // ── Roster needs analysis ─────────────────────────────────────────────────
    const INJURY_OUT = ['out', 'ir', 'doubtful', 'pup', 'susp'];
    const INJURY_RISKY = ['questionable', 'probable'];

    const starters = roster.filter(p =>
      p.selectedPosition && !['BN', 'IR'].includes(p.selectedPosition)
    );

    // Find injured starters by position
    const injuredByPos = {};
    for (const p of starters) {
      const note = (p.injuryNote || '').toLowerCase();
      if (INJURY_OUT.some(s => note.includes(s))) {
        injuredByPos[p.position] = injuredByPos[p.position] || [];
        injuredByPos[p.position].push({ name: p.name, status: 'OUT' });
      } else if (INJURY_RISKY.some(s => note.includes(s))) {
        injuredByPos[p.position] = injuredByPos[p.position] || [];
        injuredByPos[p.position].push({ name: p.name, status: 'Q' });
      }
    }

    // Count healthy starters + bench per position
    const healthyCount = {};
    const totalCount = {};
    for (const p of roster) {
      if (['BN', 'IR'].includes(p.selectedPosition)) continue;
      const note = (p.injuryNote || '').toLowerCase();
      const isOut = INJURY_OUT.some(s => note.includes(s));
      totalCount[p.position] = (totalCount[p.position] || 0) + 1;
      if (!isOut) healthyCount[p.position] = (healthyCount[p.position] || 0) + 1;
    }

    // Build human-readable needs array (shown in "For My Team" mode)
    const rosterNeeds = [];

    // Injured starters
    for (const [pos, players] of Object.entries(injuredByPos)) {
      const names = players.map(p => p.name).join(', ');
      const status = players[0].status;
      rosterNeeds.push({
        pos,
        priority: status === 'OUT' ? 'high' : 'medium',
        reason: status === 'OUT'
          ? `${names} is OUT — you need a ${pos}`
          : `${names} is questionable — stream a ${pos} just in case`,
      });
    }

    // Thin positions (fewer than 2 healthy non-K/DEF starters)
    const minHealthy = { QB: 1, RB: 2, WR: 2, TE: 1 };
    for (const [pos, min] of Object.entries(minHealthy)) {
      const have = healthyCount[pos] || 0;
      if (have < min && !injuredByPos[pos]) {
        rosterNeeds.push({
          pos,
          priority: 'medium',
          reason: `Thin at ${pos} — only ${have} healthy starter${have !== 1 ? 's' : ''}`,
        });
      }
    }

    // Build need multiplier map for scoring
    const needMultiplierMap = { QB: 0.85, RB: 0.85, WR: 0.85, TE: 0.85, K: 0.6, DEF: 0.6 };
    for (const need of rosterNeeds) {
      needMultiplierMap[need.pos] = need.priority === 'high' ? 1.45 : 1.25;
    }

    // ── Score & rank players ──────────────────────────────────────────────────
    const ranked = freeAgents
      .map((p, index) => {
        const needMultiplier = needMultiplierMap[p.position] || 1.0;
        const addRankScore   = Math.max(0, 30 - index) * 2;
        const projScore      = p.projectedPts * 1.5;
        const healthPenalty  = p.injuryNote ? -8 : 0;
        const score          = (addRankScore + projScore) * needMultiplier + healthPenalty;
        // Attach roster fit reason if this position is needed
        const fitReason = rosterNeeds.find(n => n.pos === p.position)?.reason || null;

        return { ...p, score: Math.round(score * 10) / 10, needMultiplier, fitReason };
      })
      .sort((a, b) => b.score - a.score);

    return res.json({ players: ranked, roster, rosterNeeds });
  } catch (err) {
    console.error('Waiver wire error:', err);
    return res.status(500).json({ error: 'Failed to fetch waiver data from Yahoo' });
  }
}

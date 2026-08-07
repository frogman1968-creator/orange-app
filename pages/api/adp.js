/**
 * GET /api/adp
 * Fetches live PPR ADP data from Sleeper (free, no API key required).
 * Sleeper aggregates millions of real drafts — search_rank reflects current PPR draft position.
 * Caches in-memory for 2 hours.
 * Fallback: lib/sampleData.DRAFT_POOL (curated 2026 PPR rankings).
 */

import { DRAFT_POOL } from '../../lib/sampleData';

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

let cache = null;
let cacheTime = 0;

const FANTASY_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);

/**
 * Rough projected points estimate based on position and ADP.
 * Used for display only — the AI uses ADP for pick logic.
 */
function estimateProjectedPts(position, adp) {
  const base = {
    QB:  { start: 32, decay: 0.18 },
    RB:  { start: 28, decay: 0.22 },
    WR:  { start: 26, decay: 0.20 },
    TE:  { start: 18, decay: 0.15 },
    K:   { start: 11, decay: 0.05 },
    DEF: { start: 12, decay: 0.06 },
  }[position] || { start: 15, decay: 0.15 };
  return Math.max(5, parseFloat((base.start - base.decay * adp).toFixed(1)));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Serve cache if still fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL_MS) {
    return res.json({ players: cache, cached: true, source: 'sleeper' });
  }

  try {
    const response = await fetch('https://api.sleeper.app/v1/players/nfl', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'OrangeFF/1.0 (orangeff.app)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error(`Sleeper API returned ${response.status}`);

    const allPlayers = await response.json();

    const players = Object.values(allPlayers)
      .filter(p =>
        p.active &&
        p.search_rank != null &&
        p.search_rank < 400 &&
        p.fantasy_positions?.some(pos => FANTASY_POSITIONS.has(pos))
      )
      .sort((a, b) => a.search_rank - b.search_rank)
      .map((p, idx) => {
        const pos = p.position || p.fantasy_positions?.[0] || 'RB';
        const adp = idx + 1;
        return {
          id: `sleeper_${p.player_id}`,
          name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          position: pos,
          team: p.team || 'FA',
          adp,
          projectedPts: estimateProjectedPts(pos, adp),
          bye: 0,
        };
      });

    if (players.length < 30) {
      throw new Error(`Too few players from Sleeper: ${players.length}`);
    }

    cache = players;
    cacheTime = Date.now();

    console.log(`[adp] Fetched ${players.length} players from Sleeper`);

    return res.json({ players, cached: false, source: 'sleeper' });

  } catch (err) {
    console.error('[adp] Sleeper fetch failed:', err.message);

    // Stale cache is better than nothing
    if (cache) {
      return res.json({ players: cache, cached: true, stale: true, source: 'sleeper' });
    }

    // Hard fallback: curated 2026 PPR sample data (Gibbs #1, Robinson #2)
    console.log('[adp] Falling back to sampleData.DRAFT_POOL');
    const fallback = DRAFT_POOL.map((p, idx) => ({
      id: p.id || `sample_${idx}`,
      name: p.name,
      position: p.position,
      team: p.team || 'FA',
      adp: p.adp ?? idx + 1,
      projectedPts: p.projectedPts ?? estimateProjectedPts(p.position, p.adp ?? idx + 1),
      bye: p.bye || 0,
    }));

    return res.json({ players: fallback, cached: false, source: 'sampleData' });
  }
}

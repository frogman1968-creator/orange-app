/**
 * GET /api/adp
 * Fetches live ADP data from Fantasy Football Calculator (free API, attribution required).
 * Caches in-memory for 24 hours so we don't hammer their server.
 * Returns player pool in Orange draft format.
 *
 * Attribution: ADP data provided by Fantasy Football Calculator (fantasyfootballcalculator.com)
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cache = null;
let cacheTime = 0;

function getCurrentYear() {
  return new Date().getFullYear();
}

function transformPlayer(p, index) {
  return {
    id: `ffc_${p.player_id}`,
    name: p.name,
    position: p.position,
    team: p.team || 'FA',
    adp: parseFloat(p.adp) || index + 1,
    projectedPts: estimateProjectedPts(p.position, parseFloat(p.adp) || index + 1),
    bye: p.bye || 0,
  };
}

/**
 * Rough projected points estimate based on position and ADP.
 * Yahoo doesn't surface projections via the API until preseason.
 * These are used for display only — the AI uses ADP for pick logic.
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

  // Serve cache if fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL_MS) {
    return res.json({ players: cache, cached: true, source: 'fantasyfootballcalculator.com' });
  }

  const year = getCurrentYear();
  const url = `https://fantasyfootballcalculator.com/api/v1/adp/standard?teams=12&year=${year}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OrangeFF/1.0 (orangeff.app)' },
    });

    if (!response.ok) {
      throw new Error(`FFC API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data?.players?.length) {
      throw new Error('Empty player list from FFC');
    }

    const players = data.players.map((p, i) => transformPlayer(p, i));

    // Update cache
    cache = players;
    cacheTime = Date.now();

    console.log(`[adp] Fetched ${players.length} players from FFC for ${year}`);

    return res.json({
      players,
      cached: false,
      source: 'fantasyfootballcalculator.com',
      meta: data.meta,
    });

  } catch (err) {
    console.error('[adp] Fetch error:', err.message);

    // If we have stale cache, return it with a warning
    if (cache) {
      return res.json({
        players: cache,
        cached: true,
        stale: true,
        source: 'fantasyfootballcalculator.com',
      });
    }

    // Last resort: return empty so the client falls back to sampleData
    return res.status(502).json({ error: 'ADP data temporarily unavailable', players: [] });
  }
}

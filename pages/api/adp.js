/**
 * GET /api/adp
 * Fetches live PPR ADP from Fantasy Football Calculator (free, no key required).
 * Fallback: lib/sampleData.DRAFT_POOL
 */

import { DRAFT_POOL } from '../../lib/sampleData';

const FANTASY_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);

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

  try {
    const ffcRes = await fetch(
      'https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year=2026',
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!ffcRes.ok) throw new Error(`FFC API returned ${ffcRes.status}`);

    const ffcData = await ffcRes.json();
    const rawPlayers = ffcData?.players ?? [];

    if (rawPlayers.length < 30) throw new Error(`Too few FFC players: ${rawPlayers.length}`);

    const players = rawPlayers
      .filter(p => p.position && FANTASY_POSITIONS.has(p.position.toUpperCase()))
      .sort((a, b) => (a.adp ?? 999) - (b.adp ?? 999))
      .slice(0, 300)
      .map((p, idx) => {
        const pos = (p.position || 'RB').toUpperCase();
        const adp = p.adp ?? idx + 1;
        return {
          id: `ffc_${idx}`,
          name: p.name,
          position: pos,
          team: p.team || 'FA',
          adp: parseFloat(adp.toFixed(1)),
          projectedPts: estimateProjectedPts(pos, adp),
          bye: p.bye || 0,
        };
      });

    console.log(`[adp] FFC: ${players.length} players — #1: ${players[0]?.name}, #2: ${players[1]?.name}, #3: ${players[2]?.name}`);

    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=3600');
    return res.json({ players, cached: false, source: 'ffc' });

  } catch (err) {
    console.error('[adp] FFC failed:', err.message);

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

/**
 * Orange Lineup Optimizer
 * Opponent-aware start/sit recommendations
 */

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;

// ─── Draft Companion ──────────────────────────────────────────────────────────

export async function getDraftRecommendations({
  draftedPlayers,
  availablePlayers,
  scoringType,
  rosterRequirements,
  currentRound,
  totalRounds,
  userDraftPosition,
}) {
  const res = await fetch(`${WORKER_URL}/api/draft/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      draftedPlayers,
      availablePlayers,
      scoringType,
      rosterRequirements,
      currentRound,
      totalRounds,
      userDraftPosition,
    }),
  });
  return res.json();
}

// ─── Weekly Lineup Optimizer ──────────────────────────────────────────────────

export async function optimizeLineup({
  roster,
  opponentRoster,
  week,
  scoringType,
  rosterSlots,
}) {
  const res = await fetch(`${WORKER_URL}/api/lineup/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roster, opponentRoster, week, scoringType, rosterSlots }),
  });
  return res.json();
}

// ─── ADP Fetcher ──────────────────────────────────────────────────────────────

export async function getADP(scoringType = 'ppr') {
  const res = await fetch(`${WORKER_URL}/api/adp?scoring=${scoringType}`);
  return res.json();
}

// ─── Position Need Labels ─────────────────────────────────────────────────────

export function getRosterNeedLabel(needs) {
  const sorted = Object.entries(needs)
    .sort(([, a], [, b]) => b - a)
    .filter(([, v]) => v > 0.3);

  if (!sorted.length) return 'Roster is balanced';
  const top = sorted[0];
  return `Priority need: ${top[0]} (${Math.round(top[1] * 100)}% urgency)`;
}

// ─── Matchup Grade Color ──────────────────────────────────────────────────────

export function getMatchupGradeColor(grade) {
  return {
    A: '#22c55e',
    B: '#86efac',
    C: '#facc15',
    D: '#f97316',
    F: '#ef4444',
  }[grade] || '#6b7280';
}

// ─── Format projections ───────────────────────────────────────────────────────

export function formatProjection(points) {
  if (!points && points !== 0) return '—';
  return parseFloat(points).toFixed(1);
}

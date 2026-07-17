/**
 * GET /api/yahoo/draft-grades?league_key=XXX&team_key=XXX
 *
 * Comparative draft grader — grades your team AGAINST every other team
 * in your league. Not ADP-based. Purely relative.
 *
 * For each team:
 *   1. Fetch full roster with projected season points
 *   2. Calculate optimal lineup score (best possible starters given roster)
 *   3. Score each position group (QB room, RB room, WR room, TE, depth, bye risk)
 *
 * Then rank all teams in each category. Return the comparison data.
 */

import { createClient } from '@supabase/supabase-js';
import { getYahooToken } from '../../../lib/getYahooToken';
import { getLeagueTeams, getTeamProjectedRoster } from '../../../lib/yahooApi';

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Given a roster and league roster positions, calculate:
 * - totalProjPts: optimal lineup projected season points
 * - positionGroups: projected pts by position group (QB, RB, WR, TE, FLEX, K, DEF)
 * - byeRisk: how many starters share the same bye week
 */
function analyzeTeam(players, rosterPositions) {
  const available = [...players].filter(p => p.projectedPts > 0);

  let totalProjPts = 0;
  const positionGroups = { QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0, K: 0, DEF: 0 };
  const starters = [];

  // Use rosterPositions if available; fall back to standard
  const slots = rosterPositions?.length ? rosterPositions : [
    { position: 'QB', count: 1 }, { position: 'RB', count: 2 },
    { position: 'WR', count: 2 }, { position: 'TE', count: 1 },
    { position: 'W/R/T', count: 1 }, { position: 'K', count: 1 },
    { position: 'DEF', count: 1 }, { position: 'BN', count: 6 },
  ];

  // Fill pure position slots first
  for (const slot of slots) {
    if (['BN', 'IR'].includes(slot.position)) continue;
    if (slot.position.includes('/')) continue;

    const posPlayers = available
      .filter(p => p.position === slot.position)
      .sort((a, b) => b.projectedPts - a.projectedPts);

    const filled = Math.min(slot.count, posPlayers.length);
    for (let i = 0; i < filled; i++) {
      const player = posPlayers[i];
      starters.push({ ...player, slot: slot.position });
      totalProjPts += player.projectedPts;
      positionGroups[slot.position] = (positionGroups[slot.position] || 0) + player.projectedPts;
      // Mark used
      const idx = available.findIndex(p => p.playerKey === player.playerKey);
      if (idx !== -1) available.splice(idx, 1);
    }
  }

  // Fill flex slots
  for (const slot of slots) {
    if (['BN', 'IR'].includes(slot.position)) continue;
    if (!slot.position.includes('/')) continue;

    const eligiblePos = slot.position.split('/');
    const flexPlayers = available
      .filter(p => eligiblePos.includes(p.position))
      .sort((a, b) => b.projectedPts - a.projectedPts);

    const filled = Math.min(slot.count, flexPlayers.length);
    for (let i = 0; i < filled; i++) {
      const player = flexPlayers[i];
      starters.push({ ...player, slot: 'FLEX' });
      totalProjPts += player.projectedPts;
      positionGroups['FLEX'] = (positionGroups['FLEX'] || 0) + player.projectedPts;
      const idx = available.findIndex(p => p.playerKey === player.playerKey);
      if (idx !== -1) available.splice(idx, 1);
    }
  }

  // Bye week risk: count starters sharing the same bye
  const byeCounts = {};
  for (const p of starters) {
    if (p.byeWeek) byeCounts[p.byeWeek] = (byeCounts[p.byeWeek] || 0) + 1;
  }
  const maxByeStack = Math.max(0, ...Object.values(byeCounts));
  const byeRiskScore = maxByeStack; // Higher = worse

  // Depth score: sum of top 3 bench players
  const bench = available
    .filter(p => !['K', 'DEF'].includes(p.position))
    .sort((a, b) => b.projectedPts - a.projectedPts)
    .slice(0, 3);
  const depthScore = bench.reduce((s, p) => s + p.projectedPts, 0);

  // Top player concentration risk (% of total in top 2 players)
  const top2Pts = starters
    .sort((a, b) => b.projectedPts - a.projectedPts)
    .slice(0, 2)
    .reduce((s, p) => s + p.projectedPts, 0);
  const concentrationRisk = totalProjPts > 0 ? top2Pts / totalProjPts : 0;

  return {
    totalProjPts: Math.round(totalProjPts * 10) / 10,
    positionGroups,
    depthScore:   Math.round(depthScore * 10) / 10,
    byeRiskScore,
    concentrationRisk: Math.round(concentrationRisk * 100),
    starters,
    bench: available,
  };
}

/** Rank an array of teams by a numeric value (highest = rank 1). */
function rankBy(teams, getValue) {
  const sorted = [...teams].sort((a, b) => getValue(b) - getValue(a));
  const ranks = {};
  sorted.forEach((t, i) => { ranks[t.teamKey] = i + 1; });
  return ranks;
}

/** Rank by bye risk (lowest = rank 1, fewer stacking = better). */
function rankByByeRisk(teams) {
  const sorted = [...teams].sort((a, b) => a.analysis.byeRiskScore - b.analysis.byeRiskScore);
  const ranks = {};
  sorted.forEach((t, i) => { ranks[t.teamKey] = i + 1; });
  return ranks;
}

// ─── Handler ───────────────────────────────────────────────────────────────────

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

  const { access_token, error: tokenErr } = await getYahooToken(user.id, supabase);
  if (tokenErr) return res.status(401).json({ error: tokenErr, reconnect: true });

  // Pull league roster positions from Supabase cache
  const { data: leagueSettings } = await supabase
    .from('league_settings')
    .select('roster_positions, scoring_summary')
    .eq('user_id', user.id)
    .eq('league_key', league_key)
    .single();

  const rosterPositions = leagueSettings?.roster_positions || null;

  try {
    // 1. Get all teams in the league
    const allTeams = await getLeagueTeams(access_token, league_key);
    if (!allTeams.length) {
      return res.status(404).json({ error: 'No teams found in this league.' });
    }

    // 2. Fetch each team's projected roster (parallel)
    const teamRosters = await Promise.all(
      allTeams.map(async (team) => {
        try {
          const players = await getTeamProjectedRoster(access_token, team.teamKey);
          return { ...team, players };
        } catch {
          return { ...team, players: [] };
        }
      })
    );

    // Check if draft has happened (at least some teams should have rosters)
    const avgRosterSize = teamRosters.reduce((s, t) => s + t.players.length, 0) / teamRosters.length;
    if (avgRosterSize < 5) {
      return res.status(400).json({
        error: 'Draft doesn\'t appear to be complete yet. Come back after draft day.',
        notDrafted: true,
      });
    }

    // 3. Analyze each team
    const analyzedTeams = teamRosters.map(team => ({
      teamKey:  team.teamKey,
      name:     team.name,
      isMyTeam: team.teamKey === team_key,
      analysis: analyzeTeam(team.players, rosterPositions),
    }));

    // 4. Rank all teams across categories
    const numTeams = analyzedTeams.length;

    const rankTotal  = rankBy(analyzedTeams, t => t.analysis.totalProjPts);
    const rankQB     = rankBy(analyzedTeams, t => t.analysis.positionGroups.QB || 0);
    const rankRB     = rankBy(analyzedTeams, t => t.analysis.positionGroups.RB || 0);
    const rankWR     = rankBy(analyzedTeams, t => t.analysis.positionGroups.WR || 0);
    const rankTE     = rankBy(analyzedTeams, t => t.analysis.positionGroups.TE || 0);
    const rankFlex   = rankBy(analyzedTeams, t => t.analysis.positionGroups.FLEX || 0);
    const rankDepth  = rankBy(analyzedTeams, t => t.analysis.depthScore);
    const rankBye    = rankByByeRisk(analyzedTeams);

    // 5. Build response
    const myTeam = analyzedTeams.find(t => t.teamKey === team_key);
    if (!myTeam) {
      return res.status(404).json({ error: 'Your team was not found in this league.' });
    }

    const myRanks = {
      total:  rankTotal[team_key],
      QB:     rankQB[team_key],
      RB:     rankRB[team_key],
      WR:     rankWR[team_key],
      TE:     rankTE[team_key],
      FLEX:   rankFlex[team_key],
      depth:  rankDepth[team_key],
      bye:    rankBye[team_key],
    };

    // League table (all teams with their overall rank)
    const leagueTable = analyzedTeams
      .map(t => ({
        teamKey:       t.teamKey,
        name:          t.name,
        isMyTeam:      t.isMyTeam,
        totalProjPts:  t.analysis.totalProjPts,
        overallRank:   rankTotal[t.teamKey],
      }))
      .sort((a, b) => a.overallRank - b.overallRank);

    return res.json({
      numTeams,
      myTeam: {
        teamKey:      myTeam.teamKey,
        name:         myTeam.name,
        analysis:     myTeam.analysis,
        ranks:        myRanks,
        starters:     myTeam.analysis.starters,
      },
      leagueTable,
      scoringSummary: leagueSettings?.scoring_summary || null,
    });

  } catch (err) {
    console.error('Draft grades error:', err);
    return res.status(500).json({ error: 'Failed to calculate draft grades.' });
  }
}

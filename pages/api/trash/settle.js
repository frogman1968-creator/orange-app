/**
 * POST /api/trash/settle
 * Fetches Yahoo scores for the week and resolves pending bets.
 * Handles both total_score bets and position-group bets (rb_pts, wr_pts, etc.)
 *
 * Body: { league_key, week }
 * Returns: { resolved: number, bets: updatedBets[] }
 */

import { createClient } from '@supabase/supabase-js';
import { getYahooToken } from '../../../lib/getYahooToken';

const BASE = 'https://fantasysports.yahooapis.com/fantasy/v2';

async function yahooFetch(path, accessToken) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Yahoo API ${res.status}`);
  return res.json();
}

/** Get all team total scores for a league+week. Returns { teamKey: totalPts } */
async function getWeekScores(accessToken, leagueKey, week) {
  const data = await yahooFetch(
    `/league/${leagueKey}/scoreboard;week=${week}?format=json`,
    accessToken
  );
  const matchups = data?.fantasy_content?.league?.[1]?.scoreboard?.[0]?.matchups;
  const scores = {};
  const count = matchups?.count || 0;
  for (let i = 0; i < count; i++) {
    const matchup = matchups[i]?.matchup;
    if (!matchup) continue;
    const teams = matchup['0']?.teams;
    for (let t = 0; t <= 1; t++) {
      const team = teams?.[String(t)]?.team;
      if (!team) continue;
      const teamKey = team[0]?.find?.(x => x?.team_key)?.team_key;
      const pts     = parseFloat(team[1]?.team_points?.total || 0);
      if (teamKey) scores[teamKey] = pts;
    }
  }
  return scores;
}

/** Get a team's per-player points for a week. Returns [{ name, position, points }] */
async function getTeamPlayerScores(accessToken, teamKey, week) {
  const data = await yahooFetch(
    `/team/${teamKey}/roster/players/stats;type=week;week=${week}?format=json`,
    accessToken
  );
  const playersObj = data?.fantasy_content?.team?.[1]?.roster?.[0]?.players;
  if (!playersObj) return [];

  const players = [];
  const count = playersObj?.count || 0;
  for (let i = 0; i < count; i++) {
    const p = playersObj[i]?.player;
    if (!p) continue;
    const info     = p[0];
    const pts      = parseFloat(p[1]?.player_points?.total || 0);
    const position = info?.find?.(x => x?.primary_position)?.primary_position;
    const selPos   = p[1]?.selected_position?.[1]?.position;
    players.push({ position, selectedPosition: selPos, points: pts });
  }
  return players;
}

/** Sum points for starters of a given position group */
function sumPositionPts(players, betType) {
  const posMap = {
    rb_pts:   ['RB'],
    wr_pts:   ['WR'],
    qb_pts:   ['QB'],
    te_pts:   ['TE'],
    flex_pts: ['RB', 'WR', 'TE'],
  };
  const positions = posMap[betType];
  if (!positions) return null;

  return players
    .filter(p =>
      positions.includes(p.position) &&
      p.selectedPosition !== 'BN' &&
      p.selectedPosition !== 'IR'
    )
    .reduce((sum, p) => sum + p.points, 0);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const { league_key, week } = req.body;
  if (!league_key || !week) return res.status(400).json({ error: 'league_key and week required' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { access_token, error: tokenErr } = await getYahooToken(user.id, supabase);
  if (tokenErr) return res.status(401).json({ error: tokenErr, reconnect: true });

  // Fetch pending bets
  const { data: pendingBets, error: fetchErr } = await supabase
    .from('trash_talk_bets')
    .select('*')
    .eq('user_id', user.id)
    .eq('league_key', league_key)
    .eq('week', parseInt(week, 10))
    .eq('status', 'pending');

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!pendingBets?.length) return res.json({ resolved: 0, bets: [] });

  // Separate by type
  const totalScoreBets  = pendingBets.filter(b => b.bet_type === 'total_score');
  const positionBets    = pendingBets.filter(b => b.bet_type !== 'total_score');

  // Fetch total scores once (shared across total_score bets)
  let weekScores = {};
  if (totalScoreBets.length > 0) {
    try {
      weekScores = await getWeekScores(access_token, league_key, week);
    } catch {
      // non-fatal — those bets just won't resolve
    }
  }

  // For position bets, we need per-player data per team
  // Collect unique team keys needed
  const teamsNeeded = new Set();
  for (const bet of positionBets) {
    teamsNeeded.add(bet.my_team_key);
    teamsNeeded.add(bet.opp_team_key);
  }

  const teamPlayerScores = {};
  for (const tk of teamsNeeded) {
    try {
      teamPlayerScores[tk] = await getTeamPlayerScores(access_token, tk, week);
    } catch {
      // skip — bets for this team won't resolve
    }
  }

  // Resolve each bet
  const updates = [];

  for (const bet of pendingBets) {
    let myPts, oppPts;

    if (bet.bet_type === 'total_score') {
      myPts  = weekScores[bet.my_team_key];
      oppPts = weekScores[bet.opp_team_key];
    } else {
      const myPlayers  = teamPlayerScores[bet.my_team_key];
      const oppPlayers = teamPlayerScores[bet.opp_team_key];
      if (!myPlayers || !oppPlayers) continue;
      myPts  = sumPositionPts(myPlayers, bet.bet_type);
      oppPts = sumPositionPts(oppPlayers, bet.bet_type);
    }

    if (myPts === undefined || myPts === null || oppPts === undefined || oppPts === null) continue;

    let status = 'tied';
    if (myPts > oppPts) status = 'won';
    else if (myPts < oppPts) status = 'lost';

    // If won, set payment_status to pending_payment so winner can confirm
    const payment_status = status === 'won' ? 'pending_payment' : 'n/a';

    const { data: updated } = await supabase
      .from('trash_talk_bets')
      .update({ status, my_pts: myPts, opp_pts: oppPts, payment_status })
      .eq('id', bet.id)
      .select()
      .single();

    if (updated) updates.push(updated);
  }

  return res.json({ resolved: updates.length, bets: updates });
}

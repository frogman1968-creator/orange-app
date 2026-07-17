/**
 * yahooApi.js — Yahoo Fantasy Sports API helper
 *
 * All functions take an access_token and return parsed data.
 * Call getYahooToken() first to get a valid (refreshed) access_token.
 *
 * Yahoo API base: https://fantasysports.yahooapis.com/fantasy/v2
 * All responses use ?format=json
 */

const BASE = 'https://fantasysports.yahooapis.com/fantasy/v2';

async function yahooFetch(path, accessToken) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yahoo API error ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Get the logged-in Yahoo user's GUID and basic info.
 */
export async function getYahooUser(accessToken) {
  const data = await yahooFetch(
    '/users;use_login=1?format=json',
    accessToken
  );
  const user = data?.fantasy_content?.users?.[0]?.user;
  return {
    guid:        user?.[0]?.guid,
    displayName: user?.[1]?.display_name,
    imageUrl:    user?.[1]?.image_url,
  };
}

/**
 * Get all NFL fantasy leagues the user is in for the current season.
 */
export async function getUserLeagues(accessToken) {
  const data = await yahooFetch(
    '/users;use_login=1/games;game_keys=nfl/leagues?format=json',
    accessToken
  );

  const gamesObj = data?.fantasy_content?.users?.[0]?.user?.[1]?.games;
  if (!gamesObj) return [];

  const leagues = [];
  const gameCount = gamesObj?.count || 0;

  for (let g = 0; g < gameCount; g++) {
    const game = gamesObj[g]?.game;
    if (!game) continue;
    const leaguesObj = game[1]?.leagues;
    const leagueCount = leaguesObj?.count || 0;
    for (let l = 0; l < leagueCount; l++) {
      const league = leaguesObj[l]?.league?.[0];
      if (league) leagues.push(league);
    }
  }

  return leagues;
}

/**
 * Get league details + standings.
 */
export async function getLeagueStandings(accessToken, leagueKey) {
  const data = await yahooFetch(
    `/league/${leagueKey}/standings?format=json`,
    accessToken
  );

  const leagueData = data?.fantasy_content?.league;
  const leagueInfo = leagueData?.[0];
  const standings  = leagueData?.[1]?.standings?.[0]?.teams;

  const teams = [];
  const teamCount = standings?.count || 0;
  for (let i = 0; i < teamCount; i++) {
    const team = standings[i]?.team;
    if (!team) continue;
    const info  = team[0];
    const stats = team[2]?.team_standings;
    teams.push({
      teamKey:      info?.find?.(x => x?.team_key)?.team_key,
      name:         info?.find?.(x => x?.name)?.name,
      logo:         info?.find?.(x => x?.team_logos)?.[0]?.team_logo?.url,
      wins:         stats?.outcome_totals?.wins,
      losses:       stats?.outcome_totals?.losses,
      ties:         stats?.outcome_totals?.ties,
      pointsFor:    parseFloat(stats?.points_for || 0),
      rank:         stats?.rank,
      waiverPrio:   info?.find?.(x => x?.waiver_priority)?.waiver_priority,
    });
  }

  return { leagueInfo, teams };
}

/**
 * Get a team's current roster with player details.
 */
export async function getTeamRoster(accessToken, teamKey) {
  const data = await yahooFetch(
    `/team/${teamKey}/roster/players?format=json`,
    accessToken
  );

  const playersObj = data?.fantasy_content?.team?.[1]?.roster?.[0]?.players;
  if (!playersObj) return [];

  const players = [];
  const count = playersObj?.count || 0;

  for (let i = 0; i < count; i++) {
    const p = playersObj[i]?.player;
    if (!p) continue;
    const info         = p[0];
    const selectedPos  = p[1]?.selected_position?.[1]?.position;

    players.push({
      playerKey:    info?.find?.(x => x?.player_key)?.player_key,
      playerId:     info?.find?.(x => x?.player_id)?.player_id,
      name:         info?.find?.(x => x?.name)?.name?.full,
      editorialTeam: info?.find?.(x => x?.editorial_team_abbr)?.editorial_team_abbr,
      position:     info?.find?.(x => x?.primary_position)?.primary_position,
      eligiblePositions: info?.find?.(x => x?.eligible_positions)?.eligible_positions?.map(p => p?.position),
      selectedPosition: selectedPos,
      status:       info?.find?.(x => x?.status)?.status || 'active',
      injuryNote:   info?.find?.(x => x?.status_full)?.status_full,
      byeWeek:      info?.find?.(x => x?.bye_weeks)?.bye_weeks?.week,
    });
  }

  return players;
}

/**
 * Get a team's current week matchup.
 */
export async function getCurrentMatchup(accessToken, teamKey) {
  const data = await yahooFetch(
    `/team/${teamKey}/matchups?format=json`,
    accessToken
  );

  const matchups = data?.fantasy_content?.team?.[1]?.matchups;
  const count    = matchups?.count || 0;

  // Find the current week matchup (not complete)
  for (let i = 0; i < count; i++) {
    const matchup = matchups[i]?.matchup;
    if (!matchup) continue;
    if (matchup['0']?.is_tied !== undefined || matchup['0']?.week) {
      const week    = matchup['0']?.week;
      const teams   = matchup['0']?.teams;
      const team1   = teams?.['0']?.team;
      const team2   = teams?.['1']?.team;

      return {
        week,
        myTeam: {
          key:    team1?.[0]?.find?.(x => x?.team_key)?.team_key,
          name:   team1?.[0]?.find?.(x => x?.name)?.name,
          points: parseFloat(team1?.[1]?.team_points?.total || 0),
          projectedPoints: parseFloat(team1?.[1]?.team_projected_points?.total || 0),
        },
        opponent: {
          key:    team2?.[0]?.find?.(x => x?.team_key)?.team_key,
          name:   team2?.[0]?.find?.(x => x?.name)?.name,
          points: parseFloat(team2?.[1]?.team_points?.total || 0),
          projectedPoints: parseFloat(team2?.[1]?.team_projected_points?.total || 0),
        },
      };
    }
  }

  return null;
}

/**
 * Get available (free agent + waiver) players in a league, sorted by add rank.
 * Returns top `count` players with projected points for the current week.
 */
export async function getFreeAgents(accessToken, leagueKey, count = 30) {
  const data = await yahooFetch(
    `/league/${leagueKey}/players;status=A;sort=AR;count=${count}/stats;type=week?format=json`,
    accessToken
  );

  const playersObj = data?.fantasy_content?.league?.[1]?.players;
  if (!playersObj) return [];

  const players = [];
  const total = playersObj?.count || 0;

  for (let i = 0; i < total; i++) {
    const p = playersObj[i]?.player;
    if (!p) continue;
    const info  = p[0];
    const stats = p[1]?.player_stats?.stats || [];

    const projPts = parseFloat(
      p[1]?.player_points?.total ||
      p[1]?.player_projected_points?.total ||
      0
    );

    players.push({
      playerKey:    info?.find?.(x => x?.player_key)?.player_key,
      playerId:     info?.find?.(x => x?.player_id)?.player_id,
      name:         info?.find?.(x => x?.name)?.name?.full,
      editorialTeam: info?.find?.(x => x?.editorial_team_abbr)?.editorial_team_abbr,
      position:     info?.find?.(x => x?.primary_position)?.primary_position,
      status:       info?.find?.(x => x?.status)?.status || 'FA',
      injuryNote:   info?.find?.(x => x?.status_full)?.status_full || null,
      byeWeek:      info?.find?.(x => x?.bye_weeks)?.bye_weeks?.week || null,
      percentOwned: parseFloat(info?.find?.(x => x?.percent_owned)?.percent_owned?.value || 0),
      projectedPts: projPts,
    });
  }

  return players;
}

/**
 * Get league settings: roster positions + scoring rules (stat modifiers).
 * Used to determine PPR/standard/half-PPR and roster slot counts.
 *
 * Yahoo stat IDs (key ones):
 *   4  = passing TDs    (4 pts standard, 6 pts in some leagues)
 *  11  = receptions     (0 = standard, 0.5 = half-PPR, 1 = PPR)
 *  24  = rushing TDs
 *  25  = receiving TDs
 */
export async function getLeagueSettings(accessToken, leagueKey) {
  const data = await yahooFetch(
    `/league/${leagueKey}/settings?format=json`,
    accessToken
  );

  const leagueData = data?.fantasy_content?.league;
  const leagueInfo = leagueData?.[0] || {};
  const settings   = leagueData?.[1]?.settings || {};

  // --- Roster positions ---
  const rosterPositionsObj = settings?.roster_positions;
  const rosterPositions = [];
  if (rosterPositionsObj) {
    const count = rosterPositionsObj.count || 0;
    for (let i = 0; i < count; i++) {
      const rp = rosterPositionsObj[i]?.roster_position;
      if (rp) rosterPositions.push({ position: rp.position, count: parseInt(rp.count || 1) });
    }
  }

  // --- Stat modifiers ---
  const statModifiers = {};
  const statsObj = settings?.stat_modifiers?.stats;
  if (statsObj) {
    const count = statsObj.count || 0;
    for (let i = 0; i < count; i++) {
      const stat = statsObj[i]?.stat;
      if (stat) statModifiers[String(stat.stat_id)] = parseFloat(stat.value || 0);
    }
  }

  const receptionPts = statModifiers['11'] ?? 0;
  const passTdPts    = statModifiers['4']  ?? 4;

  const scoringFormat =
    receptionPts >= 1   ? 'PPR'       :
    receptionPts >= 0.5 ? 'Half-PPR'  : 'Standard';

  // Starter slots only (exclude BN / IR)
  const starterSlots = rosterPositions
    .filter(rp => rp.position !== 'BN' && rp.position !== 'IR')
    .map(rp => rp.count > 1 ? `${rp.count}x ${rp.position}` : rp.position)
    .join(', ');

  const scoringSummary =
    `${scoringFormat} scoring` +
    (receptionPts > 0 ? ` (${receptionPts} pt/reception)` : '') +
    `. Passing TDs = ${passTdPts} pts. Starters: ${starterSlots || 'standard slots'}.`;

  return {
    leagueKey,
    leagueName:    leagueInfo.name || '',
    scoringFormat,
    receptionPts,
    passTdPts,
    rosterPositions,
    starterSlots,
    scoringSummary,
    statModifiers,
  };
}

/**
 * Get the most recently completed matchup for a team.
 * Returns week number, result, scores, and opponent info.
 */
export async function getLastCompletedMatchup(accessToken, teamKey) {
  const data = await yahooFetch(
    `/team/${teamKey}/matchups?format=json`,
    accessToken
  );

  const matchups = data?.fantasy_content?.team?.[1]?.matchups;
  const count    = matchups?.count || 0;

  let best = null;

  for (let i = 0; i < count; i++) {
    const matchup = matchups[i]?.matchup;
    if (!matchup) continue;
    const info = matchup['0'];
    if (!info) continue;

    // status === 'postevent' means the game is over
    if (info.status !== 'postevent') continue;

    const week   = parseInt(info.week || 0);
    const teams  = info.teams;
    const team0  = teams?.['0']?.team;
    const team1  = teams?.['1']?.team;
    if (!team0 || !team1) continue;

    const key0   = team0[0]?.find?.(x => x?.team_key)?.team_key;
    const name0  = team0[0]?.find?.(x => x?.name)?.name;
    const pts0   = parseFloat(team0[1]?.team_points?.total || 0);
    const key1   = team1[0]?.find?.(x => x?.team_key)?.team_key;
    const name1  = team1[0]?.find?.(x => x?.name)?.name;
    const pts1   = parseFloat(team1[1]?.team_points?.total || 0);

    // Figure out which slot is the user's team
    const mySlot  = key0 === teamKey ? 0 : 1;
    const myPts   = mySlot === 0 ? pts0 : pts1;
    const oppPts  = mySlot === 0 ? pts1 : pts0;
    const oppKey  = mySlot === 0 ? key1 : key0;
    const oppName = mySlot === 0 ? name1 : name0;

    const result  = myPts > oppPts ? 'won' : myPts < oppPts ? 'lost' : 'tied';

    if (!best || week > best.week) {
      best = { week, result, myScore: myPts, oppScore: oppPts, oppTeamKey: oppKey, oppTeamName: oppName };
    }
  }

  return best;
}

/**
 * Get a team's full roster with actual points scored for a specific week.
 * Returns starters and bench players separately.
 */
export async function getRosterWithScores(accessToken, teamKey, week) {
  const data = await yahooFetch(
    `/team/${teamKey}/roster/players/stats;type=week;week=${week}?format=json`,
    accessToken
  );

  const playersObj = data?.fantasy_content?.team?.[1]?.roster?.[0]?.players;
  if (!playersObj) return { starters: [], bench: [] };

  const starters = [];
  const bench    = [];
  const count    = playersObj?.count || 0;

  for (let i = 0; i < count; i++) {
    const p = playersObj[i]?.player;
    if (!p) continue;

    const info    = p[0];
    const selPos  = p[1]?.selected_position?.[1]?.position;
    const pts     = parseFloat(p[1]?.player_points?.total || 0);

    const player = {
      name:             info?.find?.(x => x?.name)?.name?.full || 'Unknown',
      position:         info?.find?.(x => x?.primary_position)?.primary_position || '?',
      editorialTeam:    info?.find?.(x => x?.editorial_team_abbr)?.editorial_team_abbr || '?',
      selectedPosition: selPos,
      points:           pts,
    };

    if (selPos === 'BN' || selPos === 'IR') {
      bench.push(player);
    } else {
      starters.push(player);
    }
  }

  return { starters, bench };
}

/**
 * Get player stats/projections for the current week.
 */
export async function getTeamStats(accessToken, teamKey, week) {
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
    const info    = p[0];
    const points  = p[1]?.player_points?.total;
    players.push({
      playerKey: info?.find?.(x => x?.player_key)?.player_key,
      name:      info?.find?.(x => x?.name)?.name?.full,
      points:    parseFloat(points || 0),
    });
  }

  return players;
}

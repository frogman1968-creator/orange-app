/**
 * Sleeper Fantasy API helpers
 * No auth required — fully open API
 */

const SLEEPER_BASE = 'https://api.sleeper.app/v1';

// ─── User ─────────────────────────────────────────────────────────────────────

export async function getSleeperUser(username) {
  return sleeperFetch(`/user/${username}`);
}

export async function getUserLeagues(userId, season = '2025') {
  return sleeperFetch(`/user/${userId}/leagues/nfl/${season}`);
}

// ─── League ──────────────────────────────────────────────────────────────────

export async function getLeague(leagueId) {
  return sleeperFetch(`/league/${leagueId}`);
}

export async function getLeagueRosters(leagueId) {
  return sleeperFetch(`/league/${leagueId}/rosters`);
}

export async function getLeagueUsers(leagueId) {
  return sleeperFetch(`/league/${leagueId}/users`);
}

export async function getLeagueMatchups(leagueId, week) {
  return sleeperFetch(`/league/${leagueId}/matchups/${week}`);
}

export async function getLeagueDraft(leagueId) {
  const drafts = await sleeperFetch(`/league/${leagueId}/drafts`);
  return drafts?.[0] || null;
}

// ─── Draft ───────────────────────────────────────────────────────────────────

export async function getDraft(draftId) {
  return sleeperFetch(`/draft/${draftId}`);
}

export async function getDraftPicks(draftId) {
  return sleeperFetch(`/draft/${draftId}/picks`);
}

export async function getTradedPicks(draftId) {
  return sleeperFetch(`/draft/${draftId}/traded_picks`);
}

// ─── Players ─────────────────────────────────────────────────────────────────

// Full NFL player database — cache this, it's large (~5MB)
export async function getAllPlayers() {
  return sleeperFetch('/players/nfl');
}

export async function getTrendingPlayers(type = 'add', sport = 'nfl', lookbackHours = 24, limit = 25) {
  return sleeperFetch(`/players/${sport}/trending/${type}?lookback_hours=${lookbackHours}&limit=${limit}`);
}

// ─── NFL State ────────────────────────────────────────────────────────────────

export async function getNFLState() {
  return sleeperFetch('/state/nfl');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function sleeperFetch(path) {
  const res = await fetch(`${SLEEPER_BASE}${path}`);
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status} ${path}`);
  return res.json();
}

// ─── Data transformers ────────────────────────────────────────────────────────

export function buildRosterMap(rosters, users) {
  // Map roster_id → user display info
  const userMap = {};
  users.forEach(u => { userMap[u.user_id] = u; });

  return rosters.map(roster => ({
    rosterId: roster.roster_id,
    ownerId: roster.owner_id,
    displayName: userMap[roster.owner_id]?.display_name || 'Unknown',
    avatarUrl: userMap[roster.owner_id]?.avatar
      ? `https://sleepercdn.com/avatars/thumbs/${userMap[roster.owner_id].avatar}`
      : null,
    players: roster.players || [],
    starters: roster.starters || [],
    wins: roster.settings?.wins || 0,
    losses: roster.settings?.losses || 0,
    pointsFor: roster.settings?.fpts || 0,
    waiver: roster.settings?.waiver_position,
  }));
}

export function getPlayerName(playerId, allPlayers) {
  const p = allPlayers?.[playerId];
  if (!p) return 'Unknown Player';
  return `${p.first_name} ${p.last_name}`;
}

export function getPlayerDetails(playerId, allPlayers) {
  const p = allPlayers?.[playerId];
  if (!p) return null;
  return {
    id: playerId,
    name: `${p.first_name} ${p.last_name}`,
    position: p.position,
    team: p.team,
    status: p.injury_status || 'active',
    injuryNote: p.injury_notes,
  };
}

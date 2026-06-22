/**
 * Yahoo Fantasy API helpers
 * All calls proxied through the Orange Cloudflare Worker
 */

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;

// ─── OAuth ────────────────────────────────────────────────────────────────────

export function getYahooAuthURL() {
  const clientId = 'dj0yJmk9aWZZMGFxcUtUdE13JmQ9WVdrOVIwdGtheIl3WjJJbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PTkz';
  const redirectUri = 'https://orange-app-sigma.vercel.app/auth/yahoo/callback';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid fspt-r',
    nonce: Math.random().toString(36).slice(2),
  });
  return `https://api.login.yahoo.com/oauth2/request_auth?${params}`;
}

export async function exchangeYahooCode(code) {
  const res = await fetch('/api/auth/yahoo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  return res.json();
}

// ─── League Data ──────────────────────────────────────────────────────────────

export async function getYahooLeagues(accessToken) {
  return yahooFetch('/users;use_login=1/games;game_keys=nfl/leagues', accessToken);
}

export async function getLeagueRoster(leagueKey, teamKey, accessToken) {
  return yahooFetch(`/team/${teamKey}/roster`, accessToken);
}

export async function getLeagueMatchup(leagueKey, week, accessToken) {
  return yahooFetch(`/league/${leagueKey}/scoreboard;week=${week}`, accessToken);
}

export async function getAvailablePlayers(leagueKey, accessToken, position = null, count = 25) {
  const posFilter = position ? `;position=${position}` : '';
  return yahooFetch(
    `/league/${leagueKey}/players;status=A${posFilter};sort=AR;count=${count}`,
    accessToken
  );
}

export async function getDraftResults(leagueKey, accessToken) {
  return yahooFetch(`/league/${leagueKey}/draftresults`, accessToken);
}

export async function getPlayerStats(playerKey, week, accessToken) {
  return yahooFetch(`/player/${playerKey}/stats;type=week;week=${week}`, accessToken);
}

// ─── Internal fetch via Worker ────────────────────────────────────────────────

async function yahooFetch(path, accessToken) {
  const res = await fetch(`${WORKER_URL}/api/yahoo${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Yahoo API error: ${res.status}`);
  return res.json();
}

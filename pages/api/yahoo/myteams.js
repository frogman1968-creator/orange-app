/**
 * GET /api/yahoo/myteams
 * Returns the authenticated user's Yahoo Fantasy NFL teams for the current season.
 * Requires a valid Yahoo OAuth token stored in the yahoo_tokens Supabase table.
 *
 * Response: { teams: [...], connected: boolean }
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getValidToken(userId) {
  const { data, error } = await supabase
    .from('yahoo_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  // Refresh if expired (with 5-min buffer)
  if (Date.now() > data.expires_at - 5 * 60 * 1000) {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: data.refresh_token,
      redirect_uri: process.env.YAHOO_REDIRECT_URI,
      client_id: process.env.YAHOO_CLIENT_ID,
      client_secret: process.env.YAHOO_CLIENT_SECRET,
    });

    const tokenRes = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      console.error('[myteams] Token refresh failed', await tokenRes.text());
      return null;
    }

    const tokens = await tokenRes.json();
    const newExpiry = Date.now() + tokens.expires_in * 1000;

    await supabase
      .from('yahoo_tokens')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || data.refresh_token,
        expires_at: newExpiry,
      })
      .eq('user_id', userId);

    return tokens.access_token;
  }

  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Get user from Supabase session
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return res.json({ teams: [], connected: false, reason: 'no_token' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.json({ teams: [], connected: false, reason: 'auth_failed' });
  }

  const accessToken = await getValidToken(user.id);

  if (!accessToken) {
    return res.json({ teams: [], connected: false, reason: 'no_yahoo_token' });
  }

  try {
    const url = 'https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_codes=nfl/teams?format=json';

    const yahooRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!yahooRes.ok) {
      const body = await yahooRes.text();
      console.error('[myteams] Yahoo API error', yahooRes.status, body);
      return res.json({ teams: [], connected: false, reason: 'yahoo_api_error', status: yahooRes.status });
    }

    const data = await yahooRes.json();

    // Parse Yahoo's nested response structure
    const gamesData = data?.fantasy_content?.users?.['0']?.user?.[1]?.games;

    if (!gamesData) {
      return res.json({ teams: [], connected: true });
    }

    const teams = [];

    Object.values(gamesData).forEach(gameEntry => {
      if (typeof gameEntry !== 'object' || !gameEntry?.game) return;

      const game = gameEntry.game;
      const gameInfo = game[0];
      const teamsData = game[1]?.teams;

      if (!teamsData) return;

      Object.values(teamsData).forEach(teamEntry => {
        if (typeof teamEntry !== 'object' || !teamEntry?.team) return;

        const teamArr = teamEntry.team[0];
        const teamObj = {};
        teamArr.forEach(item => {
          if (item && typeof item === 'object') Object.assign(teamObj, item);
        });

        teams.push({
          teamKey: teamObj.team_key,
          teamId: teamObj.team_id,
          name: teamObj.name,
          leagueKey: teamObj.team_key?.split('.').slice(0, 3).join('.'),
          season: gameInfo?.season,
          gameCode: gameInfo?.code,
          isNfl: gameInfo?.code === 'nfl',
        });
      });
    });

    const nflTeams = teams.filter(t => t.isNfl);

    return res.json({ teams: nflTeams, connected: true });

  } catch (err) {
    console.error('[myteams] Unexpected error:', err.message);
    return res.json({ teams: [], connected: false, reason: 'exception', message: err.message });
  }
}

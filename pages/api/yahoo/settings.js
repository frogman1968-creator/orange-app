/**
 * GET /api/yahoo/settings?league_key=nfl.l.XXXXX
 *
 * Fetches league settings from Yahoo (roster positions + scoring rules),
 * parses them into a human-readable summary, and caches in Supabase.
 *
 * Returns cached result if updated within the last 24 hours.
 * Force-refresh: ?refresh=true
 */

import { createClient } from '@supabase/supabase-js';
import { getYahooToken } from '../../../lib/getYahooToken';
import { getLeagueSettings } from '../../../lib/yahooApi';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { league_key, refresh } = req.query;
  if (!league_key) return res.status(400).json({ error: 'league_key required' });

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

  // Check Supabase cache (skip if refresh=true)
  if (refresh !== 'true') {
    const { data: cached } = await supabase
      .from('league_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('league_key', league_key)
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      const ONE_DAY = 24 * 60 * 60 * 1000;
      if (age < ONE_DAY) {
        return res.json({
          scoringFormat:   cached.scoring_format,
          receptionPts:    cached.reception_pts,
          passTdPts:       cached.pass_td_pts,
          starterSlots:    cached.starter_slots,
          scoringSummary:  cached.scoring_summary,
          rosterPositions: cached.roster_positions || [],
          cached: true,
        });
      }
    }
  }

  // Fetch fresh from Yahoo
  const { access_token, error } = await getYahooToken(user.id, supabase);
  if (error) return res.status(401).json({ error, reconnect: true });

  try {
    const settings = await getLeagueSettings(access_token, league_key);

    // Upsert into Supabase
    await supabase.from('league_settings').upsert({
      user_id:          user.id,
      league_key,
      scoring_format:   settings.scoringFormat,
      reception_pts:    settings.receptionPts,
      pass_td_pts:      settings.passTdPts,
      starter_slots:    settings.starterSlots,
      scoring_summary:  settings.scoringSummary,
      roster_positions: settings.rosterPositions,
      raw_settings:     settings.statModifiers,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'user_id,league_key' });

    return res.json({
      scoringFormat:   settings.scoringFormat,
      receptionPts:    settings.receptionPts,
      passTdPts:       settings.passTdPts,
      starterSlots:    settings.starterSlots,
      scoringSummary:  settings.scoringSummary,
      rosterPositions: settings.rosterPositions,
      cached: false,
    });
  } catch (err) {
    console.error('League settings error:', err);
    return res.status(500).json({ error: 'Failed to fetch league settings from Yahoo' });
  }
}

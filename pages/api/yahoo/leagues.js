/**
 * GET /api/yahoo/leagues
 * Returns the logged-in user's NFL fantasy leagues.
 * Requires: Authorization: Bearer <supabase_access_token>
 */

import { createClient } from '@supabase/supabase-js';
import { getYahooToken } from '../../../lib/getYahooToken';
import { getUserLeagues } from '../../../lib/yahooApi';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get Supabase user
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  // Get Yahoo token for this user
  const { data: tokenRow } = await supabase
    .from('yahoo_tokens')
    .select('yahoo_guid')
    .eq('user_id', user.id)
    .single();

  if (!tokenRow) return res.status(404).json({ error: 'Yahoo account not connected', reconnect: true });

  const { access_token, error } = await getYahooToken(tokenRow.yahoo_guid, supabase);
  if (error) return res.status(401).json({ error, reconnect: true });

  try {
    const leagues = await getUserLeagues(access_token);
    return res.json({ leagues });
  } catch (err) {
    console.error('Yahoo leagues error:', err);
    return res.status(500).json({ error: 'Failed to fetch leagues from Yahoo' });
  }
}

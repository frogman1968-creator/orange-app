/**
 * POST /api/auth/yahoo/refresh
 * Refreshes an expired Yahoo OAuth access token using the stored refresh_token.
 * Updates the new tokens in Supabase.
 *
 * Body: { yahoo_guid }
 * Response: { access_token, expires_at } | { error }
 *
 * Called server-side before any Yahoo API request when the token is expired.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { yahoo_guid } = req.body;
  if (!yahoo_guid) return res.status(400).json({ error: 'yahoo_guid required' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Fetch current tokens from Supabase
  const { data: tokenRow, error: fetchError } = await supabase
    .from('yahoo_tokens')
    .select('refresh_token, expires_at')
    .eq('yahoo_guid', yahoo_guid)
    .single();

  if (fetchError || !tokenRow) {
    return res.status(404).json({ error: 'No token found for this user. Please reconnect Yahoo.' });
  }

  // Check if token is actually expired (with 5-min buffer)
  const expiresAt = new Date(tokenRow.expires_at).getTime();
  const fiveMinBuffer = 5 * 60 * 1000;
  if (Date.now() < expiresAt - fiveMinBuffer) {
    // Token still valid — return early (caller can re-fetch from DB)
    return res.json({ message: 'Token still valid', expires_at: tokenRow.expires_at });
  }

  // Refresh the token with Yahoo
  const clientId     = process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const refreshRes = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: tokenRow.refresh_token,
      }),
    });

    if (!refreshRes.ok) {
      const err = await refreshRes.text();
      console.error('Yahoo token refresh failed:', err);
      // Refresh token itself may be expired — user needs to reconnect
      return res.status(401).json({
        error: 'Yahoo session expired. Please reconnect your Yahoo account.',
        reconnect: true,
      });
    }

    const tokens = await refreshRes.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Update Supabase with new tokens
    await supabase
      .from('yahoo_tokens')
      .update({
        access_token:  tokens.access_token,
        // Yahoo may or may not return a new refresh_token — keep old one if not
        refresh_token: tokens.refresh_token || tokenRow.refresh_token,
        expires_at:    newExpiresAt,
        updated_at:    new Date().toISOString(),
      })
      .eq('yahoo_guid', yahoo_guid);

    return res.json({
      access_token: tokens.access_token,
      expires_at:   newExpiresAt,
    });

  } catch (err) {
    console.error('Yahoo refresh error:', err);
    return res.status(500).json({ error: 'Token refresh failed. Try again.' });
  }
}

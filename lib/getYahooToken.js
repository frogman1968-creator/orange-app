/**
 * getYahooToken(yahoo_guid, supabaseAdmin)
 *
 * Server-side helper used by all Yahoo API routes.
 * Fetches the stored token, refreshes it if expired, and returns
 * a valid access_token ready to use in Yahoo API calls.
 *
 * Usage (inside any /api route):
 *   import { getYahooToken } from '../../../lib/getYahooToken';
 *   const { access_token, error, reconnect } = await getYahooToken(yahoo_guid, supabase);
 *   if (error) return res.status(reconnect ? 401 : 500).json({ error, reconnect });
 *   // use access_token for Yahoo API calls
 */

export async function getYahooToken(yahoo_guid, supabase) {
  if (!yahoo_guid) {
    return { access_token: null, error: 'No Yahoo account connected.', reconnect: true };
  }

  // Fetch current token from Supabase
  const { data: tokenRow, error: fetchError } = await supabase
    .from('yahoo_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('yahoo_guid', yahoo_guid)
    .single();

  if (fetchError || !tokenRow) {
    return { access_token: null, error: 'Yahoo account not connected.', reconnect: true };
  }

  // Check expiry with 5-minute buffer
  const expiresAt     = new Date(tokenRow.expires_at).getTime();
  const fiveMinBuffer = 5 * 60 * 1000;

  if (Date.now() < expiresAt - fiveMinBuffer) {
    // Token is still valid
    return { access_token: tokenRow.access_token, error: null };
  }

  // Token expired — refresh it
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
      return {
        access_token: null,
        error: 'Yahoo session expired. Please reconnect your Yahoo account.',
        reconnect: true,
      };
    }

    const tokens       = await refreshRes.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Save refreshed tokens
    await supabase
      .from('yahoo_tokens')
      .update({
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token || tokenRow.refresh_token,
        expires_at:    newExpiresAt,
        updated_at:    new Date().toISOString(),
      })
      .eq('yahoo_guid', yahoo_guid);

    return { access_token: tokens.access_token, error: null };

  } catch (err) {
    console.error('getYahooToken refresh error:', err);
    return { access_token: null, error: 'Token refresh failed.', reconnect: false };
  }
}

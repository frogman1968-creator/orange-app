/**
 * /api/auth/yahoo
 * Initiates Yahoo OAuth 2.0 authorization flow.
 * Passes the user's Supabase token via `state` so the callback
 * can link the Yahoo account to the correct Supabase user.
 *
 * Required env vars:
 *   NEXT_PUBLIC_YAHOO_CLIENT_ID
 *   NEXT_PUBLIC_APP_URL
 */

export default function handler(req, res) {
  const clientId    = process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID;
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL || 'https://orange-app-sigma.vercel.app';
  const redirectUri = `${appUrl}/api/auth/yahoo/callback`;

  if (!clientId) {
    return res.status(503).json({ error: 'Yahoo Client ID not configured.' });
  }

  // Pass the Supabase access token via state so the callback can link accounts
  // The connect page appends ?token=<access_token> when initiating the flow
  const supabaseToken = req.query.token || '';

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'fspt-r',
    // state carries the Supabase token through the OAuth round-trip
    state:         supabaseToken,
  });

  const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`;
  res.redirect(authUrl);
}

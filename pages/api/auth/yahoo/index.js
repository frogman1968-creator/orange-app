/**
 * /api/auth/yahoo
 * Initiates Yahoo OAuth 2.0 authorization flow.
 * Redirects the user to Yahoo's authorization page.
 *
 * Required env vars:
 *   NEXT_PUBLIC_YAHOO_CLIENT_ID
 *   NEXT_PUBLIC_APP_URL
 */

export default function handler(req, res) {
  const clientId   = process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID;
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL || 'https://orange-app-sigma.vercel.app';
  const redirectUri = `${appUrl}/api/auth/yahoo/callback`;

  if (!clientId) {
    return res.status(503).json({ error: 'Yahoo API approval pending. Client ID not configured.' });
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    // Yahoo Fantasy scope — read-only access to fantasy sports data
    scope: 'fspt-r',
  });

  const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`;
  res.redirect(authUrl);
}

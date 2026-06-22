/**
 * Yahoo OAuth token exchange
 * POST /api/auth/yahoo
 * Body: { code: string }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  const credentials = Buffer.from(
    `${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`
  ).toString('base64');

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/yahoo/callback`,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return res.status(400).json({ error: 'Yahoo token exchange failed', detail: err });
    }

    const tokens = await tokenRes.json();

    // Get Yahoo user info
    const userRes = await fetch(
      'https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1?format=json',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const userData = await userRes.json();
    const yahooGuid = userData?.fantasy_content?.users?.[0]?.user?.[0]?.guid;

    return res.status(200).json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      yahooGuid,
    });
  } catch (err) {
    console.error('Yahoo auth error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

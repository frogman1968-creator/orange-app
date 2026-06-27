/**
 * /api/auth/yahoo/callback
 * Handles Yahoo OAuth 2.0 callback.
 * Exchanges the authorization code for access + refresh tokens.
 * Stores tokens in Supabase, then redirects to /connect?connected=true
 *
 * Required env vars:
 *   NEXT_PUBLIC_YAHOO_CLIENT_ID
 *   YAHOO_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { code, error } = req.query;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://orange-app-sigma.vercel.app';

  // User denied access or error from Yahoo
  if (error || !code) {
    return res.redirect(`/connect?error=cancelled`);
  }

  const clientId     = process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;
  const redirectUri  = `${appUrl}/api/auth/yahoo/callback`;

  try {
    // Exchange authorization code for tokens
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Yahoo token exchange failed:', err);
      return res.redirect(`${appUrl}/connect?error=token_exchange`);
    }

    const tokens = await tokenRes.json();
    // tokens: { access_token, refresh_token, expires_in, token_type, xoauth_yahoo_guid }

    const yahooGuid  = tokens.xoauth_yahoo_guid;
    const expiresAt  = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Store tokens in Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase.from('yahoo_tokens').upsert({
      yahoo_guid:    yahooGuid,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at:    expiresAt,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'yahoo_guid' });

    // Redirect back to connect page with success
    return res.redirect(`${appUrl}/connect?connected=true`);

  } catch (err) {
    console.error('Yahoo OAuth callback error:', err);
    return res.redirect(`${appUrl}/connect?error=server`);
  }
}

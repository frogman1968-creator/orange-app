/**
 * /api/auth/yahoo/callback
 * Handles Yahoo OAuth 2.0 callback.
 * Exchanges code for tokens, links to Supabase user via state param.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { code, error, state } = req.query;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://orange-app-sigma.vercel.app';

  if (error || !code) {
    return res.redirect(`${appUrl}/connect?error=cancelled`);
  }

  const clientId     = process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;
  const redirectUri  = `${appUrl}/api/auth/yahoo/callback`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

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
    const yahooGuid = tokens.xoauth_yahoo_guid;
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Try to get Supabase user_id from the state param (Supabase JWT)
    let userId = null;
    if (state) {
      try {
        const anonClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          { global: { headers: { Authorization: `Bearer ${state}` } } }
        );
        const { data: { user } } = await anonClient.auth.getUser();
        if (user) userId = user.id;
      } catch (e) {
        console.warn('Could not resolve Supabase user from state:', e.message);
      }
    }

    // Store tokens in Supabase, linked to user_id if available
    console.log('Token keys:', Object.keys(tokens));
    console.log('yahoo_guid:', yahooGuid, 'user_id:', userId);

    const { error: upsertError } = await supabase.from('yahoo_tokens').upsert({
      yahoo_guid:    yahooGuid,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at:    expiresAt,
      user_id:       userId,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'yahoo_guid' });

    if (upsertError) {
      console.error('Supabase upsert error:', JSON.stringify(upsertError));
      return res.redirect(`${appUrl}/connect?error=${encodeURIComponent(upsertError.message)}`);
    }

    console.log('Tokens stored successfully');
    return res.redirect(`${appUrl}/connect?connected=true`);

  } catch (err) {
    console.error('Yahoo OAuth callback error:', err);
    return res.redirect(`${appUrl}/connect?error=server`);
  }
}

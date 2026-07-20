/**
 * GET /api/auth/session
 * Returns the current user's auth status and subscription from Supabase.
 * This is the server-side source of truth for isPremium — replaces localStorage.
 *
 * Response:
 *   { user: { id, email }, subscription: { plan, status } | null, isPremium: bool }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Get auth token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.json({ user: null, subscription: null, isPremium: false });
  }

  try {
    // Use the user's token to get their identity
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return res.json({ user: null, subscription: null, isPremium: false });
    }

    // Check subscription in Supabase — user_id first (most reliable), email as fallback
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let sub = null;

    // Primary: match by user_id
    const { data: subById } = await adminSupabase
      .from('subscriptions')
      .select('plan, status, user_id, email')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (subById) {
      sub = subById;
    } else {
      // Fallback: match by email (handles cases where user_id wasn't captured at checkout)
      const { data: subByEmail } = await adminSupabase
        .from('subscriptions')
        .select('plan, status, user_id, email')
        .eq('email', user.email)
        .eq('status', 'active')
        .maybeSingle();

      if (subByEmail) {
        sub = subByEmail;
        // Backfill user_id on the subscription row so future lookups use the faster path
        if (!subByEmail.user_id) {
          await adminSupabase
            .from('subscriptions')
            .update({ user_id: user.id })
            .eq('email', user.email);
        }
      }
    }

    const isPremium = !!sub;

    return res.json({
      user: { id: user.id, email: user.email },
      subscription: sub || null,
      isPremium,
    });
  } catch (err) {
    console.error('Session check error:', err);
    return res.json({ user: null, subscription: null, isPremium: false });
  }
}

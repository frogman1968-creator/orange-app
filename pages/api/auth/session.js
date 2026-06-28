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

    // Check subscription in Supabase
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: sub } = await adminSupabase
      .from('subscriptions')
      .select('plan, status')
      .eq('email', user.email)
      .eq('status', 'active')
      .single();

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

/**
 * useTrial — subscription + trial gate
 *
 * Checks subscription server-side via /api/auth/session (Supabase).
 * Falls back to 14-day localStorage trial for users not yet subscribed.
 * This prevents localStorage spoofing of isPremium.
 */

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const TRIAL_DAYS = 14;
const TRIAL_KEY  = 'orange_trial_start';

export function useTrial() {
  const [status, setStatus]     = useState('loading');
  const [daysLeft, setDaysLeft] = useState(TRIAL_DAYS);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      // Get current Supabase session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        // Check server-side subscription
        const res = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();

        if (data.isPremium) {
          setStatus('subscribed');
          return;
        }
      }

      // No active subscription — check/start trial
      let trialStart = localStorage.getItem(TRIAL_KEY);
      if (!trialStart) {
        trialStart = Date.now().toString();
        localStorage.setItem(TRIAL_KEY, trialStart);
      }

      const msElapsed   = Date.now() - parseInt(trialStart, 10);
      const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
      const remaining   = Math.max(0, Math.ceil(TRIAL_DAYS - daysElapsed));

      setDaysLeft(remaining);
      setStatus(remaining > 0 ? 'trial' : 'expired');

    } catch (err) {
      console.error('Trial check error:', err);
      // Fail open — allow trial if server unreachable
      setStatus('trial');
    }
  }

  const isPremium = status === 'subscribed' || status === 'trial';
  const isExpired = status === 'expired';
  const isLoading = status === 'loading';

  return { status, daysLeft, isPremium, isExpired, isLoading };
}

/**
 * useTrial — 14-day free trial gate
 *
 * Stores trial start date in localStorage.
 * Returns trial status and days remaining.
 * When Yahoo auth is live, subscription status
 * will be checked against Supabase instead.
 */

import { useState, useEffect } from 'react';

const TRIAL_DAYS = 14;
const TRIAL_KEY  = 'orange_trial_start';
const SUB_KEY    = 'orange_subscribed';

export function useTrial() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'trial' | 'expired' | 'subscribed'
  const [daysLeft, setDaysLeft] = useState(TRIAL_DAYS);

  useEffect(() => {
    // Check if already subscribed (set after Stripe success redirect)
    const subscribed = localStorage.getItem(SUB_KEY);
    if (subscribed === 'true') {
      setStatus('subscribed');
      return;
    }

    // Check URL param after Stripe success
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === 'true') {
      localStorage.setItem(SUB_KEY, 'true');
      setStatus('subscribed');
      return;
    }

    // Get or create trial start date
    let trialStart = localStorage.getItem(TRIAL_KEY);
    if (!trialStart) {
      trialStart = Date.now().toString();
      localStorage.setItem(TRIAL_KEY, trialStart);
    }

    const msElapsed  = Date.now() - parseInt(trialStart, 10);
    const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
    const remaining   = Math.max(0, Math.ceil(TRIAL_DAYS - daysElapsed));

    setDaysLeft(remaining);
    setStatus(remaining > 0 ? 'trial' : 'expired');
  }, []);

  const isPremium  = status === 'subscribed' || status === 'trial';
  const isExpired  = status === 'expired';
  const isLoading  = status === 'loading';

  return { status, daysLeft, isPremium, isExpired, isLoading };
}

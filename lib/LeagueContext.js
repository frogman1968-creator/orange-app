
/**
 * LeagueContext — global multi-league state
 *
 * Fetches all Yahoo leagues once on mount.
 * Persists the selected league to localStorage so it survives page navigation.
 * Any page can call useLeague() to get the selected league and switch leagues.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';

const LeagueContext = createContext(null);

export function LeagueProvider({ children }) {
  const [leagues, setLeagues]         = useState([]);
  const [selected, setSelectedRaw]    = useState(null); // { teamKey, leagueKey, name }
  const [loading, setLoading]         = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [apiError, setApiError]       = useState(null); // real Yahoo API failure, distinct from "not connected"

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const res = await fetch('/api/yahoo/myteams', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      // No Yahoo account linked at all — show the "connect" prompt.
      if (res.status === 404) { setNotConnected(true); setLoading(false); return; }

      // Any other non-OK response is a real failure (Yahoo API error,
      // expired token, etc) — surface it instead of silently treating
      // it like there's just no data to show.
      if (!res.ok) {
        let message = 'Yahoo API error — try again later.';
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch {}
        setApiError(message);
        setLoading(false);
        return;
      }

      const json = await res.json();
      const { teams } = json;

      setLeagues(teams || []);
      setNotConnected(false);

      // Restore saved selection, or default to first league
      const savedKey = typeof window !== 'undefined'
        ? localStorage.getItem('orange_selected_league')
        : null;
      const saved = savedKey ? teams?.find(t => t.leagueKey === savedKey) : null;
      setSelectedRaw(saved || teams?.[0] || null);
    } catch {
      setApiError('Could not reach Yahoo. Try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => { load(); }, [load]);

  // Re-load when auth state changes (login / logout)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') load();
      if (event === 'SIGNED_OUT') {
        setLeagues([]);
        setSelectedRaw(null);
        setNotConnected(false);
        setApiError(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [load]);

  function setSelected(team) {
    setSelectedRaw(team);
    if (typeof window !== 'undefined') {
      localStorage.setItem('orange_selected_league', team.leagueKey);
    }
  }

  return (
    <LeagueContext.Provider value={{ leagues, selected, setSelected, loading, notConnected, apiError, refresh: load }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error('useLeague must be used within LeagueProvider');
  return ctx;
}

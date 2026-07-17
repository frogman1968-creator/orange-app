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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const res = await fetch('/api/yahoo/myteams', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 404) { setNotConnected(true); setLoading(false); return; }
      if (!res.ok) { setLoading(false); return; }

      const { teams } = await res.json();
      if (!teams?.length) { setNotConnected(true); setLoading(false); return; }

      setLeagues(teams);
      setNotConnected(false);

      // Restore saved selection, or default to first league
      const savedKey = typeof window !== 'undefined'
        ? localStorage.getItem('orange_selected_league')
        : null;
      const saved = savedKey ? teams.find(t => t.leagueKey === savedKey) : null;
      setSelectedRaw(saved || teams[0]);
    } catch {
      // Silently fail — pages will show their own error states
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
    <LeagueContext.Provider value={{ leagues, selected, setSelected, loading, notConnected, refresh: load }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error('useLeague must be used within LeagueProvider');
  return ctx;
}

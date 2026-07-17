import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useTrial } from '../lib/useTrial';
import { withAuth } from '../lib/withAuth';
import { useLeague } from '../lib/LeagueContext';

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

const POS_COLORS = {
  QB:  { bg: '#7c3aed', color: '#fff' },
  RB:  { bg: '#16a34a', color: '#fff' },
  WR:  { bg: '#0284c7', color: '#fff' },
  TE:  { bg: '#d97706', color: '#fff' },
  K:   { bg: '#6b7280', color: '#fff' },
  DEF: { bg: '#dc2626', color: '#fff' },
};

function PosBadge({ pos }) {
  const c = POS_COLORS[pos] || { bg: '#374151', color: '#fff' };
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: '2px 7px',
      borderRadius: 4, background: c.bg, color: c.color, flexShrink: 0,
    }}>
      {pos}
    </span>
  );
}

function PageSkeleton() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: 16 }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{
          height: 72, borderRadius: 12, marginBottom: 10,
          background: 'linear-gradient(90deg,#1a1a1a 25%,#242424 50%,#1a1a1a 75%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
        }} />
      ))}
    </div>
  );
}

function WaiverPage() {
  const router = useRouter();
  const { isPremium } = useTrial();

  const [mounted, setMounted]     = useState(false);
  const [players, setPlayers]     = useState([]);
  const [roster, setRoster]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [posFilter, setPosFilter] = useState('ALL');
  const [search, setSearch]       = useState('');

  // AI state
  const [aiRecs, setAiRecs]         = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiError, setAiError]       = useState(null);

  // Multi-league context
  const { selected, loading: leagueLoading, notConnected } = useLeague();
  const leagueKey = selected?.leagueKey;
  const teamKey   = selected?.teamKey;

  useEffect(() => setMounted(true), []);
  if (!mounted) return <PageSkeleton />;

  useEffect(() => {
    if (leagueLoading) return;
    if (notConnected) { setError('Connect your Yahoo account first.'); setLoading(false); return; }
    if (!selected) return;

    async function load() {
      setLoading(true);
      setError(null);
      setPlayers([]);
      setRoster([]);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) { setError('Not logged in.'); return; }

        const authHeader = { Authorization: `Bearer ${token}` };
        const { leagueKey: lk, teamKey: tk } = selected;

        const waiverRes = await fetch(
          `/api/yahoo/waiver?league_key=${lk}&team_key=${tk}`,
          { headers: authHeader }
        );
        const waiverData = await waiverRes.json();
        if (waiverData.error) { setError(waiverData.error); return; }

        setPlayers(waiverData.players || []);
        setRoster(waiverData.roster || []);
      } catch (e) {
        setError('Failed to load waiver wire. Try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [leagueLoading, selected?.leagueKey]);

  async function fetchAiRecs() {
    if (aiLoading || !players.length) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/ai/waiver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ players: players.slice(0, 15), roster, leagueKey }),
      });
      const data = await res.json();
      if (data.error) { setAiError(data.error); return; }
      setAiRecs(data);
    } catch (e) {
      setAiError('Could not reach AI. Try again.');
    } finally {
      setAiLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return players.filter(p => {
      const matchPos = posFilter === 'ALL' || p.position === posFilter;
      const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
      return matchPos && matchSearch;
    });
  }, [players, posFilter, search]);

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <button style={S.backBtn} onClick={() => router.push('/dashboard')}>←</button>
          <span style={S.logo}>🟠</span>
          <span style={S.headerTitle}>Waiver Wire</span>
        </div>
        {!loading && !error && (
          <div style={S.headerRight}>
            <span style={S.playerCount}>{players.length} available</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={S.loadingWrap}>
          <div style={S.loadingSpinner}>⚡</div>
          <div style={S.loadingText}>Scanning the waiver wire…</div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={S.errorCard}>
          <div style={S.errorTitle}>Couldn't load waiver wire</div>
          <div style={S.errorMsg}>{error}</div>
          {error.includes('Yahoo') && (
            <button style={S.connectBtn} onClick={() => router.push('/connect')}>
              Connect Yahoo Account →
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {!loading && !error && players.length > 0 && (
        <>
          {/* AI Recommendations — premium */}
          <div style={S.aiSection}>
            {!isPremium ? (
              <div style={S.aiLocked} onClick={() => router.push('/pricing')}>
                🤖 <strong>AI Waiver Picks</strong> — get 3 AI-ranked recommendations with reasoning ·{' '}
                <span style={{ textDecoration: 'underline' }}>Upgrade to unlock</span>
              </div>
            ) : aiRecs ? (
              <div style={S.aiCard}>
                <div style={S.aiCardHeader}>🤖 AI WAIVER PICKS THIS WEEK</div>
                {aiRecs.picks?.map((pick, i) => (
                  <div key={i} style={S.aiPickRow}>
                    <span style={S.aiPickNum}>#{i + 1}</span>
                    <PosBadge pos={pick.position} />
                    <div style={S.aiPickInfo}>
                      <span style={S.aiPickName}>{pick.name}</span>
                      <span style={S.aiPickTeam}>{pick.team}</span>
                      <span style={S.aiPickReason}>{pick.reason}</span>
                    </div>
                  </div>
                ))}
                {aiRecs.insight && (
                  <div style={S.aiInsight}>💡 {aiRecs.insight}</div>
                )}
                <button style={S.aiRefreshBtn} onClick={fetchAiRecs}>Refresh picks →</button>
              </div>
            ) : (
              <button style={S.aiAskBtn} onClick={fetchAiRecs} disabled={aiLoading}>
                {aiLoading
                  ? '🤖 Analyzing waiver wire…'
                  : '🤖 Get AI Waiver Picks for This Week'}
              </button>
            )}
            {aiError && <div style={S.aiError}>{aiError} <span style={S.aiRetry} onClick={fetchAiRecs}>Retry</span></div>}
          </div>

          {/* Filters */}
          <div style={S.filterBar}>
            <input
              style={S.searchInput}
              placeholder="🔍  Search player…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={S.posFilters}>
              {POSITIONS.map(pos => (
                <button
                  key={pos}
                  style={{ ...S.posBtn, ...(posFilter === pos ? S.posBtnActive : {}) }}
                  onClick={() => setPosFilter(pos)}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Player list */}
          <div style={S.list}>
            {filtered.length === 0 && (
              <div style={S.emptyState}>No players match that filter.</div>
            )}
            {filtered.map((p, i) => (
              <div key={p.playerKey || i} style={S.playerCard}>
                <div style={S.playerRank}>#{i + 1}</div>
                <div style={S.playerInfo}>
                  <div style={S.playerTopRow}>
                    <PosBadge pos={p.position} />
                    <span style={S.playerName}>{p.name}</span>
                    {p.injuryNote && (
                      <span style={S.injuryBadge}>{p.injuryNote.toUpperCase()}</span>
                    )}
                  </div>
                  <div style={S.playerMeta}>
                    {p.editorialTeam || '?'} ·{' '}
                    {p.projectedPts > 0 ? `${p.projectedPts.toFixed(1)} proj pts` : 'Offseason'} ·{' '}
                    {p.percentOwned > 0 ? `${p.percentOwned.toFixed(0)}% owned` : 'Unowned'} ·{' '}
                    {p.status === 'FA' ? 'Free Agent' : 'Waivers'}
                  </div>
                </div>
                <div style={S.scoreChip}>
                  <div style={S.scoreNum}>{p.score}</div>
                  <div style={S.scoreLabel}>score</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty — offseason */}
      {!loading && !error && players.length === 0 && (
        <div style={S.emptyWrap}>
          <div style={S.emptyIcon}>📋</div>
          <div style={S.emptyTitle}>Wire's quiet right now</div>
          <div style={S.emptySub}>Check back once the NFL season kicks off — we'll rank every available player for you.</div>
        </div>
      )}

    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh', background: '#0a0a0a', color: '#fff',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid #1f1f1f',
    background: '#111', position: 'sticky', top: 0, zIndex: 10,
  },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: 10 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  backBtn: {
    background: 'transparent', border: '1px solid #2a2a2a',
    color: '#71717a', borderRadius: 6, padding: '4px 10px',
    fontSize: 16, cursor: 'pointer',
  },
  logo:         { fontSize: 20 },
  headerTitle:  { fontSize: 17, fontWeight: 700 },
  playerCount:  { fontSize: 12, color: '#52525b', fontWeight: 600 },

  loadingWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '80px 20px', gap: 12,
  },
  loadingSpinner: { fontSize: 36, animation: 'spin 1s linear infinite' },
  loadingText:    { fontSize: 14, color: '#52525b' },

  errorCard: {
    margin: 20, background: '#1a0000', border: '1px solid #7f1d1d',
    borderRadius: 12, padding: '20px 16px',
  },
  errorTitle:  { fontSize: 15, fontWeight: 700, color: '#f87171', marginBottom: 6 },
  errorMsg:    { fontSize: 13, color: '#9ca3af', marginBottom: 14 },
  connectBtn: {
    background: '#f97316', color: '#fff', border: 'none',
    borderRadius: 8, padding: '10px 16px', fontSize: 13,
    fontWeight: 700, cursor: 'pointer',
  },

  aiSection: { padding: '12px 16px', borderBottom: '1px solid #1a1a1a' },
  aiLocked: {
    background: '#1a0a00', border: '1px solid #7c2d12', borderRadius: 10,
    padding: '10px 14px', fontSize: 12, color: '#9a3412',
    fontWeight: 600, cursor: 'pointer',
  },
  aiAskBtn: {
    width: '100%', background: '#18181b', border: '1px solid #3f3f46',
    borderRadius: 10, padding: '13px 16px', fontSize: 14, fontWeight: 700,
    color: '#f97316', cursor: 'pointer', textAlign: 'left',
  },
  aiCard: {
    background: '#0d1117', border: '1px solid #f97316',
    borderRadius: 12, padding: '14px',
  },
  aiCardHeader: {
    fontSize: 10, fontWeight: 800, color: '#f97316',
    letterSpacing: '0.8px', marginBottom: 12,
  },
  aiPickRow: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    paddingBottom: 10, marginBottom: 10,
    borderBottom: '1px solid #1a1a1a',
  },
  aiPickNum:    { fontSize: 11, color: '#52525b', fontWeight: 800, width: 20, paddingTop: 2 },
  aiPickInfo:   { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  aiPickName:   { fontSize: 14, fontWeight: 800, color: '#fff' },
  aiPickTeam:   { fontSize: 11, color: '#71717a' },
  aiPickReason: { fontSize: 12, color: '#d4d4d8', lineHeight: 1.45, marginTop: 2 },
  aiInsight: {
    background: '#18181b', borderRadius: 8, padding: '9px 12px',
    fontSize: 12, color: '#a1a1aa', lineHeight: 1.45, marginTop: 8,
  },
  aiRefreshBtn: {
    background: 'transparent', border: 'none',
    fontSize: 11, color: '#52525b', cursor: 'pointer',
    padding: '8px 0 0', display: 'block',
  },
  aiError: { fontSize: 12, color: '#f87171', marginTop: 8 },
  aiRetry: { color: '#f97316', cursor: 'pointer', marginLeft: 6 },

  filterBar: { padding: '12px 16px', borderBottom: '1px solid #1a1a1a' },
  searchInput: {
    width: '100%', background: '#141414', border: '1px solid #2a2a2a',
    borderRadius: 10, padding: '10px 14px', fontSize: 14,
    color: '#fff', outline: 'none', marginBottom: 10, boxSizing: 'border-box',
  },
  posFilters: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  posBtn: {
    background: '#1f1f1f', border: '1px solid #2a2a2a', color: '#a1a1aa',
    borderRadius: 6, padding: '6px 12px', fontSize: 12,
    cursor: 'pointer', fontWeight: 700,
  },
  posBtnActive: { background: '#f97316', color: '#fff', borderColor: '#f97316' },

  list: { padding: '10px 16px 40px' },
  playerCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#141414', borderRadius: 10, padding: '12px 14px',
    marginBottom: 8, border: '1px solid #1f1f1f',
  },
  playerRank:   { fontSize: 11, color: '#3f3f46', fontWeight: 700, minWidth: 24 },
  playerInfo:   { flex: 1 },
  playerTopRow: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 },
  playerName:   { fontSize: 14, fontWeight: 700 },
  injuryBadge: {
    fontSize: 9, fontWeight: 800, padding: '2px 5px',
    borderRadius: 3, background: '#7f1d1d', color: '#fca5a5',
  },
  playerMeta:   { fontSize: 11, color: '#52525b', lineHeight: 1.5 },
  scoreChip: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: '#1f1f1f', borderRadius: 8, padding: '6px 10px', minWidth: 48,
  },
  scoreNum:   { fontSize: 15, fontWeight: 800, color: '#f97316' },
  scoreLabel: { fontSize: 9, color: '#52525b', fontWeight: 700 },

  emptyWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '80px 20px', gap: 12, textAlign: 'center',
  },
  emptyIcon:  { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 700 },
  emptySub:   { fontSize: 14, color: '#52525b', maxWidth: 300, lineHeight: 1.5 },
  emptyState: { color: '#3f3f46', fontSize: 13, padding: '30px 0', textAlign: 'center' },
};

export default withAuth(WaiverPage);

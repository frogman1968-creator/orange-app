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

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f97316' };

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

  const [mounted, setMounted]         = useState(false);
  const [players, setPlayers]         = useState([]);
  const [roster, setRoster]           = useState([]);
  const [rosterNeeds, setRosterNeeds] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [posFilter, setPosFilter]     = useState('ALL');
  const [search, setSearch]           = useState('');
  const [mode, setMode]               = useState('all'); // 'all' | 'fit'

  // AI state
  const [aiRecs, setAiRecs]       = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState(null);
  const [aiMode, setAiMode]       = useState(null); // which mode was used for current recs

  // Multi-league context
  const { selected, loading: leagueLoading, notConnected } = useLeague();
  const leagueKey = selected?.leagueKey;

  useEffect(() => setMounted(true), []);
  if (!mounted) return <PageSkeleton />;

  useEffect(() => {
    if (leagueLoading) return;
    if (notConnected) { setError('Connect your Yahoo account first.'); setLoading(false); return; }
    if (!selected) return;
    load();
  }, [leagueLoading, selected?.leagueKey]);

  // Clear AI recs when mode changes
  useEffect(() => {
    if (aiMode !== null && aiMode !== mode) setAiRecs(null);
  }, [mode]);

  async function load() {
    setLoading(true);
    setError(null);
    setPlayers([]);
    setRoster([]);
    setRosterNeeds([]);
    setAiRecs(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError('Not logged in.'); return; }

      const { leagueKey: lk, teamKey: tk } = selected;
      const waiverRes = await fetch(
        `/api/yahoo/waiver?league_key=${lk}&team_key=${tk}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await waiverRes.json();
      if (data.error) { setError(data.error); return; }

      setPlayers(data.players || []);
      setRoster(data.roster || []);
      setRosterNeeds(data.rosterNeeds || []);

      // Auto-switch to "For My Team" if injuries detected
      if (data.rosterNeeds?.some(n => n.priority === 'high')) {
        setMode('fit');
      }
    } catch {
      setError('Failed to load waiver wire. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAiRecs() {
    if (aiLoading || !players.length) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // In fit mode, pass only players at needed positions to keep picks relevant
      const targetPlayers = mode === 'fit' && rosterNeeds.length
        ? players.filter(p => rosterNeeds.some(n => n.pos === p.position)).slice(0, 15)
          .concat(players.filter(p => !rosterNeeds.some(n => n.pos === p.position)).slice(0, 5))
        : players.slice(0, 15);

      const res = await fetch('/api/ai/waiver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          players: targetPlayers,
          roster,
          leagueKey,
          mode,
          rosterNeeds,
        }),
      });
      const data = await res.json();
      if (data.error) { setAiError(data.error); return; }
      setAiRecs(data);
      setAiMode(mode);
    } catch {
      setAiError('Could not reach AI. Try again.');
    } finally {
      setAiLoading(false);
    }
  }

  // Needs positions set (for quick lookup)
  const needPositions = useMemo(() => new Set(rosterNeeds.map(n => n.pos)), [rosterNeeds]);

  // "For My Team" sorted list — needed positions float to top
  const sortedPlayers = useMemo(() => {
    if (mode !== 'fit' || !rosterNeeds.length) return players;
    return [...players].sort((a, b) => {
      const aNeed = needPositions.has(a.position) ? 1 : 0;
      const bNeed = needPositions.has(b.position) ? 1 : 0;
      if (bNeed !== aNeed) return bNeed - aNeed;
      return b.score - a.score;
    });
  }, [players, mode, rosterNeeds, needPositions]);

  const filtered = useMemo(() => {
    return sortedPlayers.filter(p => {
      const matchPos = posFilter === 'ALL' || p.position === posFilter;
      const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
      // In fit mode, if a position filter is set, honor it; otherwise show all
      return matchPos && matchSearch;
    });
  }, [sortedPlayers, posFilter, search]);

  const highNeeds = rosterNeeds.filter(n => n.priority === 'high');
  const medNeeds  = rosterNeeds.filter(n => n.priority === 'medium');

  return (
    <div style={S.page}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

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
          <div style={{ fontSize: 36, animation: 'spin 1s linear infinite' }}>⚡</div>
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
          {/* Mode Toggle */}
          <div style={S.modeWrap}>
            <div style={S.modeToggle}>
              <button
                style={{ ...S.modeBtn, ...(mode === 'all' ? S.modeBtnActive : {}) }}
                onClick={() => setMode('all')}
              >
                All Players
              </button>
              <button
                style={{ ...S.modeBtn, ...(mode === 'fit' ? S.modeBtnActiveFit : {}) }}
                onClick={() => setMode('fit')}
              >
                For My Team
                {rosterNeeds.length > 0 && (
                  <span style={{
                    ...S.needsBubble,
                    background: highNeeds.length ? '#ef4444' : '#f97316',
                  }}>
                    {rosterNeeds.length}
                  </span>
                )}
              </button>
            </div>

            {/* Roster needs summary — shown in fit mode */}
            {mode === 'fit' && rosterNeeds.length > 0 && (
              <div style={S.needsPanel}>
                {rosterNeeds.map((n, i) => (
                  <div key={i} style={{ ...S.needRow, borderLeftColor: PRIORITY_COLOR[n.priority] }}>
                    <PosBadge pos={n.pos} />
                    <span style={S.needReason}>{n.reason}</span>
                  </div>
                ))}
              </div>
            )}

            {mode === 'fit' && rosterNeeds.length === 0 && (
              <div style={S.noNeedsNote}>
                ✅ Your roster looks healthy — no urgent needs detected.
              </div>
            )}
          </div>

          {/* AI Recommendations */}
          <div style={S.aiSection}>
            {!isPremium ? (
              <div style={S.aiLocked} onClick={() => router.push('/pricing')}>
                🤖 <strong>AI Waiver Picks</strong> — 3 AI-ranked picks with reasoning ·{' '}
                <span style={{ textDecoration: 'underline' }}>Upgrade to unlock</span>
              </div>
            ) : aiRecs ? (
              <div style={{ ...S.aiCard, animation: 'fadeIn 0.3s ease' }}>
                <div style={S.aiCardHeader}>
                  🤖 AI PICKS — {aiMode === 'fit' ? 'FOR YOUR TEAM' : 'TOP VALUE'}
                </div>
                {aiRecs.picks?.map((pick, i) => (
                  <div key={i} style={S.aiPickRow}>
                    <span style={S.aiPickNum}>#{i + 1}</span>
                    <PosBadge pos={pick.position} />
                    <div style={S.aiPickInfo}>
                      <span style={S.aiPickName}>{pick.name}</span>
                      <span style={S.aiPickTeam}>{pick.team}</span>
                      <span style={S.aiPickReason}>{pick.reason}</span>
                    </div>
                    {needPositions.has(pick.position) && (
                      <span style={S.fitBadge}>NEED</span>
                    )}
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
                  ? '🤖 Analyzing your roster…'
                  : mode === 'fit'
                    ? '🤖 Get AI Picks for My Team'
                    : '🤖 Get AI Waiver Picks This Week'}
              </button>
            )}
            {aiError && (
              <div style={S.aiError}>{aiError}{' '}
                <span style={S.aiRetry} onClick={fetchAiRecs}>Retry</span>
              </div>
            )}
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
                  style={{
                    ...S.posBtn,
                    ...(posFilter === pos ? S.posBtnActive : {}),
                    ...(pos !== 'ALL' && needPositions.has(pos) && mode === 'fit'
                      ? S.posBtnNeed : {}),
                  }}
                  onClick={() => setPosFilter(pos)}
                >
                  {pos}
                  {pos !== 'ALL' && needPositions.has(pos) && mode === 'fit' && (
                    <span style={S.posDot} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Player list */}
          <div style={S.list}>
            {filtered.length === 0 && (
              <div style={S.emptyState}>No players match that filter.</div>
            )}
            {filtered.map((p, i) => {
              const isNeeded = mode === 'fit' && needPositions.has(p.position);
              const needInfo = isNeeded ? rosterNeeds.find(n => n.pos === p.position) : null;
              return (
                <div
                  key={p.playerKey || i}
                  style={{
                    ...S.playerCard,
                    ...(isNeeded ? S.playerCardNeeded : {}),
                    borderLeftColor: isNeeded
                      ? PRIORITY_COLOR[needInfo?.priority || 'medium']
                      : '#1f1f1f',
                  }}
                >
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
                    {/* Roster fit reason — only in fit mode */}
                    {isNeeded && p.fitReason && (
                      <div style={{
                        ...S.fitReason,
                        color: PRIORITY_COLOR[needInfo?.priority || 'medium'],
                      }}>
                        ↑ {p.fitReason}
                      </div>
                    )}
                  </div>
                  <div style={S.scoreChip}>
                    <div style={S.scoreNum}>{p.score}</div>
                    <div style={S.scoreLabel}>score</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Empty — offseason */}
      {!loading && !error && players.length === 0 && (
        <div style={S.emptyWrap}>
          <div style={{ fontSize: 40 }}>📋</div>
          <div style={S.emptyTitle}>Wire's quiet right now</div>
          <div style={S.emptySub}>Check back once the NFL season kicks off — we'll rank every available player for you.</div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
  logo:        { fontSize: 20 },
  headerTitle: { fontSize: 17, fontWeight: 700 },
  playerCount: { fontSize: 12, color: '#52525b', fontWeight: 600 },

  loadingWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '80px 20px', gap: 12,
  },
  loadingText: { fontSize: 14, color: '#52525b' },

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

  // Mode toggle
  modeWrap:   { padding: '12px 16px', borderBottom: '1px solid #1a1a1a' },
  modeToggle: {
    display: 'flex', background: '#141414', border: '1px solid #2a2a2a',
    borderRadius: 10, padding: 3, marginBottom: 10,
  },
  modeBtn: {
    flex: 1, background: 'transparent', border: 'none',
    borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700,
    color: '#52525b', cursor: 'pointer', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  modeBtnActive:    { background: '#1f1f1f', color: '#fff' },
  modeBtnActiveFit: { background: '#1a0800', color: '#f97316' },
  needsBubble: {
    fontSize: 10, fontWeight: 800, color: '#fff', borderRadius: '50%',
    width: 18, height: 18, display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },

  needsPanel: { display: 'flex', flexDirection: 'column', gap: 6 },
  needRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#110a00', borderLeft: '3px solid',
    borderRadius: '0 8px 8px 0', padding: '7px 10px',
  },
  needReason: { fontSize: 12, color: '#d4d4d8', lineHeight: 1.4 },
  noNeedsNote: {
    fontSize: 12, color: '#52525b', padding: '8px 0',
    textAlign: 'center',
  },

  // AI
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
    background: '#0d1117', border: '1px solid #f97316', borderRadius: 12, padding: 14,
  },
  aiCardHeader: {
    fontSize: 10, fontWeight: 800, color: '#f97316', letterSpacing: '0.8px', marginBottom: 12,
  },
  aiPickRow: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #1a1a1a',
  },
  aiPickNum:    { fontSize: 11, color: '#52525b', fontWeight: 800, width: 20, paddingTop: 2 },
  aiPickInfo:   { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  aiPickName:   { fontSize: 14, fontWeight: 800, color: '#fff' },
  aiPickTeam:   { fontSize: 11, color: '#71717a' },
  aiPickReason: { fontSize: 12, color: '#d4d4d8', lineHeight: 1.45, marginTop: 2 },
  fitBadge: {
    fontSize: 9, fontWeight: 800, color: '#f97316', border: '1px solid #f9731644',
    borderRadius: 4, padding: '2px 5px', flexShrink: 0, alignSelf: 'flex-start',
  },
  aiInsight: {
    background: '#18181b', borderRadius: 8, padding: '9px 12px',
    fontSize: 12, color: '#a1a1aa', lineHeight: 1.45, marginTop: 8,
  },
  aiRefreshBtn: {
    background: 'transparent', border: 'none', fontSize: 11,
    color: '#52525b', cursor: 'pointer', padding: '8px 0 0', display: 'block',
  },
  aiError: { fontSize: 12, color: '#f87171', marginTop: 8 },
  aiRetry: { color: '#f97316', cursor: 'pointer', marginLeft: 6 },

  // Filters
  filterBar: { padding: '12px 16px', borderBottom: '1px solid #1a1a1a' },
  searchInput: {
    width: '100%', background: '#141414', border: '1px solid #2a2a2a',
    borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#fff',
    outline: 'none', marginBottom: 10, boxSizing: 'border-box',
  },
  posFilters: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  posBtn: {
    background: '#1f1f1f', border: '1px solid #2a2a2a', color: '#a1a1aa',
    borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
    fontWeight: 700, position: 'relative',
  },
  posBtnActive: { background: '#f97316', color: '#fff', borderColor: '#f97316' },
  posBtnNeed:   { borderColor: '#f97316', color: '#f97316' },
  posDot: {
    position: 'absolute', top: -3, right: -3, width: 7, height: 7,
    borderRadius: '50%', background: '#ef4444',
  },

  // Player list
  list: { padding: '10px 16px 40px' },
  playerCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#141414', borderRadius: 10, padding: '12px 14px',
    marginBottom: 8, border: '1px solid', borderColor: '#1f1f1f',
    borderLeft: '3px solid',
  },
  playerCardNeeded: {
    background: '#110a00',
  },
  playerRank:   { fontSize: 11, color: '#3f3f46', fontWeight: 700, minWidth: 24 },
  playerInfo:   { flex: 1 },
  playerTopRow: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' },
  playerName:   { fontSize: 14, fontWeight: 700 },
  injuryBadge: {
    fontSize: 9, fontWeight: 800, padding: '2px 5px',
    borderRadius: 3, background: '#7f1d1d', color: '#fca5a5',
  },
  playerMeta: { fontSize: 11, color: '#52525b', lineHeight: 1.5 },
  fitReason:  { fontSize: 11, fontWeight: 700, marginTop: 4 },
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
  emptyTitle: { fontSize: 18, fontWeight: 700 },
  emptySub:   { fontSize: 14, color: '#52525b', maxWidth: 300, lineHeight: 1.5 },
  emptyState: { color: '#3f3f46', fontSize: 13, padding: '30px 0', textAlign: 'center' },
};

export default withAuth(WaiverPage);

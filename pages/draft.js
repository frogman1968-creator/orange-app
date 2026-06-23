import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { DRAFT_POOL, ROSTER_REQUIREMENTS } from '../lib/sampleData';

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

function countPositions(roster) {
  const counts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 };
  roster.forEach(p => { if (counts[p.position] !== undefined) counts[p.position]++; });
  return counts;
}

function calcUrgency(counts, round, totalRounds) {
  const roundsLeft = totalRounds - round + 1;
  const urgency = {};
  Object.entries(ROSTER_REQUIREMENTS).forEach(([pos, needed]) => {
    const remaining = Math.max(0, needed - counts[pos]);
    urgency[pos] = remaining === 0 ? 0 : Math.min(1, remaining / Math.max(1, roundsLeft * 0.4));
  });
  return urgency;
}

function missingPositions(counts) {
  return Object.entries(ROSTER_REQUIREMENTS)
    .filter(([pos]) => counts[pos] === 0)
    .map(([pos]) => pos);
}

export default function DraftCompanion() {
  const router = useRouter();
  const [myRoster, setMyRoster] = useState([]);
  const [available, setAvailable] = useState(DRAFT_POOL);
  const [posFilter, setPosFilter] = useState('ALL');
  const [currentRound, setCurrentRound] = useState(1);
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState('picks'); // 'picks' | 'roster'
  const TOTAL_ROUNDS = 15;

  const counts = useMemo(() => countPositions(myRoster), [myRoster]);
  const urgency = useMemo(() => calcUrgency(counts, currentRound, TOTAL_ROUNDS), [counts, currentRound]);
  const missing = useMemo(() => missingPositions(counts), [counts]);

  function draftPlayer(player) {
    setMyRoster(prev => [...prev, { ...player, draftedRound: currentRound }]);
    setAvailable(prev => prev.filter(p => p.id !== player.id));
    setCurrentRound(prev => prev + 1);
    setSearch('');
  }

  function undoLastPick() {
    if (myRoster.length === 0) return;
    const last = myRoster[myRoster.length - 1];
    setMyRoster(prev => prev.slice(0, -1));
    setAvailable(prev => [...prev, last].sort((a, b) => a.adp - b.adp));
    setCurrentRound(prev => Math.max(1, prev - 1));
  }

  const scoredPlayers = useMemo(() => {
    return available.map(p => {
      const posUrgency = urgency[p.position] || 0;
      const isNeed = posUrgency > 0.3;
      const isValuePick = p.adp > currentRound + 2;
      const score = p.projectedPts + posUrgency * 8 + (isValuePick ? 5 : 0);
      return { ...p, isNeed, isValuePick, score };
    }).sort((a, b) => b.score - a.score);
  }, [available, urgency, currentRound]);

  const filtered = scoredPlayers.filter(p => {
    const matchPos = posFilter === 'ALL' || p.position === posFilter;
    const matchSearch = search === '' || p.name.toLowerCase().includes(search.toLowerCase());
    return matchPos && matchSearch;
  });

  const draftDone = currentRound > TOTAL_ROUNDS;

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={() => router.push('/dashboard')}>←</button>
          <span style={styles.logo}>🟠</span>
          <span style={styles.headerTitle}>Draft</span>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.roundBadge}>
            {draftDone ? 'Done' : `R${currentRound} · P${myRoster.length + 1}`}
          </div>
          {myRoster.length > 0 && (
            <button style={styles.undoBtn} onClick={undoLastPick}>↩</button>
          )}
        </div>
      </div>

      {/* Alert: missing positions late in draft */}
      {missing.length > 0 && currentRound > 10 && (
        <div style={styles.alertBanner}>
          ⚠️ Still need: {missing.join(', ')} — draft them before you're done!
        </div>
      )}

      {/* Reminder: positions not yet drafted */}
      {missing.length > 0 && currentRound <= 10 && (
        <div style={styles.needBanner}>
          🎯 Open slots: {missing.join(' · ')}
        </div>
      )}

      {/* Panel Toggle */}
      <div style={styles.panelToggle}>
        <button
          style={{ ...styles.panelBtn, ...(panel === 'picks' ? styles.panelBtnActive : {}) }}
          onClick={() => setPanel('picks')}
        >
          Available Players
        </button>
        <button
          style={{ ...styles.panelBtn, ...(panel === 'roster' ? styles.panelBtnActive : {}) }}
          onClick={() => setPanel('roster')}
        >
          My Roster ({myRoster.length})
        </button>
      </div>

      {/* ── PICKS PANEL ── */}
      {panel === 'picks' && (
        <div style={styles.picksPanel}>

          {/* Search */}
          <input
            style={styles.searchInput}
            placeholder="🔍  Search player name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* Position Filters */}
          <div style={styles.posFilters}>
            {POSITIONS.map(pos => (
              <button
                key={pos}
                style={{ ...styles.posBtn, ...(posFilter === pos ? styles.posBtnActive : {}) }}
                onClick={() => setPosFilter(pos)}
              >
                {pos}
                {pos !== 'ALL' && urgency[pos] > 0.3 && <span style={styles.urgencyDot} />}
              </button>
            ))}
          </div>

          {/* Player List */}
          {filtered.slice(0, 40).map((p, i) => (
            <div key={p.id} style={styles.playerCard}>
              <div style={styles.playerLeft}>
                <div style={styles.playerRank}>#{scoredPlayers.indexOf(p) + 1}</div>
                <div>
                  <div style={styles.playerTopRow}>
                    <span style={getPosBadge(p.position)}>{p.position}</span>
                    <span style={styles.playerName}>{p.name}</span>
                  </div>
                  <div style={styles.playerMeta}>
                    {p.team} · ADP {p.adp.toFixed(1)} · Proj {p.projectedPts.toFixed(1)} · Bye {p.bye}
                  </div>
                  <div style={styles.badgeRow}>
                    {p.isNeed && <span style={styles.needBadge}>NEED</span>}
                    {p.isValuePick && <span style={styles.valueBadge}>VALUE</span>}
                  </div>
                </div>
              </div>
              <button style={styles.draftBtn} onClick={() => draftPlayer(p)}>
                Draft
              </button>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={styles.emptyState}>No players match that filter.</div>
          )}
        </div>
      )}

      {/* ── ROSTER PANEL ── */}
      {panel === 'roster' && (
        <div style={styles.rosterPanel}>

          {/* Position Need Bars */}
          <div style={styles.needSection}>
            <div style={styles.sectionLabel}>Position Needs</div>
            {Object.entries(ROSTER_REQUIREMENTS).map(([pos, needed]) => {
              const have = counts[pos] || 0;
              const pct = Math.min(1, have / needed);
              return (
                <div key={pos} style={styles.needRow}>
                  <span style={styles.needPos}>{pos}</span>
                  <div style={styles.needBar}>
                    <div style={{
                      ...styles.needBarFill,
                      width: `${pct * 100}%`,
                      background: pct >= 1 ? '#22c55e' : pct > 0.4 ? '#f97316' : '#ef4444',
                    }} />
                  </div>
                  <span style={styles.needCount}>{have}/{needed}</span>
                </div>
              );
            })}
          </div>

          {/* Drafted Players */}
          <div style={styles.sectionLabel}>Drafted ({myRoster.length})</div>
          {myRoster.length === 0 ? (
            <div style={styles.emptyState}>No picks yet — go draft!</div>
          ) : (
            myRoster.map((p, i) => (
              <div key={i} style={styles.rosterRow}>
                <span style={styles.rosterRound}>R{p.draftedRound}</span>
                <span style={getPosBadge(p.position)}>{p.position}</span>
                <div style={styles.rosterInfo}>
                  <div style={styles.rosterName}>{p.name}</div>
                  <div style={styles.rosterTeam}>{p.team}</div>
                </div>
              </div>
            ))
          )}

          {draftDone && myRoster.length > 0 && (
            <div style={styles.draftComplete}>
              🏆 Draft complete!
              <button style={styles.goLineupBtn} onClick={() => router.push('/lineup')}>
                View Lineup Tips →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getPosBadge(position) {
  const colors = {
    QB:  { background: '#7c3aed', color: '#fff' },
    RB:  { background: '#16a34a', color: '#fff' },
    WR:  { background: '#0284c7', color: '#fff' },
    TE:  { background: '#d97706', color: '#fff' },
    K:   { background: '#6b7280', color: '#fff' },
    DEF: { background: '#dc2626', color: '#fff' },
  };
  return {
    fontSize: 10,
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: 4,
    flexShrink: 0,
    ...(colors[position] || { background: '#374151', color: '#fff' }),
  };
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f0f0f',
    color: '#fff',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #1f1f1f',
    background: '#111',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  backBtn: {
    background: 'transparent',
    border: '1px solid #2a2a2a',
    color: '#71717a',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 16,
    cursor: 'pointer',
  },
  logo: { fontSize: 20 },
  headerTitle: { fontSize: 17, fontWeight: 700 },
  roundBadge: {
    background: '#f97316',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },
  undoBtn: {
    background: '#1f1f1f',
    border: '1px solid #2a2a2a',
    color: '#a1a1aa',
    borderRadius: 8,
    padding: '5px 10px',
    fontSize: 14,
    cursor: 'pointer',
  },
  alertBanner: {
    background: '#3f0000',
    borderBottom: '1px solid #ef4444',
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: 700,
    padding: '10px 16px',
    textAlign: 'center',
  },
  needBanner: {
    background: '#1a1200',
    borderBottom: '1px solid #f97316',
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 16px',
  },
  panelToggle: {
    display: 'flex',
    borderBottom: '1px solid #1f1f1f',
    background: '#111',
  },
  panelBtn: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#52525b',
    fontSize: 13,
    fontWeight: 600,
    padding: '12px 0',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  panelBtnActive: {
    color: '#f97316',
    borderBottom: '2px solid #f97316',
  },
  picksPanel: { padding: '12px 16px', paddingBottom: 40 },
  rosterPanel: { padding: '12px 16px', paddingBottom: 40 },
  searchInput: {
    width: '100%',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    color: '#fff',
    outline: 'none',
    marginBottom: 12,
    boxSizing: 'border-box',
  },
  posFilters: {
    display: 'flex',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  posBtn: {
    background: '#1f1f1f',
    border: '1px solid #2a2a2a',
    color: '#a1a1aa',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 700,
    position: 'relative',
  },
  posBtnActive: {
    background: '#f97316',
    color: '#fff',
    borderColor: '#f97316',
  },
  urgencyDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#ef4444',
  },
  playerCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#141414',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 8,
    border: '1px solid #1f1f1f',
    gap: 10,
  },
  playerLeft: { display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 },
  playerRank: { color: '#3f3f46', fontSize: 11, fontWeight: 700, minWidth: 22, paddingTop: 2 },
  playerTopRow: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 },
  playerName: { fontWeight: 700, fontSize: 14 },
  playerMeta: { fontSize: 11, color: '#52525b', lineHeight: 1.5, marginBottom: 4 },
  badgeRow: { display: 'flex', gap: 5 },
  draftBtn: {
    background: '#f97316',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    minWidth: 60,
  },
  valueBadge: {
    background: '#16a34a',
    color: '#fff',
    fontSize: 9,
    fontWeight: 800,
    padding: '2px 5px',
    borderRadius: 3,
    letterSpacing: '0.5px',
  },
  needBadge: {
    background: '#7c3aed',
    color: '#fff',
    fontSize: 9,
    fontWeight: 800,
    padding: '2px 5px',
    borderRadius: 3,
    letterSpacing: '0.5px',
  },
  needSection: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: '#52525b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 10,
  },
  needRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  needPos: { fontSize: 11, fontWeight: 800, width: 32, color: '#a1a1aa' },
  needBar: { flex: 1, height: 6, background: '#1f1f1f', borderRadius: 3, overflow: 'hidden' },
  needBarFill: { height: '100%', borderRadius: 3, transition: 'width 0.3s' },
  needCount: { fontSize: 11, color: '#52525b', width: 28, textAlign: 'right' },
  rosterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 0',
    borderBottom: '1px solid #1a1a1a',
  },
  rosterRound: { fontSize: 10, color: '#3f3f46', fontWeight: 700, width: 22 },
  rosterInfo: { flex: 1 },
  rosterName: { fontSize: 13, fontWeight: 600 },
  rosterTeam: { fontSize: 11, color: '#52525b' },
  emptyState: { color: '#3f3f46', fontSize: 13, padding: '30px 0', textAlign: 'center' },
  draftComplete: {
    background: '#0a1f0a',
    border: '1px solid #16a34a',
    borderRadius: 10,
    padding: '14px',
    marginTop: 16,
    fontSize: 13,
    color: '#86efac',
    textAlign: 'center',
  },
  goLineupBtn: {
    display: 'block',
    width: '100%',
    marginTop: 10,
    background: '#f97316',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 0',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
};

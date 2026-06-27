import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DRAFT_POOL, ROSTER_REQUIREMENTS } from '../lib/sampleData';
import { useTrial } from '../lib/useTrial';

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const POS_DEMAND = { QB: 0.08, RB: 0.30, WR: 0.32, TE: 0.10, K: 0.05, DEF: 0.05 };

// ─── Snake Draft Math ─────────────────────────────────────────────────────────

function getSnakePickSlots(position, numTeams, totalRounds) {
  const slots = [];
  for (let r = 0; r < totalRounds; r++) {
    const pickInRound = r % 2 === 0 ? position : numTeams + 1 - position;
    const overall = r * numTeams + pickInRound;
    slots.push(overall);
  }
  return slots;
}

function getNextMyPick(currentPick, myPickSlots) {
  return myPickSlots.find(s => s >= currentPick) || null;
}

// ─── Roster / Position Helpers ────────────────────────────────────────────────

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

// ─── Survival Probability ─────────────────────────────────────────────────────

function calcSurvival(player, currentPick, nextMyPick, available) {
  if (!nextMyPick) return 1;
  const picksUntilMine = nextMyPick - currentPick;
  if (picksUntilMine <= 0) return 1;

  const playersAtPos = available.filter(p => p.position === player.position).length;
  const demand = POS_DEMAND[player.position] || 0.1;
  const expectedTaken = picksUntilMine * demand;

  // Rank of this player among available at same position
  const posPlayers = available
    .filter(p => p.position === player.position)
    .sort((a, b) => b.projectedPts - a.projectedPts);
  const rank = posPlayers.findIndex(p => p.id === player.id) + 1;

  // Probability that fewer than `rank` players at this pos get taken
  const prob = Math.max(0, Math.min(1, 1 - (expectedTaken / Math.max(1, rank))));
  return prob;
}

function survivalLabel(prob) {
  if (prob >= 0.70) return { text: `${Math.round(prob * 100)}% — safe to wait`, color: '#22c55e' };
  if (prob >= 0.40) return { text: `${Math.round(prob * 100)}% — consider now`, color: '#f59e0b' };
  return { text: `${Math.round(prob * 100)}% — take him now`, color: '#ef4444' };
}

// ─── Pattern Suggestion ───────────────────────────────────────────────────────

function getPatternSuggestion(roster, available, counts) {
  if (roster.length < 2) return null;
  const recent = roster.slice(-2).map(p => p.position);
  if (recent[0] !== recent[1]) return null;
  const heavyPos = recent[0];
  const suggestMap = {
    RB:  counts.WR < 2 ? 'WR' : counts.TE < 1 ? 'TE' : 'WR',
    WR:  counts.RB < 2 ? 'RB' : counts.TE < 1 ? 'TE' : 'RB',
    QB:  counts.RB < 2 ? 'RB' : 'WR',
    TE:  counts.WR < 2 ? 'WR' : 'RB',
    K:   'DEF',
    DEF: 'K',
  };
  const suggestPos = suggestMap[heavyPos];
  if (!suggestPos) return null;
  const needed = ROSTER_REQUIREMENTS[suggestPos] || 1;
  if ((counts[suggestPos] || 0) >= needed) return null;
  const top3 = available
    .filter(p => p.position === suggestPos)
    .sort((a, b) => b.projectedPts - a.projectedPts)
    .slice(0, 3);
  if (top3.length === 0) return null;
  return { heavyPos, suggestPos, players: top3 };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DraftCompanion() {
  const router = useRouter();

  // Setup
  const [setupDone, setSetupDone] = useState(false);
  const [numTeams, setNumTeams] = useState(8);
  const [draftPosition, setDraftPosition] = useState(1);
  const [totalRounds, setTotalRounds] = useState(15);

  // Draft state
  const [myRoster, setMyRoster] = useState([]);
  const [available, setAvailable] = useState(DRAFT_POOL);
  const [currentOverallPick, setCurrentOverallPick] = useState(1);
  const [opponentCounts, setOpponentCounts] = useState({ QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 });

  // UI
  const [posFilter, setPosFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState('picks');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <PageSkeleton />;

  const { isPremium } = useTrial();

  const myPickSlots = useMemo(
    () => getSnakePickSlots(draftPosition, numTeams, totalRounds),
    [draftPosition, numTeams, totalRounds]
  );

  const isMyTurn = myPickSlots.includes(currentOverallPick);
  const nextMyPick = useMemo(() => getNextMyPick(currentOverallPick, myPickSlots), [currentOverallPick, myPickSlots]);
  const currentRound = Math.ceil(currentOverallPick / numTeams);
  const draftDone = currentOverallPick > numTeams * totalRounds;

  const counts = useMemo(() => countPositions(myRoster), [myRoster]);
  const urgency = useMemo(() => calcUrgency(counts, currentRound, totalRounds), [counts, currentRound, totalRounds]);
  const missing = useMemo(() => missingPositions(counts), [counts]);
  const suggestion = useMemo(() => getPatternSuggestion(myRoster, available, counts), [myRoster, available, counts]);

  function draftPlayer(player) {
    setMyRoster(prev => [...prev, { ...player, draftedRound: currentRound, draftedPick: currentOverallPick }]);
    setAvailable(prev => prev.filter(p => p.id !== player.id));
    setCurrentOverallPick(prev => prev + 1);
    setSearch('');
  }

  function logOpponentPick(position) {
    setOpponentCounts(prev => ({ ...prev, [position]: (prev[position] || 0) + 1 }));
    setAvailable(prev => {
      // Remove the top available player at that position (best guess)
      const idx = prev.findIndex(p => p.position === position);
      if (idx === -1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
    setCurrentOverallPick(prev => prev + 1);
  }

  function skipOpponentPick() {
    setCurrentOverallPick(prev => prev + 1);
  }

  function undoLastMyPick() {
    if (myRoster.length === 0) return;
    const last = myRoster[myRoster.length - 1];
    setMyRoster(prev => prev.slice(0, -1));
    setAvailable(prev => [...prev, last].sort((a, b) => a.adp - b.adp));
    setCurrentOverallPick(last.draftedPick);
  }

  const scoredPlayers = useMemo(() => {
    return available.map(p => {
      const posUrgency = urgency[p.position] || 0;
      const isNeed = posUrgency > 0.3;
      const isValuePick = p.adp > currentRound + 2;
      const survival = calcSurvival(p, currentOverallPick, nextMyPick, available);
      const score = p.projectedPts + posUrgency * 8 + (isValuePick ? 5 : 0) + survival * 3;
      return { ...p, isNeed, isValuePick, survival, score };
    }).sort((a, b) => b.score - a.score);
  }, [available, urgency, currentRound, currentOverallPick, nextMyPick]);

  const filtered = scoredPlayers.filter(p => {
    const matchPos = posFilter === 'ALL' || p.position === posFilter;
    const matchSearch = search === '' || p.name.toLowerCase().includes(search.toLowerCase());
    return matchPos && matchSearch;
  });

  // ── Setup Screen ─────────────────────────────────────────────────────────────

  if (!setupDone) {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.backBtn} onClick={() => router.push('/dashboard')}>←</button>
            <span style={styles.logo}>🟠</span>
            <span style={styles.headerTitle}>Draft Setup</span>
          </div>
        </div>
        <div style={styles.setupWrap}>
          <div style={styles.setupCard}>
            <div style={styles.setupTitle}>Before we start</div>
            <div style={styles.setupSub}>Orange needs two things to calculate your pick slots and survival odds.</div>

            <div style={styles.setupField}>
              <label style={styles.setupLabel}>Number of teams in your league</label>
              <div style={styles.setupStepper}>
                <button style={styles.stepBtn} onClick={() => setNumTeams(n => Math.max(2, n - 1))}>−</button>
                <span style={styles.stepValue}>{numTeams}</span>
                <button style={styles.stepBtn} onClick={() => setNumTeams(n => Math.min(20, n + 1))}>+</button>
              </div>
            </div>

            <div style={styles.setupField}>
              <label style={styles.setupLabel}>Your draft position</label>
              <div style={styles.setupStepper}>
                <button style={styles.stepBtn} onClick={() => setDraftPosition(n => Math.max(1, n - 1))}>−</button>
                <span style={styles.stepValue}>{draftPosition}</span>
                <button style={styles.stepBtn} onClick={() => setDraftPosition(n => Math.min(numTeams, n + 1))}>+</button>
              </div>
            </div>

            <div style={styles.setupField}>
              <label style={styles.setupLabel}>Total rounds</label>
              <div style={styles.setupStepper}>
                <button style={styles.stepBtn} onClick={() => setTotalRounds(n => Math.max(5, n - 1))}>−</button>
                <span style={styles.stepValue}>{totalRounds}</span>
                <button style={styles.stepBtn} onClick={() => setTotalRounds(n => Math.min(25, n + 1))}>+</button>
              </div>
            </div>

            <div style={styles.setupPreview}>
              🎯 Your picks: {getSnakePickSlots(draftPosition, numTeams, totalRounds).slice(0, 5).join(', ')}...
            </div>

            <button style={styles.startBtn} onClick={() => setSetupDone(true)}>
              Start Draft →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Draft Screen ──────────────────────────────────────────────────────────────

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
            {draftDone ? 'Done' : `R${currentRound} · P${currentOverallPick}`}
          </div>
          {myRoster.length > 0 && (
            <button style={styles.undoBtn} onClick={undoLastMyPick}>↩</button>
          )}
        </div>
      </div>

      {/* Turn indicator */}
      {!draftDone && (
        <div style={{ ...styles.turnBar, background: isMyTurn ? '#1a2e00' : '#0d0d0d', borderBottomColor: isMyTurn ? '#84cc16' : '#2a2a2a' }}>
          <span style={{ color: isMyTurn ? '#84cc16' : '#52525b', fontWeight: 700, fontSize: 13 }}>
            {isMyTurn ? '⚡ YOUR PICK' : `⏳ Opponent's pick — next yours: #${nextMyPick}`}
          </span>
          {!isMyTurn && (
            <span style={styles.pickPos}>Pick #{currentOverallPick} of {numTeams * totalRounds}</span>
          )}
        </div>
      )}

      {/* Opponent pick logger */}
      {!isMyTurn && !draftDone && (
        <div style={styles.logBar}>
          <div style={styles.logLabel}>What position did they take?</div>
          <div style={styles.logBtns}>
            {['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map(pos => (
              <button key={pos} style={styles.logPosBtn} onClick={() => logOpponentPick(pos)}>
                {pos}
              </button>
            ))}
            <button style={styles.logSkipBtn} onClick={skipOpponentPick}>Skip</button>
          </div>
        </div>
      )}

      {/* Alerts */}
      {missing.length > 0 && currentRound > Math.floor(totalRounds * 0.7) && (
        <div style={styles.alertBanner}>
          ⚠️ Still need: {missing.join(', ')} — don't leave the draft without them!
        </div>
      )}
      {missing.length > 0 && currentRound <= Math.floor(totalRounds * 0.7) && (
        <div style={styles.needBanner}>
          🎯 Open slots: {missing.join(' · ')}
        </div>
      )}

      {/* Orange Suggests — premium only */}
      {!isPremium && isMyTurn && (
        <div style={styles.lockedBanner} onClick={() => router.push('/pricing')}>
          🔒 <strong>Orange Suggests</strong> — unlock expert pattern picks · <span style={{ textDecoration: 'underline' }}>Upgrade</span>
        </div>
      )}
      {isPremium && suggestion && isMyTurn && (
        <div style={styles.suggestBanner}>
          <div style={styles.suggestHeader}>
            🟠 You went {suggestion.heavyPos}-{suggestion.heavyPos} — top {suggestion.suggestPos} available:
          </div>
          {suggestion.players.map((p, i) => {
            const sv = survivalLabel(calcSurvival(p, currentOverallPick, nextMyPick, available));
            return (
              <div key={p.id} style={styles.suggestRow}>
                <span style={styles.suggestRank}>#{i + 1}</span>
                <span style={getPosBadge(p.position)}>{p.position}</span>
                <div style={styles.suggestInfo}>
                  <span style={styles.suggestName}>{p.name}</span>
                  <span style={{ ...styles.suggestMeta, color: sv.color }}>{sv.text}</span>
                </div>
                <button style={styles.suggestDraftBtn} onClick={() => draftPlayer(p)}>Draft</button>
              </div>
            );
          })}
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
          <input
            style={styles.searchInput}
            placeholder="🔍  Search player name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
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

          {filtered.slice(0, 40).map((p) => {
            const sv = survivalLabel(p.survival);
            return (
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
                    <div style={styles.survivalRow}>
                      {isPremium
                        ? <span style={{ ...styles.survivalText, color: sv.color }}>🎯 {sv.text}</span>
                        : <span style={{ ...styles.survivalText, color: '#52525b', cursor: 'pointer' }} onClick={() => router.push('/pricing')}>🔒 Survival odds — upgrade</span>
                      }
                    </div>
                    <div style={styles.badgeRow}>
                      {p.isNeed && <span style={styles.needBadge}>NEED</span>}
                      {p.isValuePick && <span style={styles.valueBadge}>VALUE</span>}
                    </div>
                  </div>
                </div>
                {isMyTurn && (
                  <button style={styles.draftBtn} onClick={() => draftPlayer(p)}>Draft</button>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={styles.emptyState}>No players match that filter.</div>
          )}
        </div>
      )}

      {/* ── ROSTER PANEL ── */}
      {panel === 'roster' && (
        <div style={styles.rosterPanel}>
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Styles ───────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: 16 }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      {[1,2,3,4,5,6,7,8].map(i => (
        <div key={i} style={{
          height: 56, borderRadius: 10, marginBottom: 12,
          background: 'linear-gradient(90deg, #1a1a1a 25%, #242424 50%, #1a1a1a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
        }} />
      ))}
    </div>
  );
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
    background: 'transparent', border: '1px solid #2a2a2a',
    color: '#71717a', borderRadius: 6, padding: '4px 10px', fontSize: 16, cursor: 'pointer',
  },
  logo: { fontSize: 20 },
  headerTitle: { fontSize: 17, fontWeight: 700 },
  roundBadge: {
    background: '#f97316', color: '#fff',
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
  },
  undoBtn: {
    background: '#1f1f1f', border: '1px solid #2a2a2a',
    color: '#a1a1aa', borderRadius: 8, padding: '5px 10px', fontSize: 14, cursor: 'pointer',
  },
  turnBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px', borderBottom: '1px solid',
  },
  pickPos: { fontSize: 11, color: '#3f3f46' },
  logBar: {
    background: '#111', borderBottom: '1px solid #2a2a2a', padding: '10px 16px',
  },
  logLabel: { fontSize: 11, color: '#52525b', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' },
  logBtns: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  logPosBtn: {
    background: '#1f1f1f', border: '1px solid #2a2a2a', color: '#a1a1aa',
    borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
  logSkipBtn: {
    background: 'transparent', border: '1px solid #2a2a2a', color: '#3f3f46',
    borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
  },
  alertBanner: {
    background: '#3f0000', borderBottom: '1px solid #ef4444',
    color: '#fca5a5', fontSize: 13, fontWeight: 700, padding: '10px 16px', textAlign: 'center',
  },
  needBanner: {
    background: '#1a1200', borderBottom: '1px solid #f97316',
    color: '#fbbf24', fontSize: 13, fontWeight: 600, padding: '8px 16px',
  },
  lockedBanner: {
    background: '#1a0a00', borderBottom: '1px solid #7c2d12',
    padding: '10px 16px', fontSize: 12, color: '#9a3412',
    fontWeight: 600, cursor: 'pointer',
  },
  suggestBanner: {
    background: '#0d1a2e', borderBottom: '1px solid #0284c7', padding: '10px 16px',
  },
  suggestHeader: {
    fontSize: 12, fontWeight: 800, color: '#38bdf8',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px',
  },
  suggestRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 0', borderBottom: '1px solid #0f2a3f',
  },
  suggestRank: { fontSize: 11, color: '#334155', fontWeight: 700, width: 20 },
  suggestInfo: { flex: 1, display: 'flex', flexDirection: 'column' },
  suggestName: { fontSize: 13, fontWeight: 700, color: '#e2e8f0' },
  suggestMeta: { fontSize: 11 },
  suggestDraftBtn: {
    background: '#0284c7', color: '#fff', border: 'none',
    borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
  },
  panelToggle: {
    display: 'flex', borderBottom: '1px solid #1f1f1f', background: '#111',
  },
  panelBtn: {
    flex: 1, background: 'transparent', border: 'none', color: '#52525b',
    fontSize: 13, fontWeight: 600, padding: '12px 0', cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  panelBtnActive: { color: '#f97316', borderBottom: '2px solid #f97316' },
  picksPanel: { padding: '12px 16px', paddingBottom: 40 },
  rosterPanel: { padding: '12px 16px', paddingBottom: 40 },
  searchInput: {
    width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a',
    borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#fff',
    outline: 'none', marginBottom: 12, boxSizing: 'border-box',
  },
  posFilters: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  posBtn: {
    background: '#1f1f1f', border: '1px solid #2a2a2a', color: '#a1a1aa',
    borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
    fontWeight: 700, position: 'relative',
  },
  posBtnActive: { background: '#f97316', color: '#fff', borderColor: '#f97316' },
  urgencyDot: {
    position: 'absolute', top: 2, right: 2,
    width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
  },
  playerCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#141414', borderRadius: 10, padding: '12px 14px',
    marginBottom: 8, border: '1px solid #1f1f1f', gap: 10,
  },
  playerLeft: { display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 },
  playerRank: { color: '#3f3f46', fontSize: 11, fontWeight: 700, minWidth: 22, paddingTop: 2 },
  playerTopRow: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 },
  playerName: { fontWeight: 700, fontSize: 14 },
  playerMeta: { fontSize: 11, color: '#52525b', lineHeight: 1.5, marginBottom: 2 },
  survivalRow: { marginBottom: 4 },
  survivalText: { fontSize: 11, fontWeight: 700 },
  badgeRow: { display: 'flex', gap: 5 },
  draftBtn: {
    background: '#f97316', color: '#fff', border: 'none',
    borderRadius: 8, padding: '8px 14px', fontSize: 13,
    fontWeight: 700, cursor: 'pointer', flexShrink: 0, minWidth: 60,
  },
  valueBadge: {
    background: '#16a34a', color: '#fff', fontSize: 9, fontWeight: 800,
    padding: '2px 5px', borderRadius: 3, letterSpacing: '0.5px',
  },
  needBadge: {
    background: '#7c3aed', color: '#fff', fontSize: 9, fontWeight: 800,
    padding: '2px 5px', borderRadius: 3, letterSpacing: '0.5px',
  },
  needSection: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: 800, color: '#52525b',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10,
  },
  needRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  needPos: { fontSize: 11, fontWeight: 800, width: 32, color: '#a1a1aa' },
  needBar: { flex: 1, height: 6, background: '#1f1f1f', borderRadius: 3, overflow: 'hidden' },
  needBarFill: { height: '100%', borderRadius: 3, transition: 'width 0.3s' },
  needCount: { fontSize: 11, color: '#52525b', width: 28, textAlign: 'right' },
  rosterRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 0', borderBottom: '1px solid #1a1a1a',
  },
  rosterRound: { fontSize: 10, color: '#3f3f46', fontWeight: 700, width: 22 },
  rosterInfo: { flex: 1 },
  rosterName: { fontSize: 13, fontWeight: 600 },
  rosterTeam: { fontSize: 11, color: '#52525b' },
  emptyState: { color: '#3f3f46', fontSize: 13, padding: '30px 0', textAlign: 'center' },
  draftComplete: {
    background: '#0a1f0a', border: '1px solid #16a34a',
    borderRadius: 10, padding: '14px', marginTop: 16,
    fontSize: 13, color: '#86efac', textAlign: 'center',
  },
  goLineupBtn: {
    display: 'block', width: '100%', marginTop: 10,
    background: '#f97316', color: '#fff', border: 'none',
    borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  setupWrap: {
    display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
    padding: '40px 20px',
  },
  setupCard: {
    background: '#141414', border: '1px solid #2a2a2a',
    borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 420,
  },
  setupTitle: { fontSize: 22, fontWeight: 800, marginBottom: 6 },
  setupSub: { fontSize: 13, color: '#71717a', marginBottom: 28, lineHeight: 1.5 },
  setupField: { marginBottom: 24 },
  setupLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: '#a1a1aa', marginBottom: 10 },
  setupStepper: { display: 'flex', alignItems: 'center', gap: 16 },
  stepBtn: {
    background: '#1f1f1f', border: '1px solid #2a2a2a', color: '#fff',
    borderRadius: 8, width: 40, height: 40, fontSize: 20,
    cursor: 'pointer', fontWeight: 700, lineHeight: 1,
  },
  stepValue: { fontSize: 28, fontWeight: 800, minWidth: 40, textAlign: 'center' },
  setupPreview: {
    background: '#0f1f0f', border: '1px solid #16a34a',
    borderRadius: 8, padding: '10px 14px',
    fontSize: 12, color: '#86efac', marginBottom: 24,
  },
  startBtn: {
    width: '100%', background: '#f97316', color: '#fff', border: 'none',
    borderRadius: 12, padding: '14px 0', fontSize: 16, fontWeight: 700, cursor: 'pointer',
  },
};

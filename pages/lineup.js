import { useState } from 'react';
import { useRouter } from 'next/router';
import { MY_ROSTER, CURRENT_MATCHUP, WEEKLY_RECOMMENDATIONS } from '../lib/sampleData';

const GRADE_COLOR = { A: '#22c55e', B: '#84cc16', C: '#f59e0b', D: '#ef4444', F: '#7f1d1d' };
const REC_COLOR   = { start: '#22c55e', monitor: '#f59e0b', sit: '#ef4444' };

export default function LineupOptimizer() {
  const router = useRouter();
  const [view, setView] = useState('startsit'); // 'startsit' | 'lineup' | 'matchup'
  const [swapped, setSwapped] = useState({}); // slotId → benchPlayer

  const allStarters = MY_ROSTER.starters.map(p => ({
    ...p,
    ...( swapped[p.id] ? swapped[p.id] : {} ),
    swappedWith: swapped[p.id] || null,
  }));

  const totalProjected = allStarters.reduce((sum, p) => sum + (p.projectedPts || 0), 0);
  const matchup = CURRENT_MATCHUP;
  const winning = matchup.myScore > matchup.opponent.score;

  // Find swap opportunities: bench player projects higher than a same-position starter
  const swapAlerts = MY_ROSTER.bench.filter(benchP => {
    const starter = MY_ROSTER.starters.find(s =>
      (s.position === benchP.position || s.position === 'FLEX') &&
      benchP.projectedPts > s.projectedPts + 2
    );
    return starter && benchP.status !== 'doubtful' && benchP.status !== 'out';
  });

  function doSwap(starterId, benchPlayer) {
    setSwapped(prev => ({ ...prev, [starterId]: benchPlayer }));
  }

  function undoSwap(starterId) {
    setSwapped(prev => { const n = { ...prev }; delete n[starterId]; return n; });
  }

  const starts   = WEEKLY_RECOMMENDATIONS.filter(r => r.recommendation === 'start');
  const monitors = WEEKLY_RECOMMENDATIONS.filter(r => r.recommendation === 'monitor');
  const sits     = WEEKLY_RECOMMENDATIONS.filter(r => r.recommendation === 'sit');

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={() => router.push('/dashboard')}>←</button>
          <span style={styles.logo}>🟠</span>
          <span style={styles.headerTitle}>Week {matchup.week} Lineup</span>
        </div>
        <div style={styles.projBadge}>
          <span style={styles.projLabel}>Projected</span>
          <span style={styles.projScore}>{totalProjected.toFixed(1)}</span>
        </div>
      </div>

      {/* Matchup Summary Card */}
      <div style={styles.matchupCard}>
        <div style={styles.matchupSide}>
          <div style={{ ...styles.matchupScore, color: winning ? '#22c55e' : '#f97316' }}>
            {matchup.myScore.toFixed(2)}
          </div>
          <div style={styles.matchupTeam}>Frogman's Squad</div>
          <div style={styles.matchupProj}>Proj: {matchup.myProjected.toFixed(1)}</div>
        </div>
        <div style={styles.matchupVs}>VS</div>
        <div style={{ ...styles.matchupSide, textAlign: 'right' }}>
          <div style={{ ...styles.matchupScore, color: winning ? '#ef4444' : '#22c55e' }}>
            {matchup.opponent.score.toFixed(2)}
          </div>
          <div style={styles.matchupTeam}>{matchup.opponent.name}</div>
          <div style={styles.matchupProj}>Proj: {matchup.opponent.projected.toFixed(1)}</div>
        </div>
      </div>

      {/* Edge indicator */}
      <div style={styles.edgeBar}>
        <span style={styles.edgeLabel}>Your projected edge</span>
        <span style={{ ...styles.edgeValue, color: matchup.myProjected > matchup.opponent.projected ? '#22c55e' : '#ef4444' }}>
          {matchup.myProjected > matchup.opponent.projected ? '+' : ''}
          {(matchup.myProjected - matchup.opponent.projected).toFixed(1)} pts
        </span>
      </div>

      {/* Swap Alert */}
      {swapAlerts.length > 0 && (
        <div style={styles.swapAlert}>
          🔄 {swapAlerts.length} bench player{swapAlerts.length > 1 ? 's' : ''} outproject{swapAlerts.length === 1 ? 's' : ''} a starter — check your lineup!
        </div>
      )}

      {/* View Tabs */}
      <div style={styles.tabs}>
        {[
          { key: 'startsit', label: '✅ Start/Sit' },
          { key: 'lineup',   label: '📋 My Lineup' },
          { key: 'matchup',  label: '⚔️ Matchup' },
        ].map(t => (
          <button
            key={t.key}
            style={{ ...styles.tabBtn, ...(view === t.key ? styles.tabActive : {}) }}
            onClick={() => setView(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── START / SIT VIEW ── */}
      {view === 'startsit' && (
        <div style={styles.content}>
          {starts.length > 0 && (
            <RecSection title="✅ Start" color="#22c55e" recs={starts} />
          )}
          {monitors.length > 0 && (
            <RecSection title="👀 Monitor" color="#f59e0b" recs={monitors} />
          )}
          {sits.length > 0 && (
            <RecSection title="🪑 Sit" color="#ef4444" recs={sits} />
          )}
        </div>
      )}

      {/* ── LINEUP VIEW ── */}
      {view === 'lineup' && (
        <div style={styles.content}>
          <div style={styles.sectionLabel}>Starters</div>
          {MY_ROSTER.starters.map(starter => {
            const active = swapped[starter.id] || starter;
            const isSub = !!swapped[starter.id];
            const benchUpgrade = MY_ROSTER.bench.find(
              b => b.position === starter.position &&
                   b.projectedPts > starter.projectedPts + 2 &&
                   b.status !== 'doubtful'
            );
            return (
              <div key={starter.id} style={{ ...styles.lineupCard, ...(isSub ? styles.lineupCardSub : {}) }}>
                <div style={styles.lineupLeft}>
                  <span style={styles.slotLabel}>{starter.position}</span>
                  <span style={getPosBadge(active.position)}>{active.position}</span>
                  <div style={styles.lineupInfo}>
                    <div style={styles.lineupName}>
                      {active.name}
                      {active.injuryNote && <span style={styles.injuryTag}> ⚠️</span>}
                      {isSub && <span style={styles.subTag}> SWAPPED</span>}
                    </div>
                    <div style={styles.lineupTeam}>{active.team}</div>
                  </div>
                </div>
                <div style={styles.lineupRight}>
                  <div style={styles.lineupProj}>{active.projectedPts.toFixed(1)}</div>
                  {benchUpgrade && !isSub && (
                    <button style={styles.swapBtn} onClick={() => doSwap(starter.id, benchUpgrade)}>
                      ↑ {benchUpgrade.name.split(' ').pop()} {benchUpgrade.projectedPts.toFixed(1)}
                    </button>
                  )}
                  {isSub && (
                    <button style={styles.undoSwapBtn} onClick={() => undoSwap(starter.id)}>
                      ↩ Undo
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{ ...styles.sectionLabel, marginTop: 20 }}>Bench</div>
          {MY_ROSTER.bench.map(p => (
            <div key={p.id} style={{ ...styles.lineupCard, opacity: 0.65 }}>
              <div style={styles.lineupLeft}>
                <span style={styles.slotLabel}>BN</span>
                <span style={getPosBadge(p.position)}>{p.position}</span>
                <div style={styles.lineupInfo}>
                  <div style={styles.lineupName}>
                    {p.name}
                    {p.injuryNote && <span style={styles.injuryTag}> ⚠️ {p.injuryNote}</span>}
                  </div>
                  <div style={styles.lineupTeam}>{p.team}</div>
                </div>
              </div>
              <div style={styles.lineupRight}>
                <div style={styles.lineupProj}>{p.projectedPts.toFixed(1)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MATCHUP VIEW ── */}
      {view === 'matchup' && (
        <div style={styles.content}>

          <div style={styles.sectionLabel}>Their Defensive Weaknesses</div>
          <div style={styles.weaknessGrid}>
            {Object.entries(matchup.opponentWeaknesses).map(([pos, grade]) => (
              <div key={pos} style={styles.weaknessCard}>
                <span style={getPosBadge(pos)}>{pos}</span>
                <span style={{ ...styles.gradeTag, color: GRADE_COLOR[grade] }}>{grade}</span>
                <span style={styles.weaknessHint}>
                  {grade === 'A' ? 'Attack here' : grade === 'B' ? 'Favorable' : grade === 'C' ? 'Neutral' : 'Tough'}
                </span>
              </div>
            ))}
          </div>

          <div style={styles.sectionLabel}>Your Players vs Their Defense</div>
          {MY_ROSTER.starters.map(p => {
            const grade = matchup.opponentWeaknesses[p.position] || 'C';
            const rec = WEEKLY_RECOMMENDATIONS.find(r => r.player.id === p.id);
            return (
              <div key={p.id} style={styles.matchupPlayerCard}>
                <span style={getPosBadge(p.position)}>{p.position}</span>
                <div style={styles.matchupPlayerInfo}>
                  <div style={styles.matchupPlayerName}>
                    {p.name}
                    {p.injuryNote && <span style={styles.injuryTag}> ⚠️</span>}
                  </div>
                  {rec && <div style={styles.matchupReason}>{rec.reason}</div>}
                </div>
                <div style={styles.matchupGradeWrap}>
                  <span style={{ ...styles.gradeTag, color: GRADE_COLOR[grade] }}>{grade}</span>
                  <span style={styles.matchupPts}>{p.projectedPts.toFixed(1)}</span>
                </div>
              </div>
            );
          })}

          <div style={styles.sectionLabel}>Their Starters</div>
          {matchup.opponent.starters.map(p => (
            <div key={p.id} style={{ ...styles.matchupPlayerCard, opacity: 0.75 }}>
              <span style={getPosBadge(p.position)}>{p.position}</span>
              <div style={styles.matchupPlayerInfo}>
                <div style={styles.matchupPlayerName}>{p.name}</div>
                <div style={styles.lineupTeam}>{p.team}</div>
              </div>
              <div style={styles.matchupGradeWrap}>
                <span style={styles.matchupPts}>{p.projectedPts.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Nav */}
      <div style={styles.bottomNav}>
        <button style={styles.navBtn} onClick={() => router.push('/draft')}>🎯 Draft</button>
        <button style={{ ...styles.navBtn, ...styles.navBtnActive }}>📊 Lineup</button>
        <button style={styles.navBtn} onClick={() => router.push('/dashboard')}>🏠 Home</button>
      </div>
    </div>
  );
}

// ─── Start/Sit Section ────────────────────────────────────────────────────────

function RecSection({ title, color, recs }) {
  return (
    <div style={styles.recSection}>
      <div style={{ ...styles.recSectionTitle, color }}>{title}</div>
      {recs.map((rec, i) => (
        <div key={i} style={styles.recCard}>
          <div style={styles.recCardLeft}>
            <span style={getPosBadge(rec.player.position)}>{rec.player.position}</span>
            <div style={styles.recCardInfo}>
              <div style={styles.recCardName}>
                {rec.player.name}
                {rec.injuryFlag && <span style={styles.injuryTag}> ⚠️</span>}
              </div>
              <div style={styles.recCardReason}>{rec.reason}</div>
            </div>
          </div>
          <div style={styles.recCardRight}>
            <div style={styles.recCardPts}>{rec.player.projectedPts.toFixed(1)}</div>
            <div style={{ ...styles.gradeTag, color: GRADE_COLOR[rec.matchupGrade] }}>
              {rec.matchupGrade}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPosBadge(position) {
  const colors = {
    QB:   { background: '#7c3aed', color: '#fff' },
    RB:   { background: '#16a34a', color: '#fff' },
    WR:   { background: '#0284c7', color: '#fff' },
    TE:   { background: '#d97706', color: '#fff' },
    K:    { background: '#6b7280', color: '#fff' },
    DEF:  { background: '#dc2626', color: '#fff' },
    FLEX: { background: '#475569', color: '#fff' },
  };
  return {
    fontSize: 10, fontWeight: 800, padding: '2px 6px',
    borderRadius: 4, flexShrink: 0,
    ...(colors[position] || { background: '#374151', color: '#fff' }),
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f0f0f',
    color: '#fff',
    fontFamily: "'Inter', -apple-system, sans-serif",
    paddingBottom: 80,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid #1f1f1f',
    background: '#111', position: 'sticky', top: 0, zIndex: 10,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn: {
    background: 'transparent', border: '1px solid #2a2a2a',
    color: '#71717a', borderRadius: 6, padding: '4px 10px', fontSize: 16, cursor: 'pointer',
  },
  logo: { fontSize: 20 },
  headerTitle: { fontSize: 17, fontWeight: 700 },
  projBadge: { textAlign: 'right' },
  projLabel: { display: 'block', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.5px' },
  projScore: { fontSize: 22, fontWeight: 800, color: '#f97316' },
  matchupCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#161616', border: '1px solid #222',
    margin: '12px 16px', borderRadius: 12, padding: '16px',
  },
  matchupSide: { flex: 1 },
  matchupScore: { fontSize: 28, fontWeight: 800 },
  matchupTeam: { fontSize: 12, color: '#71717a', marginTop: 2 },
  matchupProj: { fontSize: 11, color: '#52525b', marginTop: 1 },
  matchupVs: { fontSize: 12, fontWeight: 800, color: '#3f3f46', padding: '0 12px' },
  edgeBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#0d0d0d', borderTop: '1px solid #1f1f1f', borderBottom: '1px solid #1f1f1f',
    padding: '8px 16px',
  },
  edgeLabel: { fontSize: 12, color: '#52525b' },
  edgeValue: { fontSize: 13, fontWeight: 800 },
  swapAlert: {
    background: '#0f1a2e', borderBottom: '1px solid #0284c7',
    color: '#38bdf8', fontSize: 13, fontWeight: 600, padding: '10px 16px',
  },
  tabs: {
    display: 'flex', borderBottom: '1px solid #1f1f1f', background: '#111',
  },
  tabBtn: {
    flex: 1, background: 'transparent', border: 'none', color: '#52525b',
    fontSize: 12, fontWeight: 600, padding: '12px 4px', cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  tabActive: { color: '#f97316', borderBottom: '2px solid #f97316' },
  content: { padding: '12px 16px' },
  sectionLabel: {
    fontSize: 11, fontWeight: 800, color: '#52525b',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, marginTop: 4,
  },
  recSection: { marginBottom: 20 },
  recSectionTitle: { fontSize: 14, fontWeight: 800, marginBottom: 10 },
  recCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#141414', borderRadius: 10, padding: '12px 14px',
    marginBottom: 8, border: '1px solid #1f1f1f', gap: 10,
  },
  recCardLeft: { display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 },
  recCardInfo: { flex: 1 },
  recCardName: { fontSize: 14, fontWeight: 700, marginBottom: 3 },
  recCardReason: { fontSize: 12, color: '#71717a', lineHeight: 1.4 },
  recCardRight: { textAlign: 'right', flexShrink: 0 },
  recCardPts: { fontSize: 18, fontWeight: 800, color: '#f97316' },
  gradeTag: { fontSize: 14, fontWeight: 800 },
  lineupCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#141414', borderRadius: 10, padding: '11px 14px',
    marginBottom: 6, border: '1px solid #1f1f1f', gap: 8,
  },
  lineupCardSub: { border: '1px solid #0284c7', background: '#0d1a2e' },
  lineupLeft: { display: 'flex', alignItems: 'center', gap: 8, flex: 1 },
  slotLabel: { fontSize: 10, color: '#3f3f46', fontWeight: 800, width: 30 },
  lineupInfo: { flex: 1 },
  lineupName: { fontSize: 13, fontWeight: 700 },
  lineupTeam: { fontSize: 11, color: '#52525b', marginTop: 1 },
  lineupRight: { textAlign: 'right', flexShrink: 0 },
  lineupProj: { fontSize: 16, fontWeight: 800, color: '#f97316' },
  swapBtn: {
    display: 'block', marginTop: 4,
    background: '#0284c7', color: '#fff', border: 'none',
    borderRadius: 5, padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
  },
  undoSwapBtn: {
    display: 'block', marginTop: 4,
    background: '#1f1f1f', color: '#a1a1aa', border: '1px solid #2a2a2a',
    borderRadius: 5, padding: '3px 8px', fontSize: 10, cursor: 'pointer',
  },
  injuryTag: { color: '#ef4444', fontSize: 10, fontWeight: 700 },
  subTag: { color: '#38bdf8', fontSize: 10, fontWeight: 700 },
  matchupPlayerCard: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#141414', borderRadius: 10, padding: '11px 14px',
    marginBottom: 6, border: '1px solid #1f1f1f',
  },
  matchupPlayerInfo: { flex: 1 },
  matchupPlayerName: { fontSize: 13, fontWeight: 700 },
  matchupReason: { fontSize: 11, color: '#71717a', marginTop: 2, lineHeight: 1.4 },
  matchupGradeWrap: { textAlign: 'right' },
  matchupPts: { display: 'block', fontSize: 15, fontWeight: 800, color: '#f97316' },
  weaknessGrid: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  weaknessCard: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
    padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, flexDirection: 'column',
  },
  weaknessHint: { fontSize: 10, color: '#52525b', textAlign: 'center' },
  bottomNav: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#111', borderTop: '1px solid #1f1f1f',
    display: 'flex', padding: '10px 0',
  },
  navBtn: {
    flex: 1, background: 'transparent', border: 'none', color: '#52525b',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 0',
  },
  navBtnActive: { color: '#f97316' },
};

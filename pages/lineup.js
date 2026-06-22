import { useState, useEffect } from 'react';
import { optimizeLineup, getMatchupGradeColor, formatProjection } from '../lib/optimizer';

export default function LineupOptimizer() {
  const [roster, setRoster] = useState([]);
  const [opponentRoster, setOpponentRoster] = useState([]);
  const [lineupResult, setLineupResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [week, setWeek] = useState(1);
  const [scoringType] = useState('ppr');
  const [view, setView] = useState('recommendations'); // 'recommendations' | 'lineup'

  async function runOptimizer() {
    if (!roster.length) return;
    setLoading(true);
    try {
      const result = await optimizeLineup({
        roster,
        opponentRoster,
        week,
        scoringType,
        rosterSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
      });
      setLineupResult(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (roster.length > 0) runOptimizer();
  }, [roster, opponentRoster, week]);

  const starters = lineupResult?.lineup || [];
  const recommendations = lineupResult?.recommendations || [];
  const totalProjected = lineupResult?.totalProjected || 0;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🟠</span>
          <span style={styles.headerTitle}>Week {week} Lineup</span>
        </div>
        <div style={styles.headerRight}>
          <select
            value={week}
            onChange={e => setWeek(Number(e.target.value))}
            style={styles.weekSelect}
          >
            {Array.from({ length: 17 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Week {i + 1}</option>
            ))}
          </select>
          {totalProjected > 0 && (
            <div style={styles.projectedTotal}>
              <span style={styles.projectedLabel}>Projected</span>
              <span style={styles.projectedScore}>{formatProjection(totalProjected)}</span>
            </div>
          )}
        </div>
      </div>

      {/* View Toggle */}
      <div style={styles.viewToggle}>
        <button
          style={{ ...styles.toggleBtn, ...(view === 'recommendations' ? styles.toggleActive : {}) }}
          onClick={() => setView('recommendations')}
        >
          Start/Sit
        </button>
        <button
          style={{ ...styles.toggleBtn, ...(view === 'lineup' ? styles.toggleActive : {}) }}
          onClick={() => setView('lineup')}
        >
          My Lineup
        </button>
      </div>

      {/* Empty State */}
      {!roster.length ? (
        <div style={styles.emptyWrap}>
          <div style={styles.emptyIcon}>🏈</div>
          <div style={styles.emptyTitle}>Connect Your Team</div>
          <div style={styles.emptySub}>
            Link your Yahoo Fantasy account to get opponent-aware lineup recommendations every week.
          </div>
          <button style={styles.connectBtn} onClick={() => window.location.href = '/auth/yahoo'}>
            Connect Yahoo Fantasy →
          </button>
        </div>
      ) : loading ? (
        <div style={styles.loadingWrap}>
          <div style={styles.loadingText}>Analyzing your matchup...</div>
        </div>
      ) : view === 'recommendations' ? (
        <RecommendationsView recommendations={recommendations} />
      ) : (
        <LineupView starters={starters} />
      )}
    </div>
  );
}

function RecommendationsView({ recommendations }) {
  const starts = recommendations.filter(r => r.recommendation === 'start');
  const sits = recommendations.filter(r => r.recommendation === 'sit');
  const monitors = recommendations.filter(r => r.recommendation === 'monitor');

  return (
    <div style={styles.content}>
      {starts.length > 0 && (
        <Section title="✅ Start" color="#22c55e" players={starts} />
      )}
      {monitors.length > 0 && (
        <Section title="👀 Monitor" color="#facc15" players={monitors} />
      )}
      {sits.length > 0 && (
        <Section title="🪑 Sit" color="#ef4444" players={sits} />
      )}
    </div>
  );
}

function Section({ title, color, players }) {
  return (
    <div style={styles.section}>
      <div style={{ ...styles.sectionTitle, color }}>{title}</div>
      {players.map((rec, i) => (
        <PlayerRow key={i} rec={rec} />
      ))}
    </div>
  );
}

function PlayerRow({ rec }) {
  const { player, recommendation, projectedPoints, matchupGrade, reason, injuryFlag } = rec;

  return (
    <div style={styles.playerRow}>
      <div style={styles.playerLeft}>
        <span style={getPositionBadge(player?.position)}>{player?.position}</span>
        <div>
          <div style={styles.playerName}>
            {player?.full_name || player?.name}
            {injuryFlag && <span style={styles.injuryFlag}> ⚠️</span>}
          </div>
          <div style={styles.playerReason}>{reason}</div>
        </div>
      </div>
      <div style={styles.playerRight}>
        <div style={styles.projPoints}>{formatProjection(projectedPoints)}</div>
        <div style={{ ...styles.matchupGrade, color: getMatchupGradeColor(matchupGrade) }}>
          {matchupGrade}
        </div>
      </div>
    </div>
  );
}

function LineupView({ starters }) {
  return (
    <div style={styles.content}>
      <div style={styles.lineupGrid}>
        {starters.map((player, i) => (
          <div key={i} style={styles.lineupSlot}>
            <div style={styles.slotLabel}>{player.slot}</div>
            <div style={styles.slotPlayer}>{player.full_name || player.name || '—'}</div>
            <div style={styles.slotProj}>{formatProjection(player.projectedPoints)} pts</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getPositionBadge(position) {
  const colors = {
    QB: { background: '#7c3aed' },
    RB: { background: '#16a34a' },
    WR: { background: '#0284c7' },
    TE: { background: '#d97706' },
    K: { background: '#6b7280' },
    DEF: { background: '#dc2626' },
  };
  return {
    ...styles.posBadge,
    ...(colors[position] || { background: '#374151' }),
    color: '#fff',
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
    padding: '16px 24px',
    borderBottom: '1px solid #1f1f1f',
    background: '#111',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  logo: { fontSize: 24 },
  headerTitle: { fontSize: 18, fontWeight: 700 },
  weekSelect: {
    background: '#1f1f1f',
    border: '1px solid #2a2a2a',
    color: '#fff',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 14,
  },
  projectedTotal: { textAlign: 'right' },
  projectedLabel: { display: 'block', fontSize: 11, color: '#52525b', textTransform: 'uppercase' },
  projectedScore: { fontSize: 22, fontWeight: 800, color: '#f97316' },
  viewToggle: {
    display: 'flex',
    gap: 0,
    padding: '12px 24px',
    borderBottom: '1px solid #1f1f1f',
  },
  toggleBtn: {
    background: 'transparent',
    border: '1px solid #2a2a2a',
    color: '#71717a',
    padding: '8px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    color: '#71717a',
  },
  toggleActive: {
    background: '#f97316',
    borderColor: '#f97316',
    color: '#fff',
  },
  content: { padding: 24, maxWidth: 720, margin: '0 auto' },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 15, fontWeight: 800, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#161616',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 8,
    border: '1px solid #222',
    gap: 12,
  },
  playerLeft: { display: 'flex', alignItems: 'center', gap: 12, flex: 1 },
  playerName: { fontWeight: 600, fontSize: 15, marginBottom: 2 },
  playerReason: { fontSize: 13, color: '#71717a', lineHeight: 1.4 },
  injuryFlag: { color: '#facc15' },
  playerRight: { textAlign: 'right', flexShrink: 0 },
  projPoints: { fontSize: 18, fontWeight: 800, color: '#f97316' },
  matchupGrade: { fontSize: 12, fontWeight: 700 },
  posBadge: {
    fontSize: 11,
    fontWeight: 800,
    padding: '2px 7px',
    borderRadius: 4,
    letterSpacing: '0.3px',
    flexShrink: 0,
  },
  emptyWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    textAlign: 'center',
    gap: 16,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 22, fontWeight: 800 },
  emptySub: { fontSize: 15, color: '#71717a', maxWidth: 380, lineHeight: 1.5 },
  connectBtn: {
    background: '#f97316',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '14px 28px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
  },
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    padding: '80px 24px',
  },
  loadingText: { color: '#52525b', fontSize: 15 },
  lineupGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  lineupSlot: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: '#161616',
    borderRadius: 10,
    padding: '14px 18px',
    border: '1px solid #222',
  },
  slotLabel: { fontSize: 12, fontWeight: 800, color: '#52525b', width: 42, textTransform: 'uppercase' },
  slotPlayer: { flex: 1, fontWeight: 600, fontSize: 15 },
  slotProj: { fontSize: 14, color: '#f97316', fontWeight: 700 },
};

import { useState, useEffect } from 'react';
import { getDraftRecommendations, getADP, getRosterNeedLabel } from '../lib/optimizer';
import { getAvailablePlayers, getLeagueRoster } from '../lib/yahoo';

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

export default function DraftCompanion() {
  const [myRoster, setMyRoster] = useState([]);
  const [available, setAvailable] = useState([]);
  const [recommendations, setRecs] = useState([]);
  const [rosterNeeds, setRosterNeeds] = useState({});
  const [posFilter, setPosFilter] = useState('ALL');
  const [currentRound, setCurrentRound] = useState(1);
  const [scoringType] = useState('ppr');
  const [loading, setLoading] = useState(false);
  const [adpData, setAdpData] = useState([]);

  useEffect(() => {
    loadADP();
  }, [scoringType]);

  useEffect(() => {
    if (available.length > 0) fetchRecommendations();
  }, [myRoster, available, currentRound]);

  async function loadADP() {
    const { data } = await getADP(scoringType);
    setAdpData(data || []);
  }

  async function fetchRecommendations() {
    setLoading(true);
    try {
      const { recommendations: recs, rosterNeeds: needs } = await getDraftRecommendations({
        draftedPlayers: myRoster,
        availablePlayers: available,
        scoringType,
        currentRound,
        totalRounds: 15,
        userDraftPosition: 1,
      });
      setRecs(recs || []);
      setRosterNeeds(needs || {});
    } finally {
      setLoading(false);
    }
  }

  function draftPlayer(player) {
    setMyRoster(prev => [...prev, player]);
    setAvailable(prev => prev.filter(p => p.id !== player.id));
    setCurrentRound(Math.ceil((myRoster.length + 1) / 1) + 1);
  }

  const filtered = recommendations.filter(
    r => posFilter === 'ALL' || r.player.position === posFilter
  );

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🟠</span>
          <span style={styles.headerTitle}>Draft Companion</span>
        </div>
        <div style={styles.roundBadge}>Round {currentRound}</div>
      </div>

      {/* Roster Need Banner */}
      {Object.keys(rosterNeeds).length > 0 && (
        <div style={styles.needBanner}>
          <span style={styles.needIcon}>🎯</span>
          {getRosterNeedLabel(rosterNeeds)}
        </div>
      )}

      <div style={styles.content}>
        {/* Left: Recommendations */}
        <div style={styles.leftPanel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Orange Picks</span>
            <div style={styles.posFilters}>
              {POSITIONS.map(pos => (
                <button
                  key={pos}
                  style={{
                    ...styles.posBtn,
                    ...(posFilter === pos ? styles.posBtnActive : {}),
                  }}
                  onClick={() => setPosFilter(pos)}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={styles.loadingState}>Analyzing your roster needs...</div>
          ) : filtered.length === 0 ? (
            <div style={styles.emptyState}>Connect your Yahoo draft to see live picks</div>
          ) : (
            filtered.map((rec, i) => (
              <PlayerCard
                key={rec.player.id || i}
                rec={rec}
                onDraft={() => draftPlayer(rec.player)}
              />
            ))
          )}
        </div>

        {/* Right: My Roster */}
        <div style={styles.rightPanel}>
          <div style={styles.panelTitle}>My Roster ({myRoster.length})</div>

          {myRoster.length === 0 ? (
            <div style={styles.emptyState}>Your picks will appear here</div>
          ) : (
            myRoster.map((p, i) => (
              <div key={i} style={styles.rosterRow}>
                <span style={getPositionBadgeStyle(p.position)}>{p.position}</span>
                <span style={styles.rosterName}>{p.full_name || p.name}</span>
                <span style={styles.rosterTeam}>{p.nfl_team_abbr || p.team}</span>
              </div>
            ))
          )}

          {/* Position Need Breakdown */}
          {Object.keys(rosterNeeds).length > 0 && (
            <div style={styles.needBreakdown}>
              <div style={styles.needBreakdownTitle}>Position Needs</div>
              {Object.entries(rosterNeeds)
                .sort(([, a], [, b]) => b - a)
                .map(([pos, urgency]) => (
                  <div key={pos} style={styles.needRow}>
                    <span style={styles.needPos}>{pos}</span>
                    <div style={styles.needBar}>
                      <div
                        style={{
                          ...styles.needBarFill,
                          width: `${urgency * 100}%`,
                          background: urgency > 0.7 ? '#f97316' : urgency > 0.4 ? '#facc15' : '#22c55e',
                        }}
                      />
                    </div>
                    <span style={styles.needPct}>{Math.round(urgency * 100)}%</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ rec, onDraft }) {
  const { player, reason, isValuePick, isPositionalNeed, rank } = rec;

  return (
    <div style={styles.playerCard}>
      <div style={styles.playerRank}>#{rank}</div>
      <div style={styles.playerInfo}>
        <div style={styles.playerTop}>
          <span style={getPositionBadgeStyle(player.position)}>{player.position}</span>
          <span style={styles.playerName}>{player.full_name || player.name}</span>
          <span style={styles.playerTeam}>{player.nfl_team_abbr || player.team}</span>
          {isValuePick && <span style={styles.valueBadge}>VALUE</span>}
          {isPositionalNeed && <span style={styles.needBadge}>NEED</span>}
        </div>
        <div style={styles.playerADP}>ADP: {player.adp?.toFixed(1) || '—'}</div>
        <div style={styles.playerReason}>{reason}</div>
      </div>
      <button style={styles.draftBtn} onClick={onDraft}>
        Draft
      </button>
    </div>
  );
}

function getPositionBadgeStyle(position) {
  const colors = {
    QB: { background: '#7c3aed', color: '#fff' },
    RB: { background: '#16a34a', color: '#fff' },
    WR: { background: '#0284c7', color: '#fff' },
    TE: { background: '#d97706', color: '#fff' },
    K: { background: '#6b7280', color: '#fff' },
    DEF: { background: '#dc2626', color: '#fff' },
  };
  return {
    ...styles.posBadge,
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
    padding: '16px 24px',
    borderBottom: '1px solid #1f1f1f',
    background: '#111',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  logo: { fontSize: 24 },
  headerTitle: { fontSize: 18, fontWeight: 700 },
  roundBadge: {
    background: '#f97316',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
  },
  needBanner: {
    background: '#1a1200',
    borderBottom: '1px solid #f97316',
    padding: '10px 24px',
    fontSize: 14,
    color: '#fbbf24',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  needIcon: { fontSize: 16 },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: 0,
    minHeight: 'calc(100vh - 110px)',
  },
  leftPanel: { padding: 20, borderRight: '1px solid #1f1f1f' },
  rightPanel: { padding: 20, background: '#0a0a0a' },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  panelTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12 },
  posFilters: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  posBtn: {
    background: '#1f1f1f',
    border: '1px solid #2a2a2a',
    color: '#a1a1aa',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 600,
  },
  posBtnActive: {
    background: '#f97316',
    color: '#fff',
    borderColor: '#f97316',
  },
  playerCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    background: '#161616',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 8,
    border: '1px solid #222',
  },
  playerRank: { color: '#52525b', fontSize: 13, fontWeight: 700, minWidth: 24, paddingTop: 2 },
  playerInfo: { flex: 1 },
  playerTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  playerName: { fontWeight: 600, fontSize: 15 },
  playerTeam: { color: '#71717a', fontSize: 13 },
  playerADP: { fontSize: 12, color: '#52525b', marginBottom: 4 },
  playerReason: { fontSize: 13, color: '#a1a1aa', lineHeight: 1.4 },
  draftBtn: {
    background: '#f97316',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  valueBadge: {
    background: '#16a34a',
    color: '#fff',
    fontSize: 10,
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: '0.5px',
  },
  needBadge: {
    background: '#7c3aed',
    color: '#fff',
    fontSize: 10,
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: '0.5px',
  },
  posBadge: {
    fontSize: 11,
    fontWeight: 800,
    padding: '2px 7px',
    borderRadius: 4,
    letterSpacing: '0.3px',
  },
  rosterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 0',
    borderBottom: '1px solid #1a1a1a',
  },
  rosterName: { flex: 1, fontSize: 14, fontWeight: 500 },
  rosterTeam: { fontSize: 12, color: '#52525b' },
  needBreakdown: { marginTop: 24 },
  needBreakdownTitle: { fontSize: 13, fontWeight: 700, color: '#71717a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' },
  needRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  needPos: { fontSize: 12, fontWeight: 700, width: 30, color: '#a1a1aa' },
  needBar: { flex: 1, height: 6, background: '#1f1f1f', borderRadius: 3, overflow: 'hidden' },
  needBarFill: { height: '100%', borderRadius: 3, transition: 'width 0.3s' },
  needPct: { fontSize: 11, color: '#52525b', width: 32, textAlign: 'right' },
  loadingState: { color: '#52525b', fontSize: 14, padding: '40px 0', textAlign: 'center' },
  emptyState: { color: '#3f3f46', fontSize: 14, padding: '40px 0', textAlign: 'center' },
};

import { useState } from 'react';
import { useRouter } from 'next/router';
import { withAuth } from '../lib/withAuth';
import {
  LEAGUE,
  TEAMS,
  MY_ROSTER,
  CURRENT_MATCHUP,
  WEEKLY_RECOMMENDATIONS,
  WAIVER_RECOMMENDATIONS,
} from '../lib/sampleData';
import { useTrial } from '../lib/useTrial';
import PaywallModal from '../components/PaywallModal';

function Dashboard() {
  const router = useRouter();
  const [view, setView] = useState('roster'); // 'roster' | 'matchup' | 'lineup' | 'standings'

  const myTeam = TEAMS.find(t => t.isMe);
  const { status, daysLeft, isExpired } = useTrial();
  const [paywallDismissed, setPaywallDismissed] = useState(false);

  if (status === 'loading') return <DashboardSkeleton />;

  return (
    <div style={styles.page}>

      {/* Paywall Modal */}
      {isExpired && !paywallDismissed && (
        <PaywallModal onDismiss={() => setPaywallDismissed(true)} />
      )}

      {/* Trial Countdown Banner */}
      {status === 'trial' && (
        <div style={styles.trialBanner}>
          🟠 {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your free trial —{' '}
          <span
            style={{ textDecoration: 'underline', cursor: 'pointer' }}
            onClick={() => router.push('/pricing')}
          >
            upgrade to keep access
          </span>
        </div>
      )}

      {/* Live Data Banner */}
      <div style={styles.banner}>
        🕐 Yahoo API approval in progress — showing Footagio League preview data. Live data syncs automatically when approved.
      </div>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🟠</span>
          <span style={styles.headerTitle}>Orange</span>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.userBadge}>Frogman68</div>
          <div style={styles.weekBadge}>Week {CURRENT_MATCHUP.week}</div>
        </div>
      </div>

      {/* League Header */}
      <div style={styles.leagueHeader}>
        <div style={styles.leagueName}>{LEAGUE.name}</div>
        <div style={styles.leagueMeta}>{LEAGUE.numTeams} teams · {LEAGUE.scoringType} · Yahoo</div>
      </div>

      {/* My Team Summary Card */}
      <div style={styles.myTeamCard}>
        <div style={styles.myTeamLeft}>
          <div style={styles.myTeamName}>{myTeam.name}</div>
          <div style={styles.myTeamRecord}>{myTeam.wins}-{myTeam.losses} · {myTeam.pf.toFixed(1)} pts for</div>
        </div>
        <div style={styles.myTeamRight}>
          <div style={styles.myTeamRank}>🏆 #1 in League</div>
        </div>
      </div>

      {/* View Toggle */}
      <div style={styles.viewToggle}>
        {[
          { key: 'roster',    label: '📋 Roster' },
          { key: 'matchup',   label: '⚔️ Matchup' },
          { key: 'lineup',    label: '💡 Lineup Tips' },
          { key: 'standings', label: '📊 Standings' },
        ].map(v => (
          <button
            key={v.key}
            style={{ ...styles.toggleBtn, ...(view === v.key ? styles.toggleActive : {}) }}
            onClick={() => setView(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Views */}
      {view === 'roster'    && <RosterView />}
      {view === 'matchup'   && <MatchupView />}
      {view === 'lineup'    && <LineupView />}
      {view === 'standings' && <StandingsView />}

      {/* Waiver Wire */}
      {view === 'roster' && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>🔔 Waiver Wire Moves</div>
          {WAIVER_RECOMMENDATIONS.map((w, i) => (
            <div key={i} style={styles.waiverRow}>
              <div style={styles.waiverPlayers}>
                <span style={styles.waiverAdd}>+ {w.addPlayer.name}</span>
                <span style={getPosBadge(w.addPlayer.position)}>{w.addPlayer.position}</span>
                {w.dropPlayer && (
                  <>
                    <span style={styles.waiverDrop}>− {w.dropPlayer.name}</span>
                    <span style={getPosBadge(w.dropPlayer.position)}>{w.dropPlayer.position}</span>
                  </>
                )}
              </div>
              <div style={styles.waiverReason}>{w.reason}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Nav */}
      <div style={styles.bottomNav}>
        <button style={styles.navBtn} onClick={() => router.push('/draft')}>🎯 Draft</button>
        <button style={styles.navBtn} onClick={() => router.push('/lineup')}>📊 Lineup</button>
        <button style={{ ...styles.navBtn, ...styles.navBtnActive }}>🏠 Home</button>
        <button style={styles.navBtn} onClick={() => router.push('/news')}>📰 News</button>
        <button style={styles.navBtn} onClick={() => router.push('/trade')}>⚖️ Trade</button>
        <button style={styles.navBtn} onClick={() => router.push('/account')}>👤 Account</button>
      </div>
    </div>
  );
}

// ─── Roster View ──────────────────────────────────────────────────────────────

function RosterView() {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Starters</div>
      {MY_ROSTER.starters.map(p => <PlayerRow key={p.id} player={p} isStarter />)}
      <div style={{ ...styles.sectionTitle, marginTop: 20 }}>Bench</div>
      {MY_ROSTER.bench.map(p => <PlayerRow key={p.id} player={p} />)}
    </div>
  );
}

// ─── Matchup View ─────────────────────────────────────────────────────────────

function MatchupView() {
  const m = CURRENT_MATCHUP;
  const winning = m.myScore > m.opponent.score;

  return (
    <div style={styles.section}>
      <div style={styles.matchupHeader}>
        <div style={styles.matchupSide}>
          <div style={{ ...styles.matchupScore, color: winning ? '#22c55e' : '#f97316' }}>
            {m.myScore.toFixed(2)}
          </div>
          <div style={styles.matchupTeamName}>Frogman's Squad</div>
          <div style={styles.matchupProjected}>Proj: {m.myProjected.toFixed(1)}</div>
        </div>
        <div style={styles.matchupVs}>VS</div>
        <div style={styles.matchupSide}>
          <div style={{ ...styles.matchupScore, color: winning ? '#f97316' : '#ef4444' }}>
            {m.opponent.score.toFixed(2)}
          </div>
          <div style={styles.matchupTeamName}>{m.opponent.name}</div>
          <div style={styles.matchupProjected}>Proj: {m.opponent.projected.toFixed(1)}</div>
        </div>
      </div>

      <div style={styles.edgeBar}>
        <span style={styles.edgeLabel}>Your edge:</span>
        <span style={styles.edgeValue}>+{(m.myProjected - m.opponent.projected).toFixed(1)} projected pts</span>
      </div>

      <div style={styles.sectionTitle}>Opponent Weaknesses</div>
      <div style={styles.weaknessGrid}>
        {Object.entries(m.opponentWeaknesses).map(([pos, grade]) => (
          <div key={pos} style={styles.weaknessCard}>
            <span style={getPosBadge(pos)}>{pos}</span>
            <span style={{ ...styles.gradeTag, color: gradeColor(grade) }}>{grade}</span>
          </div>
        ))}
      </div>

      <div style={styles.sectionTitle}>Opponent Starters</div>
      {m.opponent.starters.map(p => (
        <div key={p.id} style={styles.playerRow}>
          <span style={getPosBadge(p.position)}>{p.position}</span>
          <div style={styles.playerInfo}>
            <div style={styles.playerName}>{p.name}</div>
            <div style={styles.playerTeam}>{p.team}</div>
          </div>
          <div style={styles.playerPoints}>{p.projectedPts.toFixed(1)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Lineup Tips View ────────────────────────────────────────────────────────

function LineupView() {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Start / Sit Recommendations</div>
      {WEEKLY_RECOMMENDATIONS.map((rec, i) => (
        <div key={i} style={styles.recRow}>
          <div style={styles.recLeft}>
            <span style={getPosBadge(rec.player.position)}>{rec.player.position}</span>
            <div style={styles.recInfo}>
              <div style={styles.recName}>
                {rec.player.name}
                {rec.injuryFlag && <span style={styles.injuryTag}> ⚠️</span>}
              </div>
              <div style={styles.recTeam}>{rec.player.team}</div>
            </div>
          </div>
          <div style={styles.recRight}>
            <span style={{ ...styles.recBadge, background: recColor(rec.recommendation) }}>
              {rec.recommendation.toUpperCase()}
            </span>
            <span style={{ ...styles.gradeTag, color: gradeColor(rec.matchupGrade), marginLeft: 6 }}>
              {rec.matchupGrade}
            </span>
          </div>
          <div style={styles.recReason}>{rec.reason}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Standings View ───────────────────────────────────────────────────────────

function StandingsView() {
  const sorted = [...TEAMS].sort((a, b) => b.wins - a.wins || b.pf - a.pf);
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>League Standings</div>
      {sorted.map((t, i) => (
        <div
          key={t.id}
          style={{
            ...styles.standingRow,
            ...(t.isMe ? styles.standingRowMine : {}),
          }}
        >
          <span style={styles.standingRank}>{i + 1}</span>
          <div style={styles.standingInfo}>
            <div style={styles.standingName}>{t.name} {t.isMe && '⭐'}</div>
            <div style={styles.standingOwner}>{t.owner}</div>
          </div>
          <span style={styles.standingRecord}>{t.wins}-{t.losses}</span>
          <span style={styles.standingPts}>{t.pf.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Player Row ───────────────────────────────────────────────────────────────

function PlayerRow({ player, isStarter }) {
  return (
    <div style={{ ...styles.playerRow, opacity: isStarter ? 1 : 0.72 }}>
      <span style={getPosBadge(player.position)}>{player.position}</span>
      <div style={styles.playerInfo}>
        <div style={styles.playerName}>
          {player.name}
          {player.injuryNote && (
            <span style={styles.injuryTag}> ⚠️ {player.injuryNote}</span>
          )}
          {player.status && player.status !== 'active' && !player.injuryNote && (
            <span style={styles.injuryTag}> {player.status.toUpperCase()}</span>
          )}
        </div>
        <div style={styles.playerTeam}>{player.team}</div>
      </div>
      <div style={styles.playerRight}>
        <div style={styles.playerPoints}>{player.projectedPts.toFixed(1)}</div>
        <div style={styles.playerLastWeek}>last: {player.lastWeekPts.toFixed(1)}</div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gradeColor(grade) {
  return { A: '#22c55e', B: '#84cc16', C: '#f59e0b', D: '#ef4444', F: '#7f1d1d' }[grade] || '#71717a';
}

function recColor(rec) {
  return { start: '#22c55e', sit: '#ef4444', monitor: '#f59e0b' }[rec] || '#52525b';
}

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
    fontSize: 10,
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: 4,
    flexShrink: 0,
    ...(colors[position] || { background: '#374151', color: '#fff' }),
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// ─── Dashboard Skeleton ────────────────────────────────────────────────────────

function Bone({ width = '100%', height = 16, radius = 6, mb = 0 }) {
  return (
    <div style={{
      width, height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, #1a1a1a 25%, #242424 50%, #1a1a1a 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      marginBottom: mb,
    }} />
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a' }}>
        <Bone width={80} height={24} radius={4} />
        <Bone width={60} height={20} radius={10} />
      </div>

      {/* League header */}
      <div style={{ padding: '12px 16px' }}>
        <Bone width={160} height={18} radius={4} mb={6} />
        <Bone width={120} height={13} radius={4} />
      </div>

      {/* Team card */}
      <div style={{ margin: '0 16px 16px', background: '#141414', borderRadius: 12, padding: 16 }}>
        <Bone width={140} height={18} radius={4} mb={8} />
        <Bone width={100} height={13} radius={4} />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
        {[90, 80, 100, 90].map((w, i) => <Bone key={i} width={w} height={32} radius={8} />)}
      </div>

      {/* Player rows */}
      <div style={{ padding: '0 16px' }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Bone width={36} height={36} radius={18} />
            <div style={{ flex: 1 }}>
              <Bone width="60%" height={14} radius={4} mb={6} />
              <Bone width="40%" height={11} radius={4} />
            </div>
            <Bone width={36} height={20} radius={4} />
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f0f0f',
    color: '#fff',
    fontFamily: "'Inter', -apple-system, sans-serif",
    paddingBottom: 100,
  },
  trialBanner: {
    background: '#1a0e00',
    borderBottom: '1px solid #7c2d12',
    color: '#fb923c',
    fontSize: 13,
    fontWeight: 600,
    padding: '10px 16px',
    textAlign: 'center',
  },
  banner: {
    background: '#1c1200',
    borderBottom: '1px solid #f97316',
    color: '#f97316',
    fontSize: 12,
    fontWeight: 600,
    padding: '10px 16px',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid #1f1f1f',
    background: '#111',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  logo: { fontSize: 22 },
  headerTitle: { fontSize: 17, fontWeight: 700 },
  userBadge: { fontSize: 13, color: '#a1a1aa' },
  weekBadge: {
    background: '#f97316',
    color: '#fff',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },
  leagueHeader: { padding: '14px 20px 4px' },
  leagueName: { fontSize: 18, fontWeight: 800 },
  leagueMeta: { fontSize: 13, color: '#71717a', marginTop: 2 },
  myTeamCard: {
    margin: '12px 20px',
    background: '#1a1200',
    border: '1px solid #f97316',
    borderRadius: 12,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myTeamLeft: {},
  myTeamName: { fontSize: 15, fontWeight: 800 },
  myTeamRecord: { fontSize: 12, color: '#a1a1aa', marginTop: 2 },
  myTeamRight: {},
  myTeamRank: { fontSize: 13, fontWeight: 700, color: '#f97316' },
  viewToggle: {
    display: 'flex',
    padding: '8px 20px 12px',
    gap: 8,
    overflowX: 'auto',
  },
  toggleBtn: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    color: '#71717a',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  toggleActive: { background: '#f97316', color: '#fff', borderColor: '#f97316' },
  section: { padding: '4px 20px' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 800,
    color: '#52525b',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: 8,
    marginTop: 16,
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 0',
    borderBottom: '1px solid #1a1a1a',
  },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 14, fontWeight: 600 },
  playerTeam: { fontSize: 12, color: '#52525b', marginTop: 1 },
  playerRight: { textAlign: 'right' },
  playerPoints: { fontSize: 15, fontWeight: 700, color: '#f97316' },
  playerLastWeek: { fontSize: 11, color: '#52525b', marginTop: 2 },
  injuryTag: { color: '#ef4444', fontSize: 11, fontWeight: 700 },
  matchupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#161616',
    borderRadius: 12,
    padding: '20px',
    marginTop: 12,
    marginBottom: 16,
    border: '1px solid #222',
  },
  matchupSide: { textAlign: 'center', flex: 1 },
  matchupScore: { fontSize: 34, fontWeight: 800 },
  matchupTeamName: { fontSize: 12, color: '#71717a', marginTop: 4 },
  matchupProjected: { fontSize: 11, color: '#52525b', marginTop: 2 },
  matchupVs: { fontSize: 13, fontWeight: 800, color: '#3f3f46', padding: '0 12px' },
  edgeBar: {
    background: '#0a1f0a',
    border: '1px solid #16a34a',
    borderRadius: 8,
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  edgeLabel: { fontSize: 12, color: '#71717a' },
  edgeValue: { fontSize: 13, fontWeight: 700, color: '#22c55e' },
  weaknessGrid: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  weaknessCard: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 8,
    padding: '6px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  gradeTag: { fontSize: 15, fontWeight: 800 },
  recRow: {
    background: '#141414',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 8,
    border: '1px solid #1f1f1f',
  },
  recLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  recRight: {
    display: 'inline-flex',
    alignItems: 'center',
    marginBottom: 6,
  },
  recInfo: { flex: 1 },
  recName: { fontSize: 14, fontWeight: 700 },
  recTeam: { fontSize: 12, color: '#52525b', marginTop: 1 },
  recBadge: {
    fontSize: 10,
    fontWeight: 800,
    color: '#fff',
    padding: '2px 8px',
    borderRadius: 4,
  },
  recReason: { fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 },
  standingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    marginBottom: 4,
  },
  standingRowMine: { background: '#1a1200', border: '1px solid #f97316' },
  standingRank: { fontSize: 13, color: '#52525b', width: 20, textAlign: 'center' },
  standingInfo: { flex: 1 },
  standingName: { fontSize: 14, fontWeight: 600 },
  standingOwner: { fontSize: 11, color: '#52525b' },
  standingRecord: { fontSize: 13, color: '#71717a', width: 44, textAlign: 'center' },
  standingPts: { fontSize: 13, color: '#f97316', fontWeight: 600, width: 70, textAlign: 'right' },
  waiverRow: {
    background: '#0d1117',
    border: '1px solid #1f2937',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 8,
  },
  waiverPlayers: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  waiverAdd: { fontSize: 13, fontWeight: 700, color: '#22c55e' },
  waiverDrop: { fontSize: 13, fontWeight: 700, color: '#ef4444', marginLeft: 8 },
  waiverReason: { fontSize: 12, color: '#71717a', lineHeight: 1.4 },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#111',
    borderTop: '1px solid #1f1f1f',
    display: 'flex',
    padding: '10px 0',
  },
  navBtn: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#52525b',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '8px 0',
  },
  navBtnActive: { color: '#f97316' },
};

export default withAuth(Dashboard);

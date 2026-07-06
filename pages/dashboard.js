import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withAuth } from '../lib/withAuth';
import { supabase } from '../lib/supabaseClient';
import { useTrial } from '../lib/useTrial';
import PaywallModal from '../components/PaywallModal';

function Dashboard() {
  const router = useRouter();
  const [view, setView] = useState('roster');
  const { status, daysLeft, isExpired } = useTrial();
  const [paywallDismissed, setPaywallDismissed] = useState(false);

  // Live data state
  const [liveData, setLiveData]     = useState(null);
  const [myTeamInfo, setMyTeamInfo] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [dataError, setDataError]   = useState(null);

  useEffect(() => {
    async function loadLiveData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const authHeader = { Authorization: `Bearer ${session.access_token}` };

        // Step 1: get user's teams to find league_key + team_key
        const teamsRes = await fetch('/api/yahoo/myteams', { headers: authHeader });
        if (teamsRes.status === 404) { setNeedsConnect(true); setDataLoading(false); return; }
        if (!teamsRes.ok) { setDataError('Could not load Yahoo data.'); setDataLoading(false); return; }

        const { teams } = await teamsRes.json();
        if (!teams || teams.length === 0) { setNeedsConnect(true); setDataLoading(false); return; }

        // Use the first team (most users have one NFL league)
        const { leagueKey, teamKey, name: teamName } = teams[0];
        setMyTeamInfo({ leagueKey, teamKey, name: teamName });

        // Step 2: fetch full dashboard data
        const dashRes = await fetch(
          `/api/yahoo/dashboard?league_key=${encodeURIComponent(leagueKey)}&team_key=${encodeURIComponent(teamKey)}`,
          { headers: authHeader }
        );
        if (!dashRes.ok) { setDataError('Could not load league data.'); setDataLoading(false); return; }

        const data = await dashRes.json();
        setLiveData(data);
      } catch (e) {
        console.error('Dashboard data error:', e);
        setDataError('Could not load data.');
      } finally {
        setDataLoading(false);
      }
    }
    loadLiveData();
  }, []);

  if (status === 'loading' || dataLoading) return <DashboardSkeleton />;

  // Find my team in standings
  const myTeamKey = myTeamInfo?.teamKey;
  const myTeam    = liveData?.teams?.find(t => t.teamKey === myTeamKey) || liveData?.teams?.[0];
  const league    = liveData?.league;
  const matchup   = liveData?.matchup;
  const roster    = liveData?.roster || [];
  const starters  = roster.filter(p => p.selectedPosition !== 'BN' && p.selectedPosition !== 'IR');
  const bench     = roster.filter(p => p.selectedPosition === 'BN' || p.selectedPosition === 'IR');

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
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => router.push('/pricing')}>
            upgrade to keep access
          </span>
        </div>
      )}

      {/* Connect / Error Banner */}
      {needsConnect && (
        <div style={{ ...styles.banner, borderColor: '#f97316', color: '#f97316' }}>
          🔗 Connect your Yahoo account to see live data —{' '}
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => router.push('/connect')}>
            Connect now
          </span>
        </div>
      )}
      {dataError && (
        <div style={{ ...styles.banner, borderColor: '#ef4444', color: '#ef4444' }}>
          ⚠️ {dataError}
        </div>
      )}
      {liveData && (
        <div style={{ ...styles.banner, borderColor: '#22c55e', color: '#22c55e', background: '#0a1f0a' }}>
          ✅ Live Yahoo data — synced just now
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🟠</span>
          <span style={styles.headerTitle}>Orange</span>
        </div>
        <div style={styles.headerRight}>
          {matchup && <div style={styles.weekBadge}>Week {matchup.week}</div>}
        </div>
      </div>

      {/* League Header */}
      {league && (
        <div style={styles.leagueHeader}>
          <div style={styles.leagueName}>{league.name || 'My League'}</div>
          <div style={styles.leagueMeta}>{league.num_teams} teams · {league.scoring_type?.toUpperCase()} · Yahoo</div>
        </div>
      )}

      {/* My Team Summary Card */}
      {myTeam && (
        <div style={styles.myTeamCard}>
          <div style={styles.myTeamLeft}>
            <div style={styles.myTeamName}>{myTeam.name || myTeamInfo?.name}</div>
            <div style={styles.myTeamRecord}>
              {myTeam.wins}-{myTeam.losses}{myTeam.ties > 0 ? `-${myTeam.ties}` : ''} · {myTeam.pointsFor?.toFixed(1)} pts
            </div>
          </div>
          <div style={styles.myTeamRight}>
            {myTeam.rank ? (
              <div style={styles.myTeamRank}>#{myTeam.rank} in League</div>
            ) : (
              <div style={styles.myTeamRank}>Pre-Season</div>
            )}
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div style={styles.viewToggle}>
        {[
          { key: 'roster',    label: '📋 Roster' },
          { key: 'matchup',   label: '⚔️ Matchup' },
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
      {view === 'roster'    && <RosterView starters={starters} bench={bench} />}
      {view === 'matchup'   && <MatchupView matchup={matchup} />}
      {view === 'standings' && <StandingsView teams={liveData?.teams || []} myTeamKey={myTeamKey} />}

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

function RosterView({ starters = [], bench = [] }) {
  if (starters.length === 0 && bench.length === 0) {
    return (
      <div style={{ ...styles.section, paddingTop: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🏈</div>
        <div style={{ color: '#f97316', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Draft Day is Coming</div>
        <div style={{ color: '#52525b', fontSize: 13, lineHeight: 1.5 }}>
          Your roster will appear here once your league drafts.<br />
          Check back in August when the season kicks off.
        </div>
      </div>
    );
  }
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Starters</div>
      {starters.map((p, i) => <PlayerRow key={p.playerKey || i} player={p} isStarter />)}
      <div style={{ ...styles.sectionTitle, marginTop: 20 }}>Bench</div>
      {bench.map((p, i) => <PlayerRow key={p.playerKey || i} player={p} />)}
    </div>
  );
}

// ─── Matchup View ─────────────────────────────────────────────────────────────

function MatchupView({ matchup }) {
  if (!matchup) {
    return (
      <div style={{ ...styles.section, paddingTop: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⚔️</div>
        <div style={{ color: '#f97316', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No Matchups Yet</div>
        <div style={{ color: '#52525b', fontSize: 13, lineHeight: 1.5 }}>
          Matchups will appear here once the season starts.<br />
          NFL 2026 kicks off in September.
        </div>
      </div>
    );
  }
  const myPts   = matchup.myTeam?.points || 0;
  const oppPts  = matchup.opponent?.points || 0;
  const myProj  = matchup.myTeam?.projectedPoints || 0;
  const oppProj = matchup.opponent?.projectedPoints || 0;
  const winning = myPts >= oppPts;
  const edge    = myProj - oppProj;

  return (
    <div style={styles.section}>
      <div style={styles.matchupHeader}>
        <div style={styles.matchupSide}>
          <div style={{ ...styles.matchupScore, color: winning ? '#22c55e' : '#f97316' }}>
            {myPts.toFixed(2)}
          </div>
          <div style={styles.matchupTeamName}>{matchup.myTeam?.name || 'My Team'}</div>
          <div style={styles.matchupProjected}>Proj: {myProj.toFixed(1)}</div>
        </div>
        <div style={styles.matchupVs}>VS</div>
        <div style={styles.matchupSide}>
          <div style={{ ...styles.matchupScore, color: winning ? '#f97316' : '#22c55e' }}>
            {oppPts.toFixed(2)}
          </div>
          <div style={styles.matchupTeamName}>{matchup.opponent?.name || 'Opponent'}</div>
          <div style={styles.matchupProjected}>Proj: {oppProj.toFixed(1)}</div>
        </div>
      </div>
      {edge !== 0 && (
        <div style={styles.edgeBar}>
          <span style={styles.edgeLabel}>{edge > 0 ? 'Your edge:' : 'Opponent edge:'}</span>
          <span style={{ ...styles.edgeValue, color: edge > 0 ? '#22c55e' : '#ef4444' }}>
            {edge > 0 ? '+' : ''}{edge.toFixed(1)} projected pts
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Standings View ───────────────────────────────────────────────────────────

function StandingsView({ teams = [], myTeamKey }) {
  const sorted = [...teams].sort((a, b) => (b.wins - a.wins) || (b.pointsFor - a.pointsFor));
  if (sorted.length === 0) {
    return <div style={{ ...styles.section, color: '#52525b', paddingTop: 20 }}>No standings data available.</div>;
  }
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>League Standings</div>
      {sorted.map((t, i) => {
        const isMe = t.teamKey === myTeamKey;
        return (
          <div key={t.teamKey || i} style={{ ...styles.standingRow, ...(isMe ? styles.standingRowMine : {}) }}>
            <span style={styles.standingRank}>{i + 1}</span>
            <div style={styles.standingInfo}>
              <div style={styles.standingName}>{t.name} {isMe && '⭐'}</div>
            </div>
            <span style={styles.standingRecord}>{t.wins}-{t.losses}{t.ties > 0 ? `-${t.ties}` : ''}</span>
            <span style={styles.standingPts}>{t.pointsFor?.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Player Row ───────────────────────────────────────────────────────────────

function PlayerRow({ player, isStarter }) {
  const pos = player.selectedPosition || player.position || '?';
  return (
    <div style={{ ...styles.playerRow, opacity: isStarter ? 1 : 0.72 }}>
      <span style={getPosBadge(pos)}>{pos}</span>
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
        <div style={styles.playerTeam}>{player.editorialTeam || player.team || ''}</div>
      </div>
      <div style={styles.playerRight}>
        <div style={styles.playerPoints}>{player.position || pos}</div>
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

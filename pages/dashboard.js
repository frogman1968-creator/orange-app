import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getUserLeagues,
  getLeagueRosters,
  getLeagueUsers,
  getLeagueMatchups,
  getNFLState,
  getAllPlayers,
  buildRosterMap,
  getPlayerDetails,
  getTrendingPlayers,
} from '../lib/sleeper';

export default function Dashboard() {
  const router = useRouter();
  const { userId } = router.query;

  const [user, setUser] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [rosters, setRosters] = useState([]);
  const [myRoster, setMyRoster] = useState(null);
  const [matchups, setMatchups] = useState([]);
  const [myMatchup, setMyMatchup] = useState(null);
  const [allPlayers, setAllPlayers] = useState({});
  const [trending, setTrending] = useState([]);
  const [nflState, setNflState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('roster'); // 'roster' | 'matchup' | 'trending'

  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem('sleeper_user');
    if (stored) setUser(JSON.parse(stored));
    loadDashboard();
  }, [userId]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [leaguesData, nflStateData, trendingData] = await Promise.all([
        getUserLeagues(userId, '2025'),
        getNFLState(),
        getTrendingPlayers('add'),
      ]);

      setLeagues(leaguesData || []);
      setNflState(nflStateData);
      setTrending(trendingData || []);

      // Auto-select first league
      if (leaguesData?.length > 0) {
        await loadLeague(leaguesData[0], nflStateData);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadLeague(league, state) {
    setSelectedLeague(league);
    const week = state?.week || 1;

    const [rostersData, usersData, matchupsData, playersData] = await Promise.all([
      getLeagueRosters(league.league_id),
      getLeagueUsers(league.league_id),
      getLeagueMatchups(league.league_id, week),
      Object.keys(allPlayers).length === 0 ? getAllPlayers() : Promise.resolve(allPlayers),
    ]);

    if (Object.keys(allPlayers).length === 0) setAllPlayers(playersData || {});

    const rosterMap = buildRosterMap(rostersData, usersData);
    setRosters(rosterMap);

    // Find my roster
    const mine = rosterMap.find(r => r.ownerId === userId);
    setMyRoster(mine);

    // Find my matchup
    if (mine && matchupsData) {
      const myMatchupData = matchupsData.find(m => m.roster_id === mine.rosterId);
      if (myMatchupData) {
        const opponent = matchupsData.find(
          m => m.matchup_id === myMatchupData.matchup_id && m.roster_id !== mine.rosterId
        );
        const opponentRoster = rosterMap.find(r => r.rosterId === opponent?.roster_id);
        setMyMatchup({ mine: myMatchupData, opponent, opponentRoster });
      }
    }

    setMatchups(matchupsData || []);
  }

  if (loading) return <LoadingScreen />;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🟠</span>
          <span style={styles.headerTitle}>Orange</span>
        </div>
        <div style={styles.headerRight}>
          {user && (
            <div style={styles.userBadge}>
              {user.display_name || user.username}
            </div>
          )}
          {nflState && (
            <div style={styles.weekBadge}>Week {nflState.week}</div>
          )}
        </div>
      </div>

      {/* League Selector */}
      {leagues.length > 1 && (
        <div style={styles.leagueBar}>
          {leagues.map(l => (
            <button
              key={l.league_id}
              style={{
                ...styles.leagueBtn,
                ...(selectedLeague?.league_id === l.league_id ? styles.leagueBtnActive : {}),
              }}
              onClick={() => loadLeague(l, nflState)}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      {selectedLeague && (
        <>
          <div style={styles.leagueHeader}>
            <div style={styles.leagueName}>{selectedLeague.name}</div>
            <div style={styles.leagueMeta}>
              {selectedLeague.total_rosters} teams · {selectedLeague.settings?.type === 2 ? 'Dynasty' : selectedLeague.scoring_settings?.rec === 1 ? 'PPR' : 'Standard'}
            </div>
          </div>

          {/* View Toggle */}
          <div style={styles.viewToggle}>
            {['roster', 'matchup', 'trending'].map(v => (
              <button
                key={v}
                style={{ ...styles.toggleBtn, ...(view === v ? styles.toggleActive : {}) }}
                onClick={() => setView(v)}
              >
                {v === 'roster' ? '📋 Roster' : v === 'matchup' ? '⚔️ Matchup' : '🔥 Trending'}
              </button>
            ))}
          </div>

          {/* Views */}
          {view === 'roster' && myRoster && (
            <RosterView roster={myRoster} allPlayers={allPlayers} />
          )}
          {view === 'matchup' && (
            <MatchupView matchup={myMatchup} allPlayers={allPlayers} />
          )}
          {view === 'trending' && (
            <TrendingView trending={trending} allPlayers={allPlayers} />
          )}
        </>
      )}

      {/* Standings */}
      {rosters.length > 0 && (
        <div style={styles.standingsWrap}>
          <div style={styles.sectionTitle}>Standings</div>
          {rosters
            .sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)
            .map((r, i) => (
              <div key={r.rosterId} style={{
                ...styles.standingRow,
                ...(r.ownerId === userId ? styles.standingRowMine : {}),
              }}>
                <span style={styles.standingRank}>{i + 1}</span>
                <span style={styles.standingName}>{r.displayName}</span>
                <span style={styles.standingRecord}>{r.wins}-{r.losses}</span>
                <span style={styles.standingPts}>{r.pointsFor?.toFixed(1)} pts</span>
              </div>
            ))}
        </div>
      )}

      {/* Nav */}
      <div style={styles.bottomNav}>
        <button style={styles.navBtn} onClick={() => router.push('/draft')}>🎯 Draft</button>
        <button style={styles.navBtn} onClick={() => router.push('/lineup')}>📊 Lineup</button>
        <button style={{ ...styles.navBtn, ...styles.navBtnActive }}>🏠 Home</button>
      </div>
    </div>
  );
}

function RosterView({ roster, allPlayers }) {
  const starters = roster.starters?.map(id => getPlayerDetails(id, allPlayers)).filter(Boolean);
  const bench = roster.players
    ?.filter(id => !roster.starters?.includes(id))
    .map(id => getPlayerDetails(id, allPlayers)).filter(Boolean);

  return (
    <div style={styles.content}>
      <div style={styles.sectionTitle}>Starters</div>
      {starters?.map((p, i) => <PlayerRow key={i} player={p} isStarter />)}
      <div style={{ ...styles.sectionTitle, marginTop: 20 }}>Bench</div>
      {bench?.map((p, i) => <PlayerRow key={i} player={p} />)}
    </div>
  );
}

function MatchupView({ matchup, allPlayers }) {
  if (!matchup) return (
    <div style={styles.emptyState}>No matchup data available for this week.</div>
  );

  return (
    <div style={styles.content}>
      <div style={styles.matchupHeader}>
        <div style={styles.matchupTeam}>
          <div style={styles.matchupScore}>{matchup.mine?.points?.toFixed(2) || '0.00'}</div>
          <div style={styles.matchupTeamName}>You</div>
        </div>
        <div style={styles.matchupVs}>VS</div>
        <div style={styles.matchupTeam}>
          <div style={styles.matchupScore}>{matchup.opponent?.points?.toFixed(2) || '0.00'}</div>
          <div style={styles.matchupTeamName}>{matchup.opponentRoster?.displayName || 'Opponent'}</div>
        </div>
      </div>

      <div style={styles.sectionTitle}>Your Starters</div>
      {matchup.mine?.starters?.map((id, i) => {
        const p = getPlayerDetails(id, allPlayers);
        const pts = matchup.mine?.starters_points?.[i];
        return p ? <PlayerRow key={i} player={p} isStarter points={pts} /> : null;
      })}
    </div>
  );
}

function TrendingView({ trending, allPlayers }) {
  return (
    <div style={styles.content}>
      <div style={styles.sectionTitle}>🔥 Trending Adds</div>
      {trending.slice(0, 15).map((t, i) => {
        const p = getPlayerDetails(t.player_id, allPlayers);
        return p ? (
          <div key={i} style={styles.trendRow}>
            <span style={styles.trendRank}>#{i + 1}</span>
            <span style={getPosBadge(p.position)}>{p.position}</span>
            <div style={styles.trendInfo}>
              <div style={styles.trendName}>{p.name}</div>
              <div style={styles.trendTeam}>{p.team}</div>
            </div>
            <div style={styles.trendAdds}>+{t.adds?.toLocaleString()}</div>
          </div>
        ) : null;
      })}
    </div>
  );
}

function PlayerRow({ player, isStarter, points }) {
  return (
    <div style={{ ...styles.playerRow, opacity: isStarter ? 1 : 0.7 }}>
      <span style={getPosBadge(player.position)}>{player.position}</span>
      <div style={styles.playerInfo}>
        <div style={styles.playerName}>
          {player.name}
          {player.status && player.status !== 'active' && (
            <span style={styles.injuryTag}> {player.status.toUpperCase()}</span>
          )}
        </div>
        <div style={styles.playerTeam}>{player.team || 'FA'}</div>
      </div>
      {points !== undefined && (
        <div style={styles.playerPoints}>{points?.toFixed(2)}</div>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ ...styles.page, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: 48 }}>🟠</div>
      <div style={{ color: '#52525b', marginTop: 16 }}>Loading your leagues...</div>
    </div>
  );
}

function getPosBadge(position) {
  const colors = {
    QB: { background: '#7c3aed', color: '#fff' },
    RB: { background: '#16a34a', color: '#fff' },
    WR: { background: '#0284c7', color: '#fff' },
    TE: { background: '#d97706', color: '#fff' },
    K: { background: '#6b7280', color: '#fff' },
    DEF: { background: '#dc2626', color: '#fff' },
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

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f0f0f',
    color: '#fff',
    fontFamily: "'Inter', -apple-system, sans-serif",
    paddingBottom: 80,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
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
  leagueBar: {
    display: 'flex',
    gap: 8,
    padding: '12px 20px',
    overflowX: 'auto',
    borderBottom: '1px solid #1f1f1f',
  },
  leagueBtn: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    color: '#71717a',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontWeight: 500,
  },
  leagueBtnActive: { background: '#f97316', color: '#fff', borderColor: '#f97316' },
  leagueHeader: { padding: '16px 20px 8px' },
  leagueName: { fontSize: 18, fontWeight: 800 },
  leagueMeta: { fontSize: 13, color: '#71717a', marginTop: 2 },
  viewToggle: {
    display: 'flex',
    padding: '0 20px 12px',
    gap: 8,
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
  },
  toggleActive: { background: '#f97316', color: '#fff', borderColor: '#f97316' },
  content: { padding: '0 20px' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: '#52525b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 8,
    marginTop: 4,
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
  playerTeam: { fontSize: 12, color: '#52525b' },
  playerPoints: { fontSize: 15, fontWeight: 700, color: '#f97316' },
  injuryTag: { color: '#ef4444', fontSize: 10, fontWeight: 800 },
  matchupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#161616',
    borderRadius: 12,
    padding: '20px',
    marginBottom: 20,
    border: '1px solid #222',
  },
  matchupTeam: { textAlign: 'center', flex: 1 },
  matchupScore: { fontSize: 32, fontWeight: 800, color: '#f97316' },
  matchupTeamName: { fontSize: 13, color: '#71717a', marginTop: 4 },
  matchupVs: { fontSize: 14, fontWeight: 800, color: '#3f3f46', padding: '0 12px' },
  trendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 0',
    borderBottom: '1px solid #1a1a1a',
  },
  trendRank: { fontSize: 12, color: '#52525b', width: 24 },
  trendInfo: { flex: 1 },
  trendName: { fontSize: 14, fontWeight: 600 },
  trendTeam: { fontSize: 12, color: '#52525b' },
  trendAdds: { fontSize: 13, color: '#22c55e', fontWeight: 700 },
  standingsWrap: { padding: '20px 20px 0' },
  standingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    marginBottom: 4,
  },
  standingRowMine: { background: '#1a1200', border: '1px solid #f97316' },
  standingRank: { fontSize: 13, color: '#52525b', width: 20 },
  standingName: { flex: 1, fontSize: 14, fontWeight: 500 },
  standingRecord: { fontSize: 13, color: '#71717a', width: 40, textAlign: 'center' },
  standingPts: { fontSize: 13, color: '#f97316', fontWeight: 600, width: 70, textAlign: 'right' },
  emptyState: { padding: '40px 20px', textAlign: 'center', color: '#3f3f46', fontSize: 14 },
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

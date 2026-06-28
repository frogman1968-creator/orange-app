import { useState } from 'react';
import { useRouter } from 'next/router';
import { withAuth } from '../lib/withAuth';

/**
 * Player News Feed
 * Currently uses sample news data.
 * When Yahoo API is approved, wire to FantasyPros or Yahoo news endpoints.
 */

const NEWS = [
  {
    id: 'n1',
    player: 'Christian McCaffrey',
    position: 'RB', team: 'SF',
    headline: 'McCaffrey limited in practice, questionable for Week 15',
    body: 'CMC was listed as limited Wednesday with a knee issue. He\'s expected to play but monitor injury report through Friday.',
    impact: 'high',
    impactLabel: 'Start with caution',
    impactColor: '#f59e0b',
    timestamp: '2h ago',
    source: 'SF Official',
  },
  {
    id: 'n2',
    player: 'Lamar Jackson',
    position: 'QB', team: 'BAL',
    headline: 'Lamar Jackson full participant Wednesday — no injury designation expected',
    body: 'Jackson practiced fully and is on track to start Week 15 vs. a vulnerable Jaguars secondary. Great streaming matchup.',
    impact: 'positive',
    impactLabel: 'Start him',
    impactColor: '#22c55e',
    timestamp: '3h ago',
    source: 'BAL Official',
  },
  {
    id: 'n3',
    player: "Ja'Marr Chase",
    position: 'WR', team: 'CIN',
    headline: "Chase erupts for 3 TDs in Monday night win — locked in as WR1",
    body: "Chase had 9 catches for 127 yards and 3 touchdowns. Joe Burrow clearly trusts him in every situation. Keep starting him without hesitation.",
    impact: 'positive',
    impactLabel: 'Must start',
    impactColor: '#22c55e',
    timestamp: '6h ago',
    source: 'FantasyPros',
  },
  {
    id: 'n4',
    player: 'Tyreek Hill',
    position: 'WR', team: 'MIA',
    headline: 'Hill dealing with hamstring tightness, practice status uncertain',
    body: 'Tyreek missed Wednesday practice. The Dolphins have a tough matchup vs Buffalo\'s secondary. Consider alternatives if he\'s limited Thursday.',
    impact: 'high',
    impactLabel: 'Monitor closely',
    impactColor: '#ef4444',
    timestamp: '8h ago',
    source: 'MIA Official',
  },
  {
    id: 'n5',
    player: 'Sam LaPorta',
    position: 'TE', team: 'DET',
    headline: 'LaPorta emerging as Goff\'s go-to in red zone — TE1 territory',
    body: 'LaPorta has scored in 4 of his last 5 games. Detroit faces a Chicago defense that has allowed the most points to tight ends this season.',
    impact: 'positive',
    impactLabel: 'Start him',
    impactColor: '#22c55e',
    timestamp: '10h ago',
    source: 'FantasyPros',
  },
  {
    id: 'n6',
    player: 'Saquon Barkley',
    position: 'RB', team: 'PHI',
    headline: 'Barkley on pace for 2,000-yard season — untouchable RB1',
    body: 'Saquon is averaging 28.4 PPR points over his last 4 games. Start him everywhere, every week.',
    impact: 'positive',
    impactLabel: 'Elite start',
    impactColor: '#22c55e',
    timestamp: '1d ago',
    source: 'FantasyPros',
  },
  {
    id: 'n7',
    player: 'Stefon Diggs',
    position: 'WR', team: 'NE',
    headline: 'Diggs seeing increased target share with NE — viable WR3',
    body: 'Diggs has 8+ targets in back-to-back games. The Patriots are throwing more with their running game struggling. Could be a usable flex.',
    impact: 'neutral',
    impactLabel: 'Flex consideration',
    impactColor: '#a1a1aa',
    timestamp: '1d ago',
    source: 'FantasyPros',
  },
  {
    id: 'n8',
    player: 'Gus Edwards',
    position: 'RB', team: 'LAC',
    headline: 'Edwards doubtful with hamstring — likely out Week 15',
    body: 'Edwards did not practice Wednesday or Thursday. He is expected to miss Week 15. Activate a handcuff or waiver wire replacement.',
    impact: 'high',
    impactLabel: 'Likely out — find replacement',
    impactColor: '#ef4444',
    timestamp: '2d ago',
    source: 'LAC Official',
  },
];

const FILTERS = ['All', 'My Roster', 'Injuries', 'Trending'];
const MY_PLAYERS = ['Christian McCaffrey', 'Lamar Jackson', "Ja'Marr Chase", 'Tyreek Hill', 'Sam LaPorta', 'Saquon Barkley', 'Stefon Diggs', 'Gus Edwards', 'Harrison Butker'];

function getPosBadge(pos) {
  const colors = {
    QB:  { bg: '#3a1a00', color: '#fb923c' },
    RB:  { bg: '#1a3a1a', color: '#4ade80' },
    WR:  { bg: '#1a1a3a', color: '#818cf8' },
    TE:  { bg: '#2a1a3a', color: '#c084fc' },
    K:   { bg: '#1a2a3a', color: '#38bdf8' },
    DEF: { bg: '#2a2a1a', color: '#facc15' },
  };
  const c = colors[pos] || { bg: '#1a1a1a', color: '#a1a1aa' };
  return {
    display: 'inline-block', background: c.bg, color: c.color,
    borderRadius: 4, padding: '2px 5px', fontSize: 9, fontWeight: 800,
    marginRight: 6, flexShrink: 0,
  };
}

function NewsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const filtered = NEWS.filter(n => {
    if (filter === 'My Roster') return MY_PLAYERS.includes(n.player);
    if (filter === 'Injuries')  return n.impact === 'high';
    if (filter === 'Trending')  return n.impact === 'positive';
    return true;
  });

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.back} onClick={() => router.push('/dashboard')}>← Back</button>
        <div style={styles.headerTitle}>📰 Player News</div>
        <div style={{ width: 48 }} />
      </div>

      {/* Data source note */}
      <div style={styles.sourceBanner}>
        🕐 Preview data — live news syncs when Yahoo API is approved
      </div>

      {/* Filter tabs */}
      <div style={styles.filterRow}>
        {FILTERS.map(f => (
          <button
            key={f}
            style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* News list */}
      <div style={styles.list}>
        {filtered.map(n => (
          <div
            key={n.id}
            style={styles.card}
            onClick={() => setExpanded(expanded === n.id ? null : n.id)}
          >
            {/* Card header */}
            <div style={styles.cardTop}>
              <div style={styles.cardLeft}>
                <span style={getPosBadge(n.position)}>{n.position}</span>
                <div>
                  <div style={styles.playerName}>{n.player}</div>
                  <div style={styles.teamMeta}>{n.team} · {n.timestamp} · {n.source}</div>
                </div>
              </div>
              <div style={{ ...styles.impactBadge, color: n.impactColor, borderColor: n.impactColor + '44' }}>
                {n.impactLabel}
              </div>
            </div>

            {/* Headline */}
            <div style={styles.headline}>{n.headline}</div>

            {/* Expanded body */}
            {expanded === n.id && (
              <div style={styles.body}>{n.body}</div>
            )}

            <div style={styles.expandHint}>
              {expanded === n.id ? '▲ Less' : '▼ More'}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={styles.empty}>No news matching this filter.</div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={styles.bottomNav}>
        <button style={styles.navBtn} onClick={() => router.push('/draft')}>🎯 Draft</button>
        <button style={styles.navBtn} onClick={() => router.push('/lineup')}>📊 Lineup</button>
        <button style={styles.navBtn} onClick={() => router.push('/dashboard')}>🏠 Home</button>
        <button style={styles.navBtn} onClick={() => router.push('/trade')}>⚖️ Trade</button>
        <button style={styles.navBtn} onClick={() => router.push('/account')}>👤 Account</button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: '#0a0a0a', minHeight: '100vh', color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    paddingBottom: 80,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid #1a1a1a',
  },
  back: {
    background: 'none', border: 'none', color: '#f97316',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0,
  },
  headerTitle: { fontSize: 17, fontWeight: 700 },
  sourceBanner: {
    background: '#1c1200', borderBottom: '1px solid #f97316',
    color: '#f97316', fontSize: 11, fontWeight: 600,
    padding: '8px 16px', textAlign: 'center',
  },
  filterRow: {
    display: 'flex', gap: 8, padding: '12px 16px',
    borderBottom: '1px solid #1a1a1a', overflowX: 'auto',
  },
  filterBtn: {
    background: '#141414', border: '1px solid #27272a', color: '#71717a',
    borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
  },
  filterActive: {
    background: '#1a0d00', border: '1px solid #f97316', color: '#f97316',
  },
  list: { padding: '8px 16px' },
  card: {
    background: '#141414', border: '1px solid #1f1f1f',
    borderRadius: 12, padding: '14px', marginBottom: 10, cursor: 'pointer',
  },
  cardTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8, gap: 8,
  },
  cardLeft: { display: 'flex', alignItems: 'center', gap: 8, flex: 1 },
  playerName: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  teamMeta: { fontSize: 10, color: '#52525b' },
  impactBadge: {
    fontSize: 10, fontWeight: 700, border: '1px solid',
    borderRadius: 6, padding: '3px 7px', flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  headline: { fontSize: 13, color: '#d4d4d8', lineHeight: 1.5, marginBottom: 6 },
  body: {
    fontSize: 13, color: '#a1a1aa', lineHeight: 1.6,
    marginTop: 8, paddingTop: 8, borderTop: '1px solid #27272a',
  },
  expandHint: { fontSize: 10, color: '#3f3f46', marginTop: 6 },
  empty: { textAlign: 'center', color: '#52525b', fontSize: 14, padding: 32 },
  bottomNav: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#111', borderTop: '1px solid #1f1f1f',
    display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px',
  },
  navBtn: {
    background: 'none', border: 'none', color: '#52525b',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 8px',
  },
};

export default withAuth(NewsPage);

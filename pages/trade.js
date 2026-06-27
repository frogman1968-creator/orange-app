import { useState } from 'react';
import { useRouter } from 'next/router';
import { MY_ROSTER } from '../lib/sampleData';
import { useTrial } from '../lib/useTrial';

// Extended player pool for trade targets (combines roster + common trade targets)
const PLAYER_POOL = [
  ...MY_ROSTER.starters,
  ...MY_ROSTER.bench,
  // Common trade targets
  { id: 't1',  name: 'Justin Jefferson',   position: 'WR', team: 'MIN', projectedPts: 20.8 },
  { id: 't2',  name: 'CeeDee Lamb',        position: 'WR', team: 'DAL', projectedPts: 22.1 },
  { id: 't3',  name: 'Davante Adams',      position: 'WR', team: 'LV',  projectedPts: 17.4 },
  { id: 't4',  name: 'Tony Pollard',       position: 'RB', team: 'TEN', projectedPts: 14.6 },
  { id: 't5',  name: 'Travis Kelce',       position: 'TE', team: 'KC',  projectedPts: 16.8 },
  { id: 't6',  name: 'Patrick Mahomes',    position: 'QB', team: 'KC',  projectedPts: 28.4 },
  { id: 't7',  name: 'Josh Allen',         position: 'QB', team: 'BUF', projectedPts: 30.1 },
  { id: 't8',  name: 'Amon-Ra St. Brown',  position: 'WR', team: 'DET', projectedPts: 18.2 },
  { id: 't9',  name: 'Puka Nacua',         position: 'WR', team: 'LAR', projectedPts: 15.9 },
  { id: 't10', name: 'De\'Von Achane',     position: 'RB', team: 'MIA', projectedPts: 19.3 },
  { id: 't11', name: 'Bijan Robinson',     position: 'RB', team: 'ATL', projectedPts: 21.2 },
  { id: 't12', name: 'Sam Darnold',        position: 'QB', team: 'MIN', projectedPts: 22.6 },
  { id: 't13', name: 'Dallas Goedert',     position: 'TE', team: 'PHI', projectedPts: 13.4 },
  { id: 't14', name: 'Rashee Rice',        position: 'WR', team: 'KC',  projectedPts: 14.8 },
  { id: 't15', name: 'Kyren Williams',     position: 'RB', team: 'LAR', projectedPts: 18.7 },
];

// Positional value multipliers — positions that are scarce are worth more
const POS_VALUE = { QB: 1.05, RB: 1.15, WR: 1.10, TE: 1.12, K: 0.7, DEF: 0.75, FLEX: 1.08 };

function scoreSide(players) {
  if (!players.length) return 0;
  return players.reduce((sum, p) => {
    const mult = POS_VALUE[p.position] || 1.0;
    return sum + p.projectedPts * mult;
  }, 0);
}

function getVerdict(youScore, themScore) {
  const diff = youScore - themScore;
  const pct = Math.abs(diff) / Math.max(youScore, themScore, 1) * 100;

  if (pct < 5)  return { text: 'Even trade',      color: '#a1a1aa', emoji: '⚖️', detail: 'This trade is essentially fair for both sides.' };
  if (diff > 0) {
    if (pct > 25) return { text: 'Strong WIN',    color: '#22c55e', emoji: '🏆', detail: 'You\'re winning this trade by a significant margin. Pull the trigger.' };
    if (pct > 12) return { text: 'You win',       color: '#4ade80', emoji: '✅', detail: 'You come out ahead here. Good deal for your roster.' };
    return         { text: 'Slight edge',          color: '#86efac', emoji: '📈', detail: 'Small advantage your way. Fine if it fills a roster need.' };
  } else {
    if (pct > 25) return { text: 'Strong LOSS',   color: '#ef4444', emoji: '🚫', detail: 'You\'re giving up too much value. Pass on this trade.' };
    if (pct > 12) return { text: 'You lose',      color: '#f87171', emoji: '❌', detail: 'They\'re getting the better deal. Negotiate for more.' };
    return         { text: 'Slight loss',          color: '#fca5a5', emoji: '📉', detail: 'Small disadvantage. Acceptable if it fills a key need.' };
  }
}

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'FLEX'];

function getPosBadge(pos) {
  const colors = {
    QB: { bg: '#3a1a00', color: '#fb923c' },
    RB: { bg: '#1a3a1a', color: '#4ade80' },
    WR: { bg: '#1a1a3a', color: '#818cf8' },
    TE: { bg: '#2a1a3a', color: '#c084fc' },
    K:  { bg: '#1a2a3a', color: '#38bdf8' },
    DEF:{ bg: '#2a2a1a', color: '#facc15' },
    FLEX:{ bg: '#1a3a1a', color: '#4ade80' },
  };
  const c = colors[pos] || { bg: '#1a1a1a', color: '#a1a1aa' };
  return {
    display: 'inline-block', background: c.bg, color: c.color,
    borderRadius: 4, padding: '2px 5px', fontSize: 9, fontWeight: 800,
    marginRight: 6, flexShrink: 0,
  };
}

export default function TradeAnalyzer() {
  const router = useRouter();
  const { isPremium } = useTrial();

  const [youGive, setYouGive] = useState([]);   // players you send
  const [youGet, setYouGet]   = useState([]);   // players you receive
  const [search, setSearch]   = useState('');
  const [adding, setAdding]   = useState(null); // 'give' | 'get'
  const [analyzed, setAnalyzed] = useState(false);

  const youScore  = scoreSide(youGive);
  const themScore = scoreSide(youGet);
  const verdict   = getVerdict(youGet.reduce((s,p) => s + p.projectedPts * (POS_VALUE[p.position]||1), 0),
                                youGive.reduce((s,p) => s + p.projectedPts * (POS_VALUE[p.position]||1), 0));

  const filtered = PLAYER_POOL.filter(p => {
    const inGive = youGive.find(x => x.id === p.id);
    const inGet  = youGet.find(x => x.id === p.id);
    if (inGive || inGet) return false;
    if (!search) return true;
    return p.name.toLowerCase().includes(search.toLowerCase()) ||
           p.position.toLowerCase().includes(search.toLowerCase()) ||
           p.team.toLowerCase().includes(search.toLowerCase());
  });

  function addPlayer(player) {
    if (adding === 'give') setYouGive(prev => [...prev, player]);
    if (adding === 'get')  setYouGet(prev  => [...prev, player]);
    setAdding(null);
    setSearch('');
    setAnalyzed(false);
  }

  function removeGive(id) { setYouGive(prev => prev.filter(p => p.id !== id)); setAnalyzed(false); }
  function removeGet(id)  { setYouGet(prev  => prev.filter(p => p.id !== id)); setAnalyzed(false); }

  const canAnalyze = youGive.length > 0 && youGet.length > 0;

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.back} onClick={() => router.push('/dashboard')}>← Back</button>
        <div style={styles.headerTitle}>⚖️ Trade Analyzer</div>
        <div style={{ width: 48 }} />
      </div>

      {/* Player Picker Modal */}
      {adding && (
        <div style={styles.pickerOverlay}>
          <div style={styles.picker}>
            <div style={styles.pickerHeader}>
              <span style={styles.pickerTitle}>
                {adding === 'give' ? 'You send…' : 'You receive…'}
              </span>
              <button style={styles.pickerClose} onClick={() => { setAdding(null); setSearch(''); }}>✕</button>
            </div>
            <input
              style={styles.searchInput}
              placeholder="Search players…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            <div style={styles.pickerList}>
              {filtered.slice(0, 20).map(p => (
                <button key={p.id} style={styles.pickerRow} onClick={() => addPlayer(p)}>
                  <span style={getPosBadge(p.position)}>{p.position}</span>
                  <div style={styles.pickerInfo}>
                    <div style={styles.pickerName}>{p.name}</div>
                    <div style={styles.pickerMeta}>{p.team} · {p.projectedPts.toFixed(1)} proj pts/wk</div>
                  </div>
                  <span style={styles.pickerAdd}>+</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={styles.pickerEmpty}>No players found</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={styles.content}>

        {/* Trade Builder */}
        <div style={styles.tradeGrid}>

          {/* You Give */}
          <div style={styles.tradeCol}>
            <div style={styles.colHeader}>
              <span style={styles.colLabel}>You Send</span>
              <span style={{ ...styles.colScore, color: youGive.length ? '#ef4444' : '#3f3f46' }}>
                {youGive.length ? `${youGive.reduce((s,p) => s + p.projectedPts, 0).toFixed(1)} pts` : '—'}
              </span>
            </div>
            {youGive.map(p => (
              <div key={p.id} style={styles.tradePlayerCard}>
                <span style={getPosBadge(p.position)}>{p.position}</span>
                <div style={styles.tradePlayerInfo}>
                  <div style={styles.tradePlayerName}>{p.name}</div>
                  <div style={styles.tradePlayerMeta}>{p.projectedPts.toFixed(1)} pts</div>
                </div>
                <button style={styles.removeBtn} onClick={() => removeGive(p.id)}>✕</button>
              </div>
            ))}
            <button style={styles.addPlayerBtn} onClick={() => setAdding('give')}>+ Add player</button>
          </div>

          {/* Divider */}
          <div style={styles.divider}>⇄</div>

          {/* You Get */}
          <div style={styles.tradeCol}>
            <div style={styles.colHeader}>
              <span style={styles.colLabel}>You Receive</span>
              <span style={{ ...styles.colScore, color: youGet.length ? '#22c55e' : '#3f3f46' }}>
                {youGet.length ? `${youGet.reduce((s,p) => s + p.projectedPts, 0).toFixed(1)} pts` : '—'}
              </span>
            </div>
            {youGet.map(p => (
              <div key={p.id} style={styles.tradePlayerCard}>
                <span style={getPosBadge(p.position)}>{p.position}</span>
                <div style={styles.tradePlayerInfo}>
                  <div style={styles.tradePlayerName}>{p.name}</div>
                  <div style={styles.tradePlayerMeta}>{p.projectedPts.toFixed(1)} pts</div>
                </div>
                <button style={styles.removeBtn} onClick={() => removeGet(p.id)}>✕</button>
              </div>
            ))}
            <button style={styles.addPlayerBtn} onClick={() => setAdding('get')}>+ Add player</button>
          </div>
        </div>

        {/* Analyze Button */}
        <button
          style={{ ...styles.analyzeBtn, opacity: canAnalyze ? 1 : 0.4 }}
          disabled={!canAnalyze}
          onClick={() => setAnalyzed(true)}
        >
          Analyze Trade
        </button>

        {/* Verdict */}
        {analyzed && canAnalyze && (
          <div style={{ ...styles.verdictCard, border: `1px solid ${verdict.color}44` }}>
            <div style={styles.verdictEmoji}>{verdict.emoji}</div>
            <div style={{ ...styles.verdictText, color: verdict.color }}>{verdict.text}</div>
            <div style={styles.verdictDetail}>{verdict.detail}</div>

            {/* Value bars */}
            <div style={styles.barsSection}>
              {(() => {
                const giveVal = youGive.reduce((s,p) => s + p.projectedPts * (POS_VALUE[p.position]||1), 0);
                const getVal  = youGet.reduce((s,p)  => s + p.projectedPts * (POS_VALUE[p.position]||1), 0);
                const max = Math.max(giveVal, getVal, 1);
                return (
                  <>
                    <div style={styles.barRow}>
                      <span style={styles.barLabel}>You send</span>
                      <div style={styles.barTrack}>
                        <div style={{ ...styles.barFill, width: `${(giveVal/max)*100}%`, background: '#ef4444' }} />
                      </div>
                      <span style={styles.barVal}>{giveVal.toFixed(1)}</span>
                    </div>
                    <div style={styles.barRow}>
                      <span style={styles.barLabel}>You get</span>
                      <div style={styles.barTrack}>
                        <div style={{ ...styles.barFill, width: `${(getVal/max)*100}%`, background: '#22c55e' }} />
                      </div>
                      <span style={styles.barVal}>{getVal.toFixed(1)}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Positional breakdown */}
            <div style={styles.breakdownTitle}>Positional value (PPR-adjusted)</div>
            <div style={styles.breakdown}>
              {POSITIONS.filter(pos =>
                youGive.some(p => p.position === pos) || youGet.some(p => p.position === pos)
              ).map(pos => {
                const give = youGive.filter(p => p.position === pos).reduce((s,p) => s + p.projectedPts, 0);
                const get  = youGet.filter(p  => p.position === pos).reduce((s,p) => s + p.projectedPts, 0);
                if (!give && !get) return null;
                return (
                  <div key={pos} style={styles.breakdownRow}>
                    <span style={getPosBadge(pos)}>{pos}</span>
                    <span style={styles.breakdownGive}>{give ? `-${give.toFixed(1)}` : '—'}</span>
                    <span style={styles.breakdownArrow}>→</span>
                    <span style={styles.breakdownGet}>{get ? `+${get.toFixed(1)}` : '—'}</span>
                  </div>
                );
              })}
            </div>

            <button style={styles.resetBtn} onClick={() => { setYouGive([]); setYouGet([]); setAnalyzed(false); }}>
              Start over
            </button>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={styles.bottomNav}>
        <button style={styles.navBtn} onClick={() => router.push('/draft')}>🎯 Draft</button>
        <button style={styles.navBtn} onClick={() => router.push('/lineup')}>📊 Lineup</button>
        <button style={styles.navBtn} onClick={() => router.push('/dashboard')}>🏠 Home</button>
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
  content: { padding: 16 },

  // Picker
  pickerOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    zIndex: 100, display: 'flex', alignItems: 'flex-end',
  },
  picker: {
    background: '#141414', borderRadius: '20px 20px 0 0',
    border: '1px solid #27272a', width: '100%',
    maxHeight: '80vh', display: 'flex', flexDirection: 'column',
  },
  pickerHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 16px 8px',
  },
  pickerTitle: { fontSize: 16, fontWeight: 700 },
  pickerClose: {
    background: '#27272a', border: 'none', color: '#a1a1aa',
    borderRadius: 20, width: 28, height: 28, cursor: 'pointer', fontSize: 12,
  },
  searchInput: {
    margin: '0 16px 8px', background: '#1f1f1f', border: '1px solid #27272a',
    borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14,
    outline: 'none',
  },
  pickerList: { overflowY: 'auto', flex: 1 },
  pickerRow: {
    display: 'flex', alignItems: 'center', padding: '12px 16px',
    background: 'none', border: 'none', width: '100%', cursor: 'pointer',
    borderBottom: '1px solid #1a1a1a', textAlign: 'left',
  },
  pickerInfo: { flex: 1 },
  pickerName: { fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 },
  pickerMeta: { fontSize: 11, color: '#71717a' },
  pickerAdd: { fontSize: 20, color: '#f97316', fontWeight: 800, paddingLeft: 8 },
  pickerEmpty: { padding: 24, textAlign: 'center', color: '#52525b', fontSize: 14 },

  // Trade grid
  tradeGrid: {
    display: 'grid', gridTemplateColumns: '1fr 28px 1fr', gap: 8, marginBottom: 16,
  },
  tradeCol: { display: 'flex', flexDirection: 'column', gap: 6 },
  colHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  colLabel: { fontSize: 11, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.6px' },
  colScore: { fontSize: 12, fontWeight: 700 },
  divider: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, color: '#52525b', paddingTop: 28,
  },
  tradePlayerCard: {
    display: 'flex', alignItems: 'center', background: '#141414',
    borderRadius: 8, padding: '8px 10px', border: '1px solid #1f1f1f', gap: 6,
  },
  tradePlayerInfo: { flex: 1, minWidth: 0 },
  tradePlayerName: { fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tradePlayerMeta: { fontSize: 10, color: '#71717a' },
  removeBtn: {
    background: 'none', border: 'none', color: '#52525b',
    cursor: 'pointer', fontSize: 12, padding: '0 2px', flexShrink: 0,
  },
  addPlayerBtn: {
    background: 'transparent', border: '1px dashed #27272a', color: '#52525b',
    borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer', width: '100%',
  },

  // Analyze
  analyzeBtn: {
    width: '100%', background: '#f97316', color: '#000', border: 'none',
    borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800,
    cursor: 'pointer', marginBottom: 16,
  },

  // Verdict
  verdictCard: {
    background: '#111', borderRadius: 14, padding: 20,
  },
  verdictEmoji: { fontSize: 36, textAlign: 'center', marginBottom: 8 },
  verdictText: { fontSize: 22, fontWeight: 900, textAlign: 'center', marginBottom: 8 },
  verdictDetail: { fontSize: 13, color: '#a1a1aa', textAlign: 'center', marginBottom: 20, lineHeight: 1.5 },

  barsSection: { marginBottom: 16 },
  barRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  barLabel: { fontSize: 11, color: '#71717a', width: 60, flexShrink: 0 },
  barTrack: { flex: 1, height: 8, background: '#27272a', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, transition: 'width 0.4s ease' },
  barVal: { fontSize: 11, color: '#a1a1aa', width: 36, textAlign: 'right' },

  breakdownTitle: { fontSize: 11, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 },
  breakdown: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  breakdownRow: { display: 'flex', alignItems: 'center', gap: 8 },
  breakdownGive: { fontSize: 13, color: '#f87171', flex: 1 },
  breakdownArrow: { fontSize: 13, color: '#52525b' },
  breakdownGet: { fontSize: 13, color: '#4ade80', flex: 1, textAlign: 'right' },

  resetBtn: {
    width: '100%', background: 'transparent', border: '1px solid #27272a',
    color: '#52525b', borderRadius: 8, padding: '10px', fontSize: 13, cursor: 'pointer',
  },

  bottomNav: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#111', borderTop: '1px solid #1f1f1f',
    display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px',
  },
  navBtn: {
    background: 'none', border: 'none', color: '#52525b',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 12px',
  },
};

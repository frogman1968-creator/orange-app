/**
 * /mock-draft — Orange Mock Draft Simulator
 *
 * Full 12-team snake draft with AI bot opponents.
 * Orange AI gives recommendations on your picks.
 * Post-draft: see your roster + optional grade comparison vs. bot teams.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { withAuth } from '../lib/withAuth';
import { supabase } from '../lib/supabaseClient';
import { useLeague } from '../lib/LeagueContext';
import { MOCK_DRAFT_POOL, BOT_TEAM_NAMES } from '../lib/mockDraftPool';
import {
  BOT_STRATEGIES, botPick, getTeamForPick, getMyPickNumbers,
} from '../lib/mockDraftEngine';

const TOTAL_ROUNDS = 15;
const BOT_PICK_DELAY = 1200; // ms between bot picks

const POS_COLORS = {
  QB:  { bg: '#3a1a00', color: '#fb923c' },
  RB:  { bg: '#1a3a1a', color: '#4ade80' },
  WR:  { bg: '#1a1a3a', color: '#818cf8' },
  TE:  { bg: '#2a1a00', color: '#fbbf24' },
  K:   { bg: '#2a2a2a', color: '#9ca3af' },
  DEF: { bg: '#3a1a1a', color: '#f87171' },
};

function PosBadge({ pos, size = 'sm' }) {
  const c = POS_COLORS[pos] || { bg: '#333', color: '#aaa' };
  return (
    <span style={{
      fontSize: size === 'sm' ? 10 : 12, fontWeight: 800,
      padding: size === 'sm' ? '2px 6px' : '3px 8px',
      borderRadius: 4, background: c.bg, color: c.color, flexShrink: 0,
    }}>
      {pos}
    </span>
  );
}

// ─── Setup Screen ────────────────────────────────────────────────────────────

function SetupScreen({ onStart }) {
  const [myPosition, setMyPosition] = useState(6);
  const [numTeams, setNumTeams] = useState(12);
  const [scoring, setScoring] = useState('ppr');

  return (
    <div style={S.setupPage}>
      <div style={S.setupCard}>
        <div style={S.setupLogo}>🟠</div>
        <h1 style={S.setupTitle}>Mock Draft</h1>
        <p style={S.setupSub}>Practice your draft against AI opponents. Orange advises every pick.</p>

        <div style={S.setupSection}>
          <div style={S.setupLabel}>Number of Teams</div>
          <div style={S.btnGroup}>
            {[8, 10, 12, 14].map(n => (
              <button
                key={n} style={{ ...S.optBtn, ...(numTeams === n ? S.optBtnActive : {}) }}
                onClick={() => setNumTeams(n)}
              >{n} Teams</button>
            ))}
          </div>
        </div>

        <div style={S.setupSection}>
          <div style={S.setupLabel}>Your Draft Position</div>
          <div style={S.posSliderRow}>
            <span style={S.posNum}>{myPosition}</span>
            <input
              type="range" min={1} max={numTeams} value={myPosition}
              onChange={e => setMyPosition(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#f97316' }}
            />
            <span style={S.posOf}>of {numTeams}</span>
          </div>
          <div style={S.posHint}>
            {myPosition === 1 ? 'First overall pick — take your stud.' :
             myPosition === numTeams ? 'Last pick, but back-to-back turns in round 2.' :
             myPosition <= 3 ? 'Top 3 — elite tier is yours.' :
             myPosition >= numTeams - 2 ? 'Late first — pivot to best available.' :
             'Middle of the pack — balanced approach works well here.'}
          </div>
        </div>

        <div style={S.setupSection}>
          <div style={S.setupLabel}>Scoring Format</div>
          <div style={S.btnGroup}>
            {[
              { val: 'standard', label: 'Standard' },
              { val: 'half', label: 'Half PPR' },
              { val: 'ppr', label: 'Full PPR' },
            ].map(s => (
              <button
                key={s.val} style={{ ...S.optBtn, ...(scoring === s.val ? S.optBtnActive : {}) }}
                onClick={() => setScoring(s.val)}
              >{s.label}</button>
            ))}
          </div>
        </div>

        <button
          style={S.startBtn}
          onClick={() => onStart({ myPosition, numTeams, scoring })}
        >
          Start Mock Draft →
        </button>
      </div>
    </div>
  );
}

// ─── Main Draft Room ──────────────────────────────────────────────────────────

function MockDraftPage() {
  const router = useRouter();
  const { selected } = useLeague();
  const [phase, setPhase] = useState('setup'); // 'setup' | 'drafting' | 'complete'

  // Config
  const [config, setConfig] = useState(null);

  // Draft state
  const [available, setAvailable] = useState([]);
  const [rosters, setRosters]     = useState({}); // { teamIndex: [player,...] }
  const [board, setBoard]         = useState([]); // { pick, round, teamIndex, teamName, player, isMe }
  const [currentPick, setCurrentPick] = useState(1);
  const [botRunning, setBotRunning]   = useState(false);
  const [myPickNumbers, setMyPickNumbers] = useState([]);
  const [botStyles, setBotStyles] = useState([]);

  // UI state
  const [posFilter, setPosFilter] = useState('ALL');
  const [search, setSearch]       = useState('');
  const [aiRec, setAiRec]         = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [lastBotPick, setLastBotPick] = useState(null);
  const [mounted, setMounted]     = useState(false);

  // League settings
  const [rosterPositions, setRosterPositions] = useState(null);

  const botTimerRef = useRef(null);
  const boardRef    = useRef(null);

  useEffect(() => setMounted(true), []);

  // Load league settings for roster-aware advice
  useEffect(() => {
    if (!selected) return;
    async function loadSettings() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(
          `/api/yahoo/settings?league_key=${encodeURIComponent(selected.leagueKey)}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (res.ok) {
          const s = await res.json();
          if (s.rosterPositions?.length) setRosterPositions(s.rosterPositions);
        }
      } catch {}
    }
    loadSettings();
  }, [selected?.leagueKey]);

  function startDraft({ myPosition, numTeams, scoring }) {
    const cfg = { myPosition, numTeams, scoring, totalRounds: TOTAL_ROUNDS };
    setConfig(cfg);

    // Init rosters: index 0..numTeams-1
    const initRosters = {};
    for (let i = 0; i < numTeams; i++) initRosters[i] = [];
    setRosters(initRosters);

    setAvailable([...MOCK_DRAFT_POOL]);
    setBoard([]);
    setCurrentPick(1);
    setAiRec(null);
    setLastBotPick(null);

    // Which pick numbers belong to me?
    const myPicks = getMyPickNumbers(myPosition, numTeams, TOTAL_ROUNDS);
    setMyPickNumbers(myPicks);

    // Assign bot strategies
    const styles = [];
    for (let i = 0; i < numTeams; i++) {
      styles.push(BOT_STRATEGIES[i % BOT_STRATEGIES.length]);
    }
    setBotStyles(styles);

    setPhase('drafting');
  }

  // Drive the draft forward
  useEffect(() => {
    if (phase !== 'drafting' || !config) return;

    const totalPicks = config.numTeams * TOTAL_ROUNDS;
    if (currentPick > totalPicks) {
      setPhase('complete');
      return;
    }

    const teamPos = getTeamForPick(currentPick, config.numTeams); // 1-indexed
    const isMyPick = teamPos === config.myPosition;

    if (isMyPick) {
      // Wait for user to pick
      setBotRunning(false);
      return;
    }

    // Bot pick
    setBotRunning(true);
    const teamIndex = teamPos - 1; // 0-indexed
    const strategy  = botStyles[teamIndex] || 'balanced';
    const round     = Math.ceil(currentPick / config.numTeams);

    botTimerRef.current = setTimeout(() => {
      setAvailable(prev => {
        const picked = botPick(
          teamIndex, strategy,
          rosters[teamIndex] || [],
          prev,
          rosterPositions,
          round, TOTAL_ROUNDS
        );
        if (!picked) return prev;

        const teamName = teamIndex < BOT_TEAM_NAMES.length
          ? BOT_TEAM_NAMES[teamIndex]
          : `Team ${teamIndex + 1}`;

        setLastBotPick({ player: picked, teamName });
        setRosters(r => ({ ...r, [teamIndex]: [...(r[teamIndex] || []), picked] }));
        setBoard(b => [...b, {
          pick: currentPick, round,
          teamIndex, teamName,
          player: picked, isMe: false,
        }]);
        setCurrentPick(p => p + 1);
        setBotRunning(false);

        return prev.filter(p => p.id !== picked.id);
      });
    }, BOT_PICK_DELAY);

    return () => clearTimeout(botTimerRef.current);
  }, [phase, currentPick, config, botStyles, rosterPositions]);

  // Auto-fire AI rec when it becomes the user's turn
  useEffect(() => {
    if (phase !== 'drafting' || !config || !mounted) return;
    const teamPos = getTeamForPick(currentPick, config.numTeams);
    if (teamPos === config.myPosition) {
      getAiRec();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPick, phase, config]);

  // Auto-scroll board
  useEffect(() => {
    if (boardRef.current) {
      boardRef.current.scrollTop = boardRef.current.scrollHeight;
    }
  }, [board.length]);

  function userDraft(player) {
    if (!config) return;
    const round = Math.ceil(currentPick / config.numTeams);
    const myIndex = config.myPosition - 1;
    const teamName = 'Your Team';

    const draftedPlayer = { ...player, draftedRound: round };
    setAvailable(prev => prev.filter(p => p.id !== player.id));
    setRosters(r => ({ ...r, [myIndex]: [...(r[myIndex] || []), draftedPlayer] }));
    setBoard(b => [...b, {
      pick: currentPick, round,
      teamIndex: myIndex, teamName,
      player, isMe: true,
    }]);
    setCurrentPick(p => p + 1);
    setAiRec(null);
    setLastBotPick(null);
  }

  async function getAiRec() {
    if (!config) return;
    setAiLoading(true);
    setAiRec(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const auth  = token ? { Authorization: `Bearer ${token}` } : {};

      const myIndex  = config.myPosition - 1;
      const myRoster = rosters[myIndex] || [];
      const round    = Math.ceil(currentPick / config.numTeams);

      // Top 20 available by ADP
      const topAvail = [...available]
        .sort((a, b) => a.adp - b.adp)
        .slice(0, 20)
        .map(p => `${p.name} (${p.position}, ${p.team}) ADP ${p.adp}`);

      const myRosterText = myRoster.length
        ? myRoster.map(p => `${p.name} (${p.position})`).join(', ')
        : 'No picks yet';

      const scoringLabel = config.scoring === 'ppr' ? 'Full PPR' :
                           config.scoring === 'half' ? 'Half PPR' : 'Standard';

      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roster: myRoster.map(p => ({ ...p, draftedRound: p.draftedRound || round })),
          available: available.slice(0, 30),
          round,
          pick: currentPick,
          draftPosition: config.myPosition,
          numTeams: config.numTeams,
          leagueKey: selected?.leagueKey,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiRec(data); // full { pick, reason, insight } object
      }
    } catch {}
    finally { setAiLoading(false); }
  }

  // Filtered player list
  const filteredPlayers = available
    .filter(p => posFilter === 'ALL' || p.position === posFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
                            p.team.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.adp - b.adp);

  if (!mounted) return null;
  if (phase === 'setup') return <SetupScreen onStart={startDraft} />;
  if (phase === 'complete') return (
    <CompleteScreen
      rosters={rosters}
      config={config}
      board={board}
      onReset={() => { setPhase('setup'); setConfig(null); }}
      router={router}
    />
  );

  // ── Draft room ──────────────────────────────────────────────────────────
  const round        = Math.ceil(currentPick / config.numTeams);
  const teamPos      = getTeamForPick(currentPick, config.numTeams);
  const isMyPick     = teamPos === config.myPosition;
  const myIndex      = config.myPosition - 1;
  const myRoster     = rosters[myIndex] || [];
  const totalPicks   = config.numTeams * TOTAL_ROUNDS;

  return (
    <div style={S.draftPage}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={S.draftHeader}>
        <button style={S.backBtn} onClick={() => router.push('/dashboard')}>← Exit</button>
        <div style={S.draftHeaderCenter}>
          <div style={S.roundLabel}>Round {round} · Pick {currentPick}</div>
          <div style={{ ...S.turnLabel, color: isMyPick ? '#ff6b1a' : '#666' }}>
            {isMyPick ? '🟠 YOUR PICK' : botRunning ? `${BOT_TEAM_NAMES[(teamPos - 1) % BOT_TEAM_NAMES.length]} is picking...` : 'Processing...'}
          </div>
        </div>
        <div style={S.progressBadge}>{currentPick}/{totalPicks}</div>
      </div>

      {/* Last bot pick notification */}
      {lastBotPick && !isMyPick && (
        <div style={S.botPickBanner}>
          <PosBadge pos={lastBotPick.player.position} />
          <span style={{ color: '#ccc', fontSize: 13, flex: 1 }}>
            <strong>{lastBotPick.teamName}</strong> took {lastBotPick.player.name}
          </span>
        </div>
      )}

      {/* Your pick — AI rec */}
      {isMyPick && (
        <div style={S.myPickBanner}>
          {/* On the clock header */}
          <div style={S.onClockHeader}>
            <div style={S.onClockPulse} />
            <span style={S.onClockText}>YOU'RE ON THE CLOCK</span>
            <span style={S.onClockRound}>R{round} · Pick {currentPick}</span>
          </div>

          {/* AI Rec card */}
          <div style={S.aiRecCard}>
            <div style={S.aiRecCardHeader}>
              <span style={S.aiRecLabelOrange}>🟠 Orange recommends</span>
              <button style={S.refreshBtn} onClick={getAiRec} disabled={aiLoading}>
                {aiLoading ? '...' : '↺ Refresh'}
              </button>
            </div>

            {aiLoading && (
              <div style={S.aiLoadingRow}>
                <div style={S.aiSpinner} />
                <span style={{ fontSize: 13, color: '#666' }}>Analyzing your roster...</span>
              </div>
            )}

            {!aiLoading && aiRec?.pick && (
              <>
                <div style={S.aiPickRow}>
                  <PosBadge pos={aiRec.pick.position} size="md" />
                  <div style={{ flex: 1 }}>
                    <div style={S.aiPickName}>{aiRec.pick.name}</div>
                    <div style={S.aiPickTeam}>{aiRec.pick.team}</div>
                  </div>
                </div>
                {aiRec.reason && <div style={S.aiReasonText}>{aiRec.reason}</div>}
                {aiRec.insight && <div style={S.aiInsightText}>💡 {aiRec.insight}</div>}
              </>
            )}

            {!aiLoading && !aiRec && (
              <div style={{ fontSize: 13, color: '#555' }}>Fetching recommendation...</div>
            )}
          </div>
        </div>
      )}

      {/* Player pool */}
      <div style={S.poolSection}>
        <div style={S.poolHeader}>
          <div style={S.posFilters}>
            {['ALL','QB','RB','WR','TE','K','DEF'].map(pos => (
              <button
                key={pos}
                style={{ ...S.posBtn, ...(posFilter === pos ? S.posBtnActive : {}) }}
                onClick={() => setPosFilter(pos)}
              >{pos}</button>
            ))}
          </div>
          <input
            style={S.searchInput}
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={S.playerList}>
          {filteredPlayers.slice(0, 40).map(p => (
            <div key={p.id} style={S.playerRow}>
              <span style={{ color: '#444', fontSize: 11, minWidth: 28 }}>
                {p.adp.toFixed(1)}
              </span>
              <PosBadge pos={p.position} />
              <div style={{ flex: 1 }}>
                <div style={S.playerName}>{p.name}</div>
                <div style={S.playerMeta}>{p.team} · Proj {p.projectedPts} · Bye {p.bye}</div>
              </div>
              <button
                style={{ ...S.draftBtn, opacity: isMyPick ? 1 : 0.3 }}
                disabled={!isMyPick}
                onClick={() => isMyPick && userDraft(p)}
              >
                Draft
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* My roster sidebar (bottom strip on mobile) */}
      <div style={S.myRosterStrip}>
        <div style={S.rosterStripTitle}>MY ROSTER ({myRoster.length}/{TOTAL_ROUNDS})</div>
        <div style={S.rosterPills}>
          {myRoster.map((p, i) => (
            <div key={i} style={S.rosterPill}>
              <PosBadge pos={p.position} />
              <span style={S.rosterPillName}>{p.name.split(' ').pop()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Complete Screen ──────────────────────────────────────────────────────────

function CompleteScreen({ rosters, config, board, onReset, router }) {
  const myIndex  = config.myPosition - 1;
  const myRoster = rosters[myIndex] || [];

  const byPos = {};
  for (const p of myRoster) {
    if (!byPos[p.position]) byPos[p.position] = [];
    byPos[p.position].push(p);
  }

  return (
    <div style={S.completePage}>
      <div style={S.completeHeader}>
        <div style={S.completeTitle}>Draft Complete 🏆</div>
        <div style={S.completeSub}>{TOTAL_ROUNDS} rounds · {config.numTeams} teams</div>
      </div>

      <div style={S.completeRosterCard}>
        <div style={S.sectionLabel}>YOUR ROSTER</div>
        {['QB','RB','WR','TE','K','DEF'].map(pos => (
          byPos[pos]?.length ? (
            <div key={pos}>
              {byPos[pos].map((p, i) => (
                <div key={i} style={S.completePlayerRow}>
                  <PosBadge pos={pos} />
                  <div style={{ flex: 1 }}>
                    <div style={S.playerName}>{p.name}</div>
                    <div style={S.playerMeta}>{p.team} · Proj {p.projectedPts} pts · Bye {p.bye}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null
        ))}
      </div>

      <div style={S.completeActions}>
        <button style={S.completeBtn} onClick={onReset}>
          Run Another Mock Draft
        </button>
        <button style={{ ...S.completeBtn, background: '#1a1a2e', color: '#fff' }} onClick={() => router.push('/draft-grades')}>
          Grade My Real Draft →
        </button>
        <button style={{ ...S.completeBtn, background: 'none', color: '#555' }} onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  // Setup
  setupPage: {
    minHeight: '100vh', background: '#0a0a0f', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  },
  setupCard: {
    width: '100%', maxWidth: 440, color: '#fff',
  },
  setupLogo: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  setupTitle: { fontSize: 28, fontWeight: 900, textAlign: 'center', margin: '0 0 8px', letterSpacing: -0.5 },
  setupSub: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 1.5 },
  setupSection: { marginBottom: 28 },
  setupLabel: { fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  btnGroup: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  optBtn: {
    padding: '8px 14px', borderRadius: 8, border: '1px solid #2a2a4a',
    background: '#0d0d1a', color: '#666', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  optBtnActive: { background: '#ff6b1a', color: '#fff', border: '1px solid #ff6b1a' },
  posSliderRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  posNum: { fontSize: 28, fontWeight: 900, color: '#ff6b1a', minWidth: 32 },
  posOf: { fontSize: 13, color: '#555' },
  posHint: { fontSize: 12, color: '#555', fontStyle: 'italic', lineHeight: 1.4 },
  startBtn: {
    width: '100%', background: '#ff6b1a', color: '#fff', border: 'none',
    borderRadius: 14, padding: '16px 0', fontSize: 16, fontWeight: 800,
    cursor: 'pointer', marginTop: 8,
  },

  // Draft room
  draftPage: {
    minHeight: '100vh', background: '#0a0a0f',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    color: '#fff', paddingBottom: 120,
  },
  draftHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid #1a1a2e',
    background: '#0a0a0f', position: 'sticky', top: 0, zIndex: 10,
  },
  backBtn: { background: 'none', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer' },
  draftHeaderCenter: { textAlign: 'center' },
  roundLabel: { fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: 1 },
  turnLabel: { fontSize: 13, fontWeight: 800, letterSpacing: 0.5 },
  progressBadge: { fontSize: 11, color: '#555', fontWeight: 700 },

  botPickBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 16px', background: '#111', borderBottom: '1px solid #1a1a2e',
    animation: 'pulse 1s ease',
  },
  myPickBanner: {
    background: '#1a0800', borderBottom: '2px solid #ff6b1a55',
  },
  onClockHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 16px', background: '#ff6b1a',
  },
  onClockPulse: {
    width: 8, height: 8, borderRadius: '50%', background: '#fff',
    animation: 'pulse 1s ease infinite', flexShrink: 0,
  },
  onClockText: { fontSize: 12, fontWeight: 900, color: '#000', letterSpacing: 1.5, flex: 1 },
  onClockRound: { fontSize: 11, fontWeight: 700, color: '#0005' },

  aiRecCard: {
    padding: '12px 16px',
  },
  aiRecCardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  aiRecLabelOrange: { fontSize: 12, fontWeight: 800, color: '#ff6b1a' },
  refreshBtn: {
    background: 'none', border: '1px solid #333', borderRadius: 6,
    color: '#666', fontSize: 11, padding: '3px 8px', cursor: 'pointer',
  },
  aiLoadingRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' },
  aiSpinner: {
    width: 14, height: 14, border: '2px solid #333', borderTopColor: '#ff6b1a',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  },
  aiPickRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  aiPickName: { fontSize: 16, fontWeight: 900, color: '#fff' },
  aiPickTeam: { fontSize: 11, color: '#666', marginTop: 1 },
  aiReasonText: { fontSize: 13, color: '#ccc', lineHeight: 1.5, marginBottom: 6 },
  aiInsightText: { fontSize: 12, color: '#555', fontStyle: 'italic', lineHeight: 1.4 },
  aiRecText: { fontSize: 13, color: '#ccc', lineHeight: 1.5 },

  poolSection: { padding: '0' },
  poolHeader: { padding: '10px 16px', borderBottom: '1px solid #111', position: 'sticky', top: 57, background: '#0a0a0f', zIndex: 5 },
  posFilters: { display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto' },
  posBtn: {
    padding: '5px 10px', borderRadius: 6, border: '1px solid #1a1a2e',
    background: 'none', color: '#555', fontSize: 11, fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  posBtnActive: { background: '#1a1a2e', color: '#fff', border: '1px solid #3a3a6a' },
  searchInput: {
    width: '100%', background: '#111', border: '1px solid #1a1a2e',
    borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  },
  playerList: { overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' },
  playerRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 16px', borderBottom: '1px solid #111',
  },
  playerName: { fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 1 },
  playerMeta: { fontSize: 11, color: '#555' },
  draftBtn: {
    background: '#ff6b1a', color: '#fff', border: 'none', borderRadius: 8,
    padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    flexShrink: 0,
  },

  // Roster strip
  myRosterStrip: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#0d0d1a', borderTop: '1px solid #1a1a2e', padding: '10px 16px',
    zIndex: 20,
  },
  rosterStripTitle: { fontSize: 9, color: '#555', fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 },
  rosterPills: { display: 'flex', gap: 6, overflowX: 'auto' },
  rosterPill: { display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
  rosterPillName: { fontSize: 11, color: '#aaa' },

  // Complete
  completePage: {
    minHeight: '100vh', background: '#0a0a0f', color: '#fff',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    padding: '32px 16px',
  },
  completeHeader: { textAlign: 'center', marginBottom: 24 },
  completeTitle: { fontSize: 28, fontWeight: 900, letterSpacing: -0.5 },
  completeSub: { fontSize: 13, color: '#555', marginTop: 4 },
  completeRosterCard: {
    background: '#0d0d1a', border: '1px solid #1a1a2e',
    borderRadius: 14, padding: '16px', marginBottom: 24,
  },
  sectionLabel: { fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 },
  completePlayerRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #111',
  },
  completeActions: { display: 'flex', flexDirection: 'column', gap: 10 },
  completeBtn: {
    width: '100%', background: '#ff6b1a', color: '#fff', border: 'none',
    borderRadius: 12, padding: '14px 0', fontSize: 14, fontWeight: 700,
    cursor: 'pointer',
  },
};

export default withAuth(MockDraftPage);

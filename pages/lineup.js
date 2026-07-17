import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTrial } from '../lib/useTrial';
import { withAuth } from '../lib/withAuth';
import { supabase } from '../lib/supabaseClient';
import {
  MY_ROSTER,
  SCHEDULE,
  WEEKLY_RECS,
  BYE_WEEKS,
  PLAYER_DETAILS,
} from '../lib/sampleData';

const CURRENT_WEEK = 14;
const GRADE_COLOR = { A: '#22c55e', B: '#84cc16', C: '#f59e0b', D: '#ef4444', F: '#7f1d1d' };

function LineupOptimizer() {
  const router = useRouter();
  const [selectedWeek, setSelectedWeek] = useState(CURRENT_WEEK);
  const [view, setView] = useState('startsit');
  const [moreInfoPlayer, setMoreInfoPlayer] = useState(null);
  const [swapped, setSwapped] = useState({});

  // Live AI state
  const [aiAnalysis, setAiAnalysis]   = useState(null);
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiError, setAiError]         = useState(null);
  const [needsConnect, setNeedsConnect] = useState(false);

  const { isPremium } = useTrial();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Fetch live roster + AI analysis on mount
  useEffect(() => {
    async function fetchAI() {
      try {
        setAiLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const authHeader = { Authorization: `Bearer ${session.access_token}` };

        // Get teams
        const teamsRes = await fetch('/api/yahoo/myteams', { headers: authHeader });
        if (teamsRes.status === 404) { setNeedsConnect(true); setAiLoading(false); return; }
        if (!teamsRes.ok) { setAiError('Could not load Yahoo data.'); setAiLoading(false); return; }

        const { teams } = await teamsRes.json();
        if (!teams?.length) { setNeedsConnect(true); setAiLoading(false); return; }

        const { leagueKey, teamKey } = teams[0];

        // Get dashboard data (roster + matchup)
        const dashRes = await fetch(
          `/api/yahoo/dashboard?league_key=${encodeURIComponent(leagueKey)}&team_key=${encodeURIComponent(teamKey)}`,
          { headers: authHeader }
        );
        if (!dashRes.ok) { setAiError('Could not load roster.'); setAiLoading(false); return; }

        const { roster, matchup, league } = await dashRes.json();

        if (!roster?.length) {
          setAiAnalysis('__offseason__');
          setAiLoading(false);
          return;
        }

        // Call AI
        const aiRes = await fetch('/api/ai/startsit', {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ roster, matchup, leagueKey }),
        });
        if (!aiRes.ok) { setAiError('AI analysis failed. Try again.'); setAiLoading(false); return; }

        const { analysis } = await aiRes.json();
        setAiAnalysis(analysis);
      } catch (e) {
        setAiError('Something went wrong.');
      } finally {
        setAiLoading(false);
      }
    }
    if (mounted) fetchAI();
  }, [mounted]);

  if (!mounted) return <PageSkeleton />;

  const weekData   = SCHEDULE[selectedWeek] || SCHEDULE[CURRENT_WEEK];
  const weekRecs   = WEEKLY_RECS[selectedWeek] || WEEKLY_RECS[CURRENT_WEEK];
  const isLive     = weekData.status === 'live';
  const isUpcoming = selectedWeek > CURRENT_WEEK;
  const isPast     = selectedWeek < CURRENT_WEEK;

  // Partition recs
  const byeRecs     = weekRecs.filter(r => r.byeFlag);
  const starts      = weekRecs.filter(r => r.recommendation === 'start'  && !r.byeFlag);
  const monitors    = weekRecs.filter(r => r.recommendation === 'monitor' && !r.byeFlag);
  const sits        = weekRecs.filter(r => r.recommendation === 'sit'     && !r.byeFlag);

  // Projected total (exclude bye players)
  const totalProjected = MY_ROSTER.starters.reduce((sum, p) => {
    if (BYE_WEEKS[p.id] === selectedWeek) return sum;
    return sum + (p.projectedPts || 0);
  }, 0);

  // Swap logic
  function doSwap(starterId, benchPlayer) {
    setSwapped(prev => ({ ...prev, [starterId]: benchPlayer }));
  }
  function undoSwap(starterId) {
    setSwapped(prev => { const n = { ...prev }; delete n[starterId]; return n; });
  }

  // Swap alerts
  const swapAlerts = MY_ROSTER.bench.filter(benchP => {
    if (BYE_WEEKS[benchP.id] === selectedWeek) return false;
    return MY_ROSTER.starters.some(s =>
      s.position === benchP.position &&
      benchP.projectedPts > s.projectedPts + 2 &&
      benchP.status !== 'doubtful'
    );
  });

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={() => router.push('/dashboard')}>←</button>
          <span style={styles.logo}>🟠</span>
          <span style={styles.headerTitle}>Lineup</span>
        </div>
        <div style={styles.headerRight}>
          {/* Week Stepper */}
          <div style={styles.weekStepper}>
            <button
              style={styles.weekStepBtn}
              onClick={() => setSelectedWeek(w => Math.max(1, w - 1))}
            >‹</button>
            <span style={styles.weekLabel}>Wk {selectedWeek}</span>
            <button
              style={styles.weekStepBtn}
              onClick={() => setSelectedWeek(w => Math.min(17, w + 1))}
            >›</button>
          </div>
          <div style={styles.projBadge}>
            <span style={styles.projLabel}>Proj</span>
            <span style={styles.projScore}>{totalProjected.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Week Status Banner */}
      {isLive && (
        <div style={{ ...styles.weekBanner, background: '#0a1f0a', borderBottomColor: '#22c55e', color: '#86efac' }}>
          🟢 LIVE · Week {selectedWeek} — scores updating in real time
        </div>
      )}
      {isUpcoming && (
        <div style={{ ...styles.weekBanner, background: '#0d1a2e', borderBottomColor: '#0284c7', color: '#38bdf8' }}>
          📅 Week {selectedWeek} Preview — projections update as injury reports come in
        </div>
      )}
      {isPast && (
        <div style={{ ...styles.weekBanner, background: '#1a1a1a', borderBottomColor: '#3f3f46', color: '#71717a' }}>
          📁 Week {selectedWeek} — final results
        </div>
      )}

      {/* Matchup Card */}
      <div style={styles.matchupCard}>
        <div style={styles.matchupSide}>
          <div style={{ ...styles.matchupScore, color: isLive ? (weekData.myScore > weekData.opponent.score ? '#22c55e' : '#ef4444') : '#f97316' }}>
            {isLive ? weekData.myScore.toFixed(2) : weekData.myProjected.toFixed(1)}
          </div>
          <div style={styles.matchupTeam}>Frogman's Squad</div>
          <div style={styles.matchupProj}>{isLive ? `Proj: ${weekData.myProjected.toFixed(1)}` : 'Projected'}</div>
        </div>
        <div style={styles.matchupVs}>VS</div>
        <div style={{ ...styles.matchupSide, textAlign: 'right' }}>
          <div style={{ ...styles.matchupScore, color: isLive ? (weekData.opponent.score > weekData.myScore ? '#22c55e' : '#ef4444') : '#71717a' }}>
            {isLive ? weekData.opponent.score.toFixed(2) : weekData.opponent.projected.toFixed(1)}
          </div>
          <div style={styles.matchupTeam}>{weekData.opponent.name}</div>
          <div style={styles.matchupProj}>{isLive ? `Proj: ${weekData.opponent.projected.toFixed(1)}` : 'Projected'}</div>
        </div>
      </div>

      {/* Edge Bar */}
      <div style={styles.edgeBar}>
        <span style={styles.edgeLabel}>
          {isLive ? 'Live edge' : 'Projected edge'}
        </span>
        <span style={{
          ...styles.edgeValue,
          color: weekData.myProjected > weekData.opponent.projected ? '#22c55e' : '#ef4444',
        }}>
          {weekData.myProjected > weekData.opponent.projected ? '+' : ''}
          {(weekData.myProjected - weekData.opponent.projected).toFixed(1)} pts
        </span>
      </div>

      {/* Bye Alert */}
      {byeRecs.length > 0 && (
        <div style={styles.byeAlert}>
          ⛔ {byeRecs.map(r => r.player.name.split(' ').pop()).join(', ')} on BYE this week — check your lineup!
        </div>
      )}

      {/* Swap Alert */}
      {swapAlerts.length > 0 && (
        <div style={styles.swapAlert}>
          🔄 {swapAlerts.length} bench player{swapAlerts.length > 1 ? 's' : ''} outproject{swapAlerts.length === 1 ? 's' : ''} a starter
        </div>
      )}

      {/* View Tabs */}
      <div style={styles.tabs}>
        {[
          { key: 'startsit', label: '✅ Start/Sit' },
          { key: 'lineup',   label: '📋 Lineup' },
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

      {/* ── START / SIT ── */}
      {view === 'startsit' && (
        <div style={styles.content}>
          {aiLoading && (
            <div style={styles.aiLoadingCard}>
              <div style={styles.aiLoadingIcon}>🟠</div>
              <div style={styles.aiLoadingText}>Analyzing your roster…</div>
              <div style={styles.aiLoadingSub}>Orange AI is reviewing your players</div>
            </div>
          )}

          {!aiLoading && needsConnect && (
            <div style={styles.aiEmptyCard}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔗</div>
              <div style={styles.aiEmptyTitle}>Connect Yahoo to get AI advice</div>
              <button style={styles.connectBtn} onClick={() => router.push('/connect')}>
                Connect Yahoo Account
              </button>
            </div>
          )}

          {!aiLoading && aiAnalysis === '__offseason__' && (
            <div style={styles.aiEmptyCard}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🏈</div>
              <div style={styles.aiEmptyTitle}>Season hasn't started yet</div>
              <div style={styles.aiEmptySub}>
                AI start/sit advice will appear here once your league drafts and the season kicks off.
              </div>
            </div>
          )}

          {!aiLoading && aiError && (
            <div style={styles.aiErrorCard}>
              <div>⚠️ {aiError}</div>
              <button style={styles.retryBtn} onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}

          {!aiLoading && aiAnalysis && aiAnalysis !== '__offseason__' && (
            <div style={styles.aiCard}>
              <div style={styles.aiCardHeader}>
                <span style={styles.aiCardIcon}>🟠</span>
                <span style={styles.aiCardTitle}>Orange AI Analysis</span>
                <span style={styles.aiCardBadge}>LIVE</span>
              </div>
              <div style={styles.aiCardBody}>
                {aiAnalysis.split('\n').filter(l => l.trim()).map((line, i) => (
                  <p key={i} style={{
                    ...styles.aiLine,
                    ...(line.match(/^\d\./) ? styles.aiLineHeader : {}),
                  }}>
                    {line}
                  </p>
                ))}
              </div>
              <button style={styles.refreshBtn} onClick={() => window.location.reload()}>
                ↻ Refresh Analysis
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── LINEUP ── */}
      {view === 'lineup' && (
        <div style={styles.content}>
          <div style={styles.sectionLabel}>Starters</div>
          {MY_ROSTER.starters.map(starter => {
            const onBye = BYE_WEEKS[starter.id] === selectedWeek;
            const active = swapped[starter.id] || starter;
            const isSub = !!swapped[starter.id];
            const benchUpgrade = !onBye && MY_ROSTER.bench.find(
              b => b.position === starter.position &&
                   b.projectedPts > starter.projectedPts + 2 &&
                   b.status !== 'doubtful' &&
                   BYE_WEEKS[b.id] !== selectedWeek
            );
            return (
              <div key={starter.id} style={{
                ...styles.lineupCard,
                ...(onBye ? styles.lineupCardBye : {}),
                ...(isSub ? styles.lineupCardSub : {}),
              }}>
                <div style={styles.lineupLeft}>
                  <span style={styles.slotLabel}>{starter.position}</span>
                  <span style={getPosBadge(active.position)}>{active.position}</span>
                  <div style={styles.lineupInfo}>
                    <div style={styles.lineupName}>
                      {active.name}
                      {onBye && <span style={styles.byeTag}> ⛔ BYE</span>}
                      {active.injuryNote && !onBye && <span style={styles.injuryTag}> ⚠️</span>}
                      {isSub && <span style={styles.subTag}> SWAPPED</span>}
                    </div>
                    <div style={styles.lineupTeam}>{active.team}</div>
                  </div>
                </div>
                <div style={styles.lineupRight}>
                  <div style={{ ...styles.lineupProj, color: onBye ? '#3f3f46' : '#f97316' }}>
                    {onBye ? '—' : active.projectedPts.toFixed(1)}
                  </div>
                  {benchUpgrade && !isSub && (
                    <button style={styles.swapBtn} onClick={() => doSwap(starter.id, benchUpgrade)}>
                      ↑ {benchUpgrade.name.split(' ').pop()} {benchUpgrade.projectedPts.toFixed(1)}
                    </button>
                  )}
                  {isSub && (
                    <button style={styles.undoSwapBtn} onClick={() => undoSwap(starter.id)}>↩ Undo</button>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{ ...styles.sectionLabel, marginTop: 20 }}>Bench</div>
          {MY_ROSTER.bench.map(p => {
            const onBye = BYE_WEEKS[p.id] === selectedWeek;
            return (
              <div key={p.id} style={{ ...styles.lineupCard, opacity: 0.60, ...(onBye ? styles.lineupCardBye : {}) }}>
                <div style={styles.lineupLeft}>
                  <span style={styles.slotLabel}>BN</span>
                  <span style={getPosBadge(p.position)}>{p.position}</span>
                  <div style={styles.lineupInfo}>
                    <div style={styles.lineupName}>
                      {p.name}
                      {onBye && <span style={styles.byeTag}> ⛔ BYE</span>}
                      {p.injuryNote && !onBye && <span style={styles.injuryTag}> ⚠️ {p.injuryNote}</span>}
                    </div>
                    <div style={styles.lineupTeam}>{p.team}</div>
                  </div>
                </div>
                <div style={styles.lineupRight}>
                  <div style={{ ...styles.lineupProj, color: onBye ? '#3f3f46' : '#f97316' }}>
                    {onBye ? '—' : p.projectedPts.toFixed(1)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MATCHUP ── */}
      {view === 'matchup' && (
        <div style={styles.content}>
          <div style={styles.sectionLabel}>Their Defensive Weaknesses</div>
          <div style={styles.weaknessGrid}>
            {Object.entries(weekData.opponentWeaknesses).map(([pos, grade]) => (
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
            const onBye = BYE_WEEKS[p.id] === selectedWeek;
            const grade = weekData.opponentWeaknesses[p.position] || 'C';
            const rec = weekRecs.find(r => r.player.id === p.id);
            return (
              <div key={p.id} style={{ ...styles.matchupPlayerCard, opacity: onBye ? 0.4 : 1 }}>
                <span style={getPosBadge(p.position)}>{p.position}</span>
                <div style={styles.matchupPlayerInfo}>
                  <div style={styles.matchupPlayerName}>
                    {p.name}
                    {onBye && <span style={styles.byeTag}> ⛔ BYE</span>}
                    {p.injuryNote && !onBye && <span style={styles.injuryTag}> ⚠️</span>}
                  </div>
                  {rec && !onBye && <div style={styles.matchupReason}>{rec.reason}</div>}
                </div>
                <div style={styles.matchupGradeWrap}>
                  {!onBye && <span style={{ ...styles.gradeTag, color: GRADE_COLOR[grade] }}>{grade}</span>}
                  <span style={{ ...styles.matchupPts, color: onBye ? '#3f3f46' : '#f97316' }}>
                    {onBye ? 'BYE' : p.projectedPts.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}

          <div style={styles.sectionLabel}>Their Starters</div>
          {weekData.opponentStarters.map(p => (
            <div key={p.id} style={{ ...styles.matchupPlayerCard, opacity: 0.72 }}>
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

      {/* More Info Bottom Sheet */}
      {moreInfoPlayer && (
        <div style={styles.sheetOverlay} onClick={() => setMoreInfoPlayer(null)}>
          <div style={styles.sheet} onClick={e => e.stopPropagation()}>
            <div style={styles.sheetHandle} />
            <div style={styles.sheetHeader}>
              <span style={getPosBadge(moreInfoPlayer.position)}>{moreInfoPlayer.position}</span>
              <div style={styles.sheetPlayerInfo}>
                <div style={styles.sheetPlayerName}>{moreInfoPlayer.name}</div>
                <div style={styles.sheetPlayerTeam}>{moreInfoPlayer.team}</div>
              </div>
              <button style={styles.sheetClose} onClick={() => setMoreInfoPlayer(null)}>✕</button>
            </div>

            {(() => {
              const d = PLAYER_DETAILS[moreInfoPlayer.id];
              if (!d) return <div style={styles.sheetNoData}>Detailed data available when Yahoo connects.</div>;
              return (
                <>
                  <div style={{ ...styles.verdictCard, borderColor: d.verdictColor }}>
                    <div style={{ ...styles.verdictLabel, color: d.verdictColor }}>🟠 Orange Verdict: {d.verdict}</div>
                    <div style={styles.verdictDetail}>{d.verdictDetail}</div>
                  </div>

                  <div style={styles.sheetSection}>
                    <div style={styles.sheetSectionTitle}>Projections</div>
                    <div style={styles.statGrid}>
                      <div style={styles.statCard}>
                        <div style={styles.statValue}>{moreInfoPlayer.projectedPts.toFixed(1)}</div>
                        <div style={styles.statLabel}>Orange</div>
                      </div>
                      <div style={styles.statCard}>
                        <div style={styles.statValue}>{d.expertConsensus.toFixed(1)}</div>
                        <div style={styles.statLabel}>Expert Avg</div>
                      </div>
                      <div style={styles.statCard}>
                        <div style={{ ...styles.statValue, fontSize: 13 }}>{d.expertLow}–{d.expertHigh}</div>
                        <div style={styles.statLabel}>Range</div>
                      </div>
                      <div style={styles.statCard}>
                        <div style={styles.statValue}>{d.ecrPos}</div>
                        <div style={styles.statLabel}>ECR</div>
                      </div>
                    </div>
                  </div>

                  <div style={styles.sheetSection}>
                    <div style={styles.sheetSectionTitle}>Matchup · Week {selectedWeek}</div>
                    <div style={styles.matchupDetailRow}>
                      <span style={styles.matchupDetailLabel}>Opponent</span>
                      <span style={styles.matchupDetailValue}>vs {d.oppTeam}</span>
                    </div>
                    <div style={styles.matchupDetailRow}>
                      <span style={styles.matchupDetailLabel}>Def Rank</span>
                      <span style={{ ...styles.matchupDetailValue, color: d.oppDefRank > 20 ? '#22c55e' : d.oppDefRank > 10 ? '#f59e0b' : '#ef4444' }}>
                        {d.oppDefLabel}
                      </span>
                    </div>
                    <div style={styles.matchupDetailRow}>
                      <span style={styles.matchupDetailLabel}>Vegas O/U</span>
                      <span style={styles.matchupDetailValue}>{d.vegasTotal}</span>
                    </div>
                    <div style={styles.matchupDetailRow}>
                      <span style={styles.matchupDetailLabel}>Implied Pts</span>
                      <span style={{ ...styles.matchupDetailValue, color: '#22c55e' }}>{d.impliedTeamScore}</span>
                    </div>
                  </div>

                  <div style={styles.sheetSection}>
                    <div style={styles.sheetSectionTitle}>Injury Report</div>
                    <div style={styles.injuryDetail}>{d.injuryStatus}</div>
                  </div>

                  <div style={styles.expertNote}>
                    📡 Live expert consensus from FantasyPros top-100 analysts syncs automatically when Yahoo API connects.
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div style={styles.bottomNav}>
        <button style={styles.navBtn} onClick={() => router.push('/draft')}>🎯 Draft</button>
        <button style={{ ...styles.navBtn, ...styles.navBtnActive }}>📊 Lineup</button>
        <button style={styles.navBtn} onClick={() => router.push('/dashboard')}>🏠 Home</button>
        <button style={styles.navBtn} onClick={() => router.push('/account')}>👤 Account</button>
      </div>
    </div>
  );
}

// ─── Rec Section ──────────────────────────────────────────────────────────────

function RecSection({ title, color, recs, onMoreInfo, isPremium }) {
  const router = useRouter();
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
                {rec.byeFlag && <span style={styles.byeTag}> ⛔ BYE</span>}
              </div>
              <div style={styles.recCardReason}>{rec.reason}</div>
              {!rec.byeFlag && (
                isPremium
                  ? <button style={styles.moreInfoBtn} onClick={() => onMoreInfo(rec.player)}>More Info ›</button>
                  : <button style={styles.moreInfoLocked} onClick={() => router.push('/pricing')}>🔒 More Info</button>
              )}
            </div>
          </div>
          <div style={styles.recCardRight}>
            <div style={{ ...styles.recCardPts, color: rec.byeFlag ? '#3f3f46' : '#f97316' }}>
              {rec.byeFlag ? '—' : rec.player.projectedPts.toFixed(1)}
            </div>
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
    minHeight: '100vh', background: '#0f0f0f', color: '#fff',
    fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: 80,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid #1f1f1f',
    background: '#111', position: 'sticky', top: 0, zIndex: 10,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  backBtn: {
    background: 'transparent', border: '1px solid #2a2a2a',
    color: '#71717a', borderRadius: 6, padding: '4px 10px', fontSize: 16, cursor: 'pointer',
  },
  logo: { fontSize: 20 },
  headerTitle: { fontSize: 17, fontWeight: 700 },
  weekStepper: { display: 'flex', alignItems: 'center', gap: 6 },
  weekStepBtn: {
    background: '#1f1f1f', border: '1px solid #2a2a2a', color: '#a1a1aa',
    borderRadius: 6, width: 28, height: 28, fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  weekLabel: { fontSize: 14, fontWeight: 800, minWidth: 44, textAlign: 'center' },
  projBadge: { textAlign: 'right' },
  projLabel: { display: 'block', fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.5px' },
  projScore: { fontSize: 20, fontWeight: 800, color: '#f97316' },
  weekBanner: {
    fontSize: 12, fontWeight: 700, padding: '9px 16px',
    borderBottom: '1px solid', textAlign: 'center',
  },
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
    background: '#0d0d0d', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a',
    padding: '8px 16px',
  },
  edgeLabel: { fontSize: 12, color: '#52525b' },
  edgeValue: { fontSize: 13, fontWeight: 800 },
  byeAlert: {
    background: '#1a0000', borderBottom: '1px solid #7f1d1d',
    color: '#fca5a5', fontSize: 13, fontWeight: 700, padding: '10px 16px', textAlign: 'center',
  },
  swapAlert: {
    background: '#0f1a2e', borderBottom: '1px solid #0284c7',
    color: '#38bdf8', fontSize: 13, fontWeight: 600, padding: '8px 16px',
  },
  tabs: { display: 'flex', borderBottom: '1px solid #1f1f1f', background: '#111' },
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
  recCardPts: { fontSize: 18, fontWeight: 800 },
  gradeTag: { fontSize: 14, fontWeight: 800 },
  moreInfoBtn: {
    background: 'transparent', border: '1px solid #2a2a2a', color: '#52525b',
    borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', marginTop: 6,
  },
  moreInfoLocked: {
    background: 'transparent', border: '1px solid #3f1a00', color: '#7c2d12',
    borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', marginTop: 6,
  },
  lineupCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#141414', borderRadius: 10, padding: '11px 14px',
    marginBottom: 6, border: '1px solid #1f1f1f', gap: 8,
  },
  lineupCardBye: { opacity: 0.45, border: '1px solid #7f1d1d' },
  lineupCardSub: { border: '1px solid #0284c7', background: '#0d1a2e' },
  lineupLeft: { display: 'flex', alignItems: 'center', gap: 8, flex: 1 },
  slotLabel: { fontSize: 10, color: '#3f3f46', fontWeight: 800, width: 30 },
  lineupInfo: { flex: 1 },
  lineupName: { fontSize: 13, fontWeight: 700 },
  lineupTeam: { fontSize: 11, color: '#52525b', marginTop: 1 },
  lineupRight: { textAlign: 'right', flexShrink: 0 },
  lineupProj: { fontSize: 16, fontWeight: 800 },
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
  byeTag: { color: '#ef4444', fontSize: 10, fontWeight: 800 },
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
  matchupPts: { display: 'block', fontSize: 15, fontWeight: 800 },
  weaknessGrid: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  weaknessCard: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
    padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, flexDirection: 'column',
  },
  weaknessHint: { fontSize: 10, color: '#52525b', textAlign: 'center' },
  sheetOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    zIndex: 100, display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    background: '#161616', borderRadius: '20px 20px 0 0', border: '1px solid #2a2a2a',
    width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '0 20px 40px',
  },
  sheetHandle: {
    width: 40, height: 4, background: '#3f3f46',
    borderRadius: 2, margin: '14px auto 20px',
  },
  sheetHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  sheetPlayerInfo: { flex: 1 },
  sheetPlayerName: { fontSize: 18, fontWeight: 800 },
  sheetPlayerTeam: { fontSize: 13, color: '#71717a' },
  sheetClose: {
    background: '#1f1f1f', border: 'none', color: '#71717a',
    borderRadius: 8, width: 32, height: 32, fontSize: 14, cursor: 'pointer', flexShrink: 0,
  },
  verdictCard: {
    border: '1px solid', borderRadius: 12, padding: '14px', marginBottom: 16, background: '#0d0d0d',
  },
  verdictLabel: { fontSize: 13, fontWeight: 800, marginBottom: 6 },
  verdictDetail: { fontSize: 13, color: '#a1a1aa', lineHeight: 1.5 },
  sheetSection: { marginBottom: 16 },
  sheetSectionTitle: {
    fontSize: 11, fontWeight: 800, color: '#52525b',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10,
  },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 },
  statCard: { background: '#1a1a1a', borderRadius: 8, padding: '10px 8px', textAlign: 'center' },
  statValue: { fontSize: 17, fontWeight: 800, color: '#f97316', marginBottom: 3 },
  statLabel: { fontSize: 10, color: '#52525b', fontWeight: 600 },
  matchupDetailRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid #1a1a1a',
  },
  matchupDetailLabel: { fontSize: 12, color: '#52525b' },
  matchupDetailValue: { fontSize: 13, fontWeight: 700 },
  injuryDetail: { background: '#1a1a1a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#a1a1aa' },
  expertNote: {
    background: '#0d1a2e', border: '1px solid #0284c7', borderRadius: 8,
    padding: '10px 14px', fontSize: 12, color: '#38bdf8', lineHeight: 1.5, marginTop: 8,
  },
  sheetNoData: { fontSize: 13, color: '#52525b', padding: '20px 0', textAlign: 'center' },
  aiLoadingCard: {
    textAlign: 'center', padding: '48px 20px',
  },
  aiLoadingIcon: { fontSize: 40, marginBottom: 12, animation: 'pulse 1.5s infinite' },
  aiLoadingText: { fontSize: 16, fontWeight: 700, marginBottom: 6 },
  aiLoadingSub: { fontSize: 13, color: '#52525b' },
  aiEmptyCard: {
    textAlign: 'center', padding: '40px 20px',
  },
  aiEmptyTitle: { fontSize: 15, fontWeight: 700, color: '#f97316', marginBottom: 8 },
  aiEmptySub: { fontSize: 13, color: '#52525b', lineHeight: 1.5 },
  connectBtn: {
    marginTop: 16, background: '#f97316', color: '#000', border: 'none',
    borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 800, cursor: 'pointer',
  },
  aiErrorCard: {
    background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: 10,
    padding: '16px', color: '#f87171', fontSize: 13, textAlign: 'center',
  },
  retryBtn: {
    marginTop: 10, background: '#1f1f1f', border: '1px solid #2a2a2a',
    color: '#a1a1aa', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer',
  },
  aiCard: {
    background: '#141414', border: '1px solid #f97316', borderRadius: 14,
    overflow: 'hidden', marginTop: 8,
  },
  aiCardHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#1a1200', padding: '12px 16px', borderBottom: '1px solid #2a2a2a',
  },
  aiCardIcon: { fontSize: 18 },
  aiCardTitle: { fontSize: 14, fontWeight: 800, flex: 1 },
  aiCardBadge: {
    background: '#f97316', color: '#000', fontSize: 9, fontWeight: 900,
    padding: '2px 6px', borderRadius: 4, letterSpacing: '0.5px',
  },
  aiCardBody: { padding: '16px' },
  aiLine: { fontSize: 13, color: '#a1a1aa', lineHeight: 1.6, marginBottom: 8 },
  aiLineHeader: { color: '#fff', fontWeight: 700, fontSize: 14, marginTop: 12, marginBottom: 4 },
  refreshBtn: {
    width: '100%', background: 'transparent', border: 'none',
    borderTop: '1px solid #2a2a2a', color: '#52525b', padding: '12px',
    fontSize: 12, cursor: 'pointer', fontWeight: 600,
  },
  bottomNav: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#111', borderTop: '1px solid #1f1f1f', display: 'flex', padding: '10px 0',
  },
  navBtn: {
    flex: 1, background: 'transparent', border: 'none', color: '#52525b',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 0',
  },
  navBtnActive: { color: '#f97316' },
};

export default withAuth(LineupOptimizer);

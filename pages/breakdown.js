/**
 * /breakdown — Monday Morning Breakdown
 *
 * AI-generated recap of last week's matchup.
 * Shows: result, score, narrative, top performer, bench bomb, biggest bust, next-week tip.
 * Premium feature — free users see a teaser.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useTrial } from '../lib/useTrial';
import { withAuth } from '../lib/withAuth';
import { useLeague } from '../lib/LeagueContext';

function BreakdownPage() {
  const router = useRouter();
  const { isPremium } = useTrial();
  const { selected, loading: leagueLoading, notConnected } = useLeague();

  const [loading, setLoading]     = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError]         = useState(null);
  const [data, setData]           = useState(null);   // raw matchup data
  const [breakdown, setBreakdown] = useState(null);   // AI result
  const [mounted, setMounted]     = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || leagueLoading) return;
    if (notConnected) { setError('Connect your Yahoo account first.'); setLoading(false); return; }
    if (!selected) return;
    loadData();
  }, [mounted, leagueLoading, selected?.leagueKey]);

  async function loadData() {
    setLoading(true);
    setError(null);
    setData(null);
    setBreakdown(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError('Not logged in.'); return; }

      const auth = { Authorization: `Bearer ${token}` };
      const { leagueKey, teamKey } = selected;

      // Get breakdown data
      const bdRes = await fetch(
        `/api/yahoo/breakdown?team_key=${encodeURIComponent(teamKey)}&league_key=${encodeURIComponent(leagueKey)}`,
        { headers: auth }
      );

      if (bdRes.status === 404) {
        setError('No completed matchup yet. Check back after your first game finishes.');
        return;
      }
      if (!bdRes.ok) {
        const e = await bdRes.json();
        setError(e.error || 'Failed to load matchup data.');
        return;
      }

      const bd = await bdRes.json();
      setData(bd);

      // Auto-run AI for premium users
      if (isPremium) {
        await runAI(bd, token);
      }
    } catch (e) {
      setError('Something went wrong loading your breakdown.');
    } finally {
      setLoading(false);
    }
  }

  async function runAI(bd, tokenOverride) {
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = tokenOverride || session?.access_token;

      const res = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(bd),
      });
      if (!res.ok) return;
      const result = await res.json();
      setBreakdown(result);
    } catch {}
    finally { setAiLoading(false); }
  }

  const [mounted2, setMounted2] = useState(false);
  useEffect(() => setMounted2(true), []);
  if (!mounted2) return null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <button style={S.back} onClick={() => router.push('/dashboard')}>← Back</button>
        <div style={S.headerTitle}>Monday Breakdown</div>
        <div style={{ width: 48 }} />
      </div>

      <div style={S.content}>

        {/* Loading skeleton */}
        {loading && (
          <>
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
            {[1,2,3].map(i => (
              <div key={i} style={{
                height: i === 1 ? 100 : 72, borderRadius: 14, marginBottom: 12,
                background: 'linear-gradient(90deg,#1a1a1a 25%,#242424 50%,#1a1a1a 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
              }} />
            ))}
          </>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={S.errorCard}>
            <div style={S.errorIcon}>📭</div>
            <div style={S.errorText}>{error}</div>
            <button style={S.retryBtn} onClick={loadData}>Try Again</button>
          </div>
        )}

        {/* Matchup result */}
        {!loading && data && (
          <>
            {/* Score header */}
            <div style={{
              ...S.scoreCard,
              background: data.result === 'won' ? '#0a1f0a' : data.result === 'lost' ? '#1a0a0a' : '#111',
              borderColor: data.result === 'won' ? '#22c55e44' : data.result === 'lost' ? '#ef444444' : '#ffffff22',
            }}>
              <div style={{
                ...S.resultBadge,
                background: data.result === 'won' ? '#22c55e' : data.result === 'lost' ? '#ef4444' : '#71717a',
              }}>
                {data.result === 'won' ? 'W' : data.result === 'lost' ? 'L' : 'T'}
              </div>
              <div style={S.weekLabel}>Week {data.week}</div>
              <div style={S.scoreRow}>
                <span style={S.myScore}>{data.myScore?.toFixed(1)}</span>
                <span style={S.scoreDash}>–</span>
                <span style={S.oppScore}>{data.oppScore?.toFixed(1)}</span>
              </div>
              <div style={S.oppName}>vs {data.oppTeamName}</div>
              <div style={S.margin}>
                {data.result === 'won'
                  ? `Won by ${(data.myScore - data.oppScore).toFixed(1)}`
                  : data.result === 'lost'
                    ? `Lost by ${(data.oppScore - data.myScore).toFixed(1)}`
                    : 'Game ended in a tie'}
              </div>
            </div>

            {/* Premium AI section */}
            {isPremium ? (
              <>
                {aiLoading && (
                  <div style={S.aiLoadingCard}>
                    <div style={S.aiSpinner}>🟠</div>
                    <div style={S.aiLoadingText}>Orange is breaking down your game…</div>
                  </div>
                )}

                {!aiLoading && !breakdown && (
                  <button style={S.generateBtn} onClick={() => runAI(data)}>
                    🟠 Generate My Breakdown
                  </button>
                )}

                {breakdown && (
                  <>
                    {/* Headline + narrative */}
                    <div style={S.narrativeCard}>
                      <div style={S.narrativeHeadline}>{breakdown.headline}</div>
                      <div style={S.narrativeText}>{breakdown.narrative}</div>
                    </div>

                    {/* Stat cards */}
                    <div style={S.statGrid}>
                      {breakdown.topPerformer && (
                        <div style={{ ...S.statCard, borderColor: '#22c55e44', background: '#0a1a0a' }}>
                          <div style={S.statEmoji}>🏆</div>
                          <div style={S.statLabel}>Top Performer</div>
                          <div style={S.statName}>{breakdown.topPerformer.name}</div>
                          <div style={{ ...S.statPts, color: '#22c55e' }}>{breakdown.topPerformer.points} pts</div>
                          <div style={S.statNote}>{breakdown.topPerformer.note}</div>
                        </div>
                      )}

                      {breakdown.benchBomb && (
                        <div style={{ ...S.statCard, borderColor: '#f97316aa', background: '#1a0d00' }}>
                          <div style={S.statEmoji}>💣</div>
                          <div style={S.statLabel}>Bench Bomb</div>
                          <div style={S.statName}>{breakdown.benchBomb.name}</div>
                          <div style={{ ...S.statPts, color: '#f97316' }}>{breakdown.benchBomb.points} pts</div>
                          <div style={S.statNote}>{breakdown.benchBomb.note}</div>
                        </div>
                      )}

                      {breakdown.biggestBust && (
                        <div style={{ ...S.statCard, borderColor: '#ef444444', background: '#1a0a0a' }}>
                          <div style={S.statEmoji}>📉</div>
                          <div style={S.statLabel}>Biggest Bust</div>
                          <div style={S.statName}>{breakdown.biggestBust.name}</div>
                          <div style={{ ...S.statPts, color: '#ef4444' }}>{breakdown.biggestBust.points} pts</div>
                          <div style={S.statNote}>{breakdown.biggestBust.note}</div>
                        </div>
                      )}
                    </div>

                    {/* Next week tip */}
                    {breakdown.nextWeekTip && (
                      <div style={S.tipCard}>
                        <div style={S.tipLabel}>⚡ NEXT WEEK</div>
                        <div style={S.tipText}>{breakdown.nextWeekTip}</div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              /* Free tier teaser */
              <div style={S.upgradeCard}>
                <div style={S.upgradeIcon}>🟠</div>
                <div style={S.upgradeTitle}>Full breakdown is premium</div>
                <div style={S.upgradeSub}>
                  See exactly who carried you, who let you down, and which bench player you left sitting that could have changed the game.
                </div>
                <button style={S.upgradeBtn} onClick={() => router.push('/pricing')}>
                  Unlock Breakdown →
                </button>
              </div>
            )}

            {/* Starter box scores — visible to all */}
            <div style={S.rosterSection}>
              <div style={S.rosterTitle}>STARTERS</div>
              {data.starters?.map((p, i) => (
                <div key={i} style={S.playerRow}>
                  <div style={S.playerSlot}>{p.selectedPosition}</div>
                  <div style={S.playerName}>{p.name}</div>
                  <div style={S.playerTeam}>{p.editorialTeam}</div>
                  <div style={{
                    ...S.playerPts,
                    color: p.points >= 15 ? '#22c55e' : p.points >= 8 ? '#d4d4d8' : '#ef4444',
                  }}>{p.points.toFixed(1)}</div>
                </div>
              ))}
            </div>

            <div style={S.rosterSection}>
              <div style={S.rosterTitle}>BENCH</div>
              {data.bench?.map((p, i) => (
                <div key={i} style={{ ...S.playerRow, opacity: 0.6 }}>
                  <div style={S.playerSlot}>BN</div>
                  <div style={S.playerName}>{p.name}</div>
                  <div style={S.playerTeam}>{p.editorialTeam}</div>
                  <div style={S.playerPts}>{p.points.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={S.bottomNav}>
        <button style={S.navBtn} onClick={() => router.push('/draft')}>🎯 Draft</button>
        <button style={S.navBtn} onClick={() => router.push('/lineup')}>📊 Lineup</button>
        <button style={S.navBtn} onClick={() => router.push('/dashboard')}>🏠 Home</button>
        <button style={S.navBtn} onClick={() => router.push('/waiver')}>🔄 Wire</button>
        <button style={S.navBtn} onClick={() => router.push('/trash')}>🔥 Trash</button>
        <button style={{ ...S.navBtn, ...S.navActive }}>📋 Recap</button>
      </div>
    </div>
  );
}

const S = {
  page: {
    background: '#0a0a0a', minHeight: '100vh', color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    paddingBottom: 80,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid #1a1a1a',
  },
  back: { background: 'none', border: 'none', color: '#f97316', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 },
  headerTitle: { fontSize: 17, fontWeight: 700 },
  content: { padding: '16px' },

  // Score card
  scoreCard: {
    borderRadius: 16, border: '1px solid', padding: '20px 16px',
    textAlign: 'center', marginBottom: 16,
  },
  resultBadge: {
    display: 'inline-block', borderRadius: 8, padding: '3px 14px',
    fontSize: 13, fontWeight: 900, color: '#fff', marginBottom: 8,
  },
  weekLabel: { fontSize: 11, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 },
  scoreRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginBottom: 6 },
  myScore: { fontSize: 44, fontWeight: 900, letterSpacing: '-2px' },
  scoreDash: { fontSize: 24, color: '#52525b', fontWeight: 300 },
  oppScore: { fontSize: 44, fontWeight: 900, letterSpacing: '-2px', color: '#71717a' },
  oppName: { fontSize: 14, color: '#71717a', marginBottom: 4 },
  margin: { fontSize: 12, color: '#52525b' },

  // AI loading
  aiLoadingCard: {
    background: '#111', border: '1px solid #1f1f1f', borderRadius: 14,
    padding: 24, textAlign: 'center', marginBottom: 16,
  },
  aiSpinner: { fontSize: 32, marginBottom: 10, animation: 'pulse 1.5s ease-in-out infinite' },
  aiLoadingText: { fontSize: 14, color: '#71717a' },
  generateBtn: {
    width: '100%', background: '#f97316', color: '#111', border: 'none',
    borderRadius: 12, padding: '16px', fontSize: 15, fontWeight: 800,
    cursor: 'pointer', marginBottom: 16,
  },

  // Narrative
  narrativeCard: {
    background: '#111', border: '1px solid #1f1f1f', borderRadius: 14,
    padding: '20px 16px', marginBottom: 14,
  },
  narrativeHeadline: { fontSize: 20, fontWeight: 900, marginBottom: 10, lineHeight: 1.2 },
  narrativeText: { fontSize: 14, color: '#a1a1aa', lineHeight: 1.7 },

  // Stat cards
  statGrid: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 },
  statCard: {
    border: '1px solid', borderRadius: 14, padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
  },
  statEmoji: { fontSize: 22, flexShrink: 0 },
  statLabel: { fontSize: 10, fontWeight: 800, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 },
  statName: { fontSize: 15, fontWeight: 800 },
  statPts: { fontSize: 15, fontWeight: 800, marginLeft: 'auto', flexShrink: 0 },
  statNote: { display: 'none' }, // shown in expanded view if needed

  // Next week tip
  tipCard: {
    background: '#0d0d1a', border: '1px solid #3b3bff33', borderRadius: 14,
    padding: '14px 16px', marginBottom: 16,
  },
  tipLabel: { fontSize: 10, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 },
  tipText: { fontSize: 14, color: '#a1a1aa', lineHeight: 1.6 },

  // Upgrade
  upgradeCard: {
    background: '#111', border: '1px solid #f9731633', borderRadius: 14,
    padding: 24, textAlign: 'center', marginBottom: 16,
  },
  upgradeIcon: { fontSize: 36, marginBottom: 10 },
  upgradeTitle: { fontSize: 18, fontWeight: 800, marginBottom: 8 },
  upgradeSub: { fontSize: 13, color: '#71717a', lineHeight: 1.6, marginBottom: 18 },
  upgradeBtn: {
    background: '#f97316', color: '#111', border: 'none',
    borderRadius: 10, padding: '14px 24px', fontSize: 15, fontWeight: 800, cursor: 'pointer',
  },

  // Roster
  rosterSection: { marginBottom: 14 },
  rosterTitle: {
    fontSize: 10, fontWeight: 800, color: '#52525b',
    textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8,
  },
  playerRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 0', borderBottom: '1px solid #1a1a1a',
  },
  playerSlot: {
    width: 36, fontSize: 10, fontWeight: 800, color: '#52525b',
    textTransform: 'uppercase', flexShrink: 0,
  },
  playerName: { flex: 1, fontSize: 14, fontWeight: 600 },
  playerTeam: { fontSize: 12, color: '#52525b', width: 28, textAlign: 'center' },
  playerPts: { fontSize: 15, fontWeight: 800, width: 44, textAlign: 'right', color: '#d4d4d8' },

  // Error
  errorCard: {
    background: '#111', border: '1px solid #1f1f1f', borderRadius: 14,
    padding: 32, textAlign: 'center',
  },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorText: { fontSize: 14, color: '#71717a', marginBottom: 16, lineHeight: 1.6 },
  retryBtn: {
    background: 'transparent', border: '1px solid #27272a', color: '#a1a1aa',
    borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer',
  },

  // Nav
  bottomNav: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#111', borderTop: '1px solid #1f1f1f',
    display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px',
  },
  navBtn: {
    background: 'none', border: 'none', color: '#52525b',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 8px',
  },
  navActive: { color: '#f97316' },
};

export default withAuth(BreakdownPage);

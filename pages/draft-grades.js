/**
 * /draft-grades — Comparative Draft Report Card
 *
 * Grades your team against ALL other teams in the league.
 * Not ADP-based — purely relative within your league.
 *
 * Premium feature. Free users see a teaser.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useTrial } from '../lib/useTrial';
import { withAuth } from '../lib/withAuth';

// Grade → color
const GRADE_COLOR = {
  'A+': '#00e676', 'A': '#00e676', 'A-': '#69f0ae',
  'B+': '#40c4ff', 'B': '#40c4ff', 'B-': '#80d8ff',
  'C+': '#ffab40', 'C': '#ffab40', 'C-': '#ffd740',
  'D':  '#ff5252',
};

function gradeColor(g) { return GRADE_COLOR[g] || '#aaa'; }

function OrdinalSuffix(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function GradeCircle({ grade, size = 72 }) {
  const color = gradeColor(grade);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `3px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `${color}18`,
    }}>
      <span style={{ color, fontSize: size * 0.35, fontWeight: 800, letterSpacing: -1 }}>
        {grade}
      </span>
    </div>
  );
}

function RankBar({ rank, total, color }) {
  const pct = Math.max(4, Math.round((1 - (rank - 1) / total) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#1e1e2e', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 0.7s ease' }} />
      </div>
      <span style={{ fontSize: 11, color: '#666', minWidth: 40, textAlign: 'right' }}>
        #{rank} of {total}
      </span>
    </div>
  );
}

function DraftGradesPage() {
  const router = useRouter();
  const { isPremium } = useTrial();

  const [loading, setLoading]     = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError]         = useState(null);
  const [rawData, setRawData]     = useState(null);   // from /api/yahoo/draft-grades
  const [report, setReport]       = useState(null);   // from /api/ai/draft-grades
  const [mounted, setMounted]     = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => { if (mounted) loadData(); }, [mounted]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError('Not logged in.'); return; }
      const auth = { Authorization: `Bearer ${token}` };

      // Get teams
      const teamsRes = await fetch('/api/yahoo/myteams', { headers: auth });
      if (teamsRes.status === 404) { setError('Connect your Yahoo account first.'); return; }
      const { teams } = await teamsRes.json();
      if (!teams?.length) { setError('No Yahoo league found.'); return; }

      const { leagueKey, teamKey } = teams[0];

      // Get comparative grades data
      const res = await fetch(
        `/api/yahoo/draft-grades?league_key=${encodeURIComponent(leagueKey)}&team_key=${encodeURIComponent(teamKey)}`,
        { headers: auth }
      );

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        if (e.notDrafted) {
          setError('Draft hasn\'t happened yet. Come back after draft day.');
        } else {
          setError(e.error || 'Failed to load draft grades.');
        }
        return;
      }

      const data = await res.json();
      setRawData(data);

      // Auto-run AI for premium users
      if (isPremium) {
        await runAI(data, token);
      }
    } catch (e) {
      console.error(e);
      setError('Something went wrong loading your draft grades.');
    } finally {
      setLoading(false);
    }
  }

  async function runAI(data, tokenOverride) {
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = tokenOverride || session?.access_token;

      const res = await fetch('/api/ai/draft-grades', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradesData: data }),
      });
      if (!res.ok) return;
      const result = await res.json();
      setReport(result);
    } catch {}
    finally { setAiLoading(false); }
  }

  // Prevent SSR flash
  const [mounted2, setMounted2] = useState(false);
  useEffect(() => setMounted2(true), []);
  if (!mounted2) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <button style={S.back} onClick={() => router.push('/dashboard')}>← Back</button>
        <div style={S.headerTitle}>Draft Report Card</div>
        <div style={{ width: 48 }} />
      </div>

      <div style={S.content}>

        {/* Loading */}
        {loading && (
          <>
            {[140, 200, 90, 90, 90].map((h, i) => (
              <div key={i} style={{
                height: h, borderRadius: 14, marginBottom: 12,
                background: 'linear-gradient(90deg,#1a1a1a 25%,#242424 50%,#1a1a1a 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
              }} />
            ))}
          </>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={S.errorCard}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏈</div>
            <div style={S.errorText}>{error}</div>
            <button style={S.retryBtn} onClick={loadData}>Try Again</button>
          </div>
        )}

        {/* Main content */}
        {!loading && !error && rawData && (
          <>
            {/* Hero grade card */}
            <div style={S.heroCard}>
              <div style={S.heroLeft}>
                <div style={S.heroLabel}>YOUR DRAFT GRADE</div>
                <div style={S.heroTeam}>{rawData.myTeam?.name}</div>
                <div style={S.heroRank}>
                  {OrdinalSuffix(rawData.myTeam?.ranks?.total)} of {rawData.numTeams} teams
                </div>
                <div style={S.heroPts}>
                  {rawData.myTeam?.analysis?.totalProjPts} projected pts
                </div>
              </div>
              <div style={S.heroRight}>
                <GradeCircle
                  grade={report?.overallGrade || '—'}
                  size={88}
                />
                {!report && !aiLoading && (
                  <div style={{ fontSize: 11, color: '#555', marginTop: 6, textAlign: 'center' }}>
                    {isPremium ? 'Generating...' : 'Unlock grade'}
                  </div>
                )}
              </div>
            </div>

            {/* Free teaser / premium gating */}
            {!isPremium && (
              <div style={S.premiumCard}>
                <div style={S.premiumIcon}>🔒</div>
                <div style={S.premiumTitle}>See Your Full Report Card</div>
                <div style={S.premiumSub}>
                  Letter grades for every position group. How you rank vs every team.
                  Trade targets. Bye week alerts.
                </div>
                <button style={S.premiumBtn} onClick={() => router.push('/premium')}>
                  Upgrade to Orange Pro
                </button>
              </div>
            )}

            {/* AI generating spinner */}
            {isPremium && aiLoading && (
              <div style={S.aiCard}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: '2px solid #ff6b1a', borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
                }} />
                <div style={{ color: '#888', fontSize: 13 }}>Grading your team against the league...</div>
              </div>
            )}

            {/* Full report (premium + AI loaded) */}
            {isPremium && report && (
              <div style={{ animation: 'fadeIn 0.4s ease' }}>

                {/* Narrative */}
                {report.narrative && (
                  <div style={S.narrativeCard}>
                    <div style={S.sectionLabel}>📋 DRAFT ANALYSIS</div>
                    <p style={S.narrativeText}>{report.narrative}</p>
                    {report.tradeTargets && (
                      <div style={S.tradeTip}>
                        <span style={{ color: '#ff6b1a', fontWeight: 700 }}>Trade Target: </span>
                        {report.tradeTargets}
                      </div>
                    )}
                  </div>
                )}

                {/* Position grades */}
                <div style={S.sectionLabel}>POSITION GRADES</div>
                <div style={S.positionGrid}>
                  {report.positionGrades?.map(pg => (
                    <div key={pg.key} style={S.posCard}>
                      <div style={S.posLabel}>{pg.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ color: gradeColor(pg.grade), fontWeight: 800, fontSize: 20 }}>
                          {pg.grade}
                        </span>
                        <RankBar rank={pg.rank} total={rawData.numTeams} color={gradeColor(pg.grade)} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Strengths + vulnerabilities */}
                {(report.strengths?.length || report.vulnerabilities?.length) && (
                  <div style={S.swotRow}>
                    {report.strengths?.length > 0 && (
                      <div style={{ ...S.swotCard, borderColor: '#00e67644' }}>
                        <div style={{ ...S.swotLabel, color: '#00e676' }}>✓ STRENGTHS</div>
                        {report.strengths.map((s, i) => (
                          <div key={i} style={S.swotItem}>• {s}</div>
                        ))}
                      </div>
                    )}
                    {report.vulnerabilities?.length > 0 && (
                      <div style={{ ...S.swotCard, borderColor: '#ff525244' }}>
                        <div style={{ ...S.swotLabel, color: '#ff5252' }}>⚠ WATCH OUT</div>
                        {report.vulnerabilities.map((v, i) => (
                          <div key={i} style={S.swotItem}>• {v}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Bye week alert */}
                {report.byeAlert && (
                  <div style={S.byeAlert}>
                    <span style={{ marginRight: 6 }}>📅</span>{report.byeAlert}
                  </div>
                )}

              </div>
            )}

            {/* League table — always visible for premium */}
            {isPremium && rawData.leagueTable?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={S.sectionLabel}>LEAGUE STANDINGS</div>
                <div style={S.tableCard}>
                  {rawData.leagueTable.map(t => (
                    <div key={t.teamKey} style={{
                      ...S.tableRow,
                      background: t.isMyTeam ? '#ff6b1a14' : 'transparent',
                      borderLeft: t.isMyTeam ? '3px solid #ff6b1a' : '3px solid transparent',
                    }}>
                      <span style={{ color: '#555', fontSize: 12, minWidth: 20 }}>{t.overallRank}.</span>
                      <span style={{
                        flex: 1,
                        color: t.isMyTeam ? '#ff6b1a' : '#ccc',
                        fontWeight: t.isMyTeam ? 700 : 400,
                        fontSize: 14,
                      }}>
                        {t.name} {t.isMyTeam ? '← You' : ''}
                      </span>
                      <span style={{ color: '#666', fontSize: 13 }}>{t.totalProjPts} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Re-run button */}
            {isPremium && !aiLoading && (
              <button
                style={S.rerunBtn}
                onClick={() => runAI(rawData, null)}
              >
                Refresh Analysis
              </button>
            )}

          </>
        )}

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh', background: '#0a0a0f',
    color: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    paddingBottom: 32,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid #1a1a2e', position: 'sticky', top: 0,
    background: '#0a0a0f', zIndex: 10,
  },
  back: {
    background: 'none', border: 'none', color: '#ff6b1a', fontSize: 14,
    cursor: 'pointer', padding: '6px 0',
  },
  headerTitle: { fontWeight: 700, fontSize: 16, letterSpacing: 0.2 },
  content: { padding: '16px 16px 0' },

  // Hero card
  heroCard: {
    background: 'linear-gradient(135deg, #0d0d1a 0%, #131326 100%)',
    border: '1px solid #2a2a4a', borderRadius: 16, padding: '20px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroLeft: { flex: 1 },
  heroRight: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  heroLabel: { fontSize: 10, color: '#ff6b1a', fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 },
  heroTeam: { fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 },
  heroRank: { fontSize: 13, color: '#888', marginBottom: 2 },
  heroPts:  { fontSize: 12, color: '#555' },

  // Section label
  sectionLabel: {
    fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: 1.5,
    marginBottom: 8, marginTop: 4,
  },

  // Narrative
  narrativeCard: {
    background: '#0d1117', border: '1px solid #1e2030', borderRadius: 14,
    padding: '16px 16px', marginBottom: 14,
  },
  narrativeText: { fontSize: 14, color: '#ccc', lineHeight: 1.6, margin: '8px 0' },
  tradeTip: {
    background: '#ff6b1a14', borderRadius: 8, padding: '10px 12px',
    fontSize: 13, color: '#ccc', marginTop: 10,
  },

  // Position grid
  positionGrid: { marginBottom: 14 },
  posCard: {
    background: '#0d0d1a', border: '1px solid #1a1a2e', borderRadius: 12,
    padding: '12px 14px', marginBottom: 8,
  },
  posLabel: { fontSize: 11, color: '#666', fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 },

  // SWOT row
  swotRow: { display: 'flex', gap: 10, marginBottom: 14 },
  swotCard: {
    flex: 1, background: '#0d0d1a', border: '1px solid', borderRadius: 12, padding: '12px 12px',
  },
  swotLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 8 },
  swotItem: { fontSize: 13, color: '#aaa', marginBottom: 4, lineHeight: 1.4 },

  // Bye alert
  byeAlert: {
    background: '#ff525214', border: '1px solid #ff525233', borderRadius: 12,
    padding: '12px 14px', fontSize: 13, color: '#ff8a80', marginBottom: 14,
  },

  // League table
  tableCard: {
    background: '#0d0d1a', border: '1px solid #1a1a2e', borderRadius: 12,
    overflow: 'hidden', marginBottom: 14,
  },
  tableRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '11px 14px', borderBottom: '1px solid #111',
  },

  // Premium teaser
  premiumCard: {
    background: 'linear-gradient(135deg,#1a0a00,#0d0d1a)', border: '1px solid #ff6b1a44',
    borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 14,
  },
  premiumIcon:  { fontSize: 32, marginBottom: 8 },
  premiumTitle: { fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 6 },
  premiumSub:   { fontSize: 13, color: '#888', lineHeight: 1.5, marginBottom: 16 },
  premiumBtn: {
    background: '#ff6b1a', color: '#fff', border: 'none', borderRadius: 10,
    padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  },

  // AI loading
  aiCard: {
    background: '#0d0d1a', border: '1px solid #1a1a2e', borderRadius: 14,
    padding: '24px 16px', textAlign: 'center', marginBottom: 14,
  },

  // Re-run btn
  rerunBtn: {
    display: 'block', width: '100%', background: 'none', border: '1px solid #1a1a2e',
    color: '#555', borderRadius: 10, padding: '12px 0', fontSize: 13, cursor: 'pointer',
    marginTop: 8,
  },

  // Error
  errorCard: {
    background: '#0d0d1a', border: '1px solid #1e1e2e', borderRadius: 14,
    padding: '32px 20px', textAlign: 'center',
  },
  errorText: { fontSize: 14, color: '#888', marginBottom: 16, lineHeight: 1.5 },
  retryBtn: {
    background: '#ff6b1a', color: '#fff', border: 'none', borderRadius: 10,
    padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  },
};

export default withAuth(DraftGradesPage);

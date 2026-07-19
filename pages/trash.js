/**
 * pages/trash.js — Trash Talk Table
 * Side-bet challenges with position-group scoring, payment confirmation, and deadbeat board.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withAuth } from '../lib/withAuth';
import { useTrial } from '../lib/useTrial';
import { supabase } from '../lib/supabaseClient';
import { useLeague } from '../lib/LeagueContext';
import LeaguePicker from '../components/LeaguePicker';

const BET_TYPES = [
  { value: 'total_score', label: 'Total Team Score' },
  { value: 'rb_pts',      label: 'RB Points Only' },
  { value: 'wr_pts',      label: 'WR Points Only' },
  { value: 'qb_pts',      label: 'QB Points Only' },
  { value: 'te_pts',      label: 'TE Points Only' },
  { value: 'flex_pts',    label: 'Flex (RB/WR/TE)' },
];

const BET_TYPE_LABEL = Object.fromEntries(BET_TYPES.map(b => [b.value, b.label]));

function PageSkeleton() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 36 }}>🔥</div>
    </div>
  );
}

function TrashTalk() {
  const router = useRouter();
  const { isPremium } = useTrial();
  const [mounted, setMounted] = useState(false);

  // Multi-league context
  const { leagues, selected, setSelected, loading: leagueLoading, notConnected } = useLeague();
  const leagueKey = selected?.leagueKey || '';
  const teamKey   = selected?.teamKey   || '';
  const teamName  = selected?.name      || '';

  const [week,         setWeek]         = useState(null);
  const [leagueTeams,  setLeagueTeams]  = useState([]);

  const [bets,         setBets]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [error,        setError]        = useState('');

  // New bet form
  const [showForm,   setShowForm]   = useState(false);
  const [formOpp,    setFormOpp]    = useState('');
  const [formStake,  setFormStake]  = useState('');
  const [formWeek,   setFormWeek]   = useState('');
  const [formType,   setFormType]   = useState('total_score');
  const [formError,  setFormError]  = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Settle
  const [settling,  setSettling]  = useState(false);
  const [settleMsg, setSettleMsg] = useState('');

  // Confirm payment
  const [confirming, setConfirming] = useState(null); // bet_id being confirmed

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted || leagueLoading) return;
    if (notConnected) { setNeedsConnect(true); setLoading(false); return; }
    if (!selected) return;
    loadData();
  }, [mounted, leagueLoading, selected?.leagueKey]);

  async function getAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  }

  async function loadData() {
    setLoading(true);
    setBets([]);
    setLeagueTeams([]);
    try {
      const headers = await getAuthHeader();
      const { leagueKey: lk, teamKey: tk } = selected;

      const standRes = await fetch(`/api/yahoo/standings?league_key=${encodeURIComponent(lk)}`, { headers });
      if (standRes.ok) {
        const { teams: allTeams } = await standRes.json();
        setLeagueTeams((allTeams || []).filter(t => t.teamKey !== tk));
      }

      const matchRes = await fetch(`/api/yahoo/dashboard?league_key=${encodeURIComponent(lk)}&team_key=${encodeURIComponent(tk)}`, { headers });
      if (matchRes.ok) {
        const dash = await matchRes.json();
        const currentWeek = dash?.matchup?.week;
        if (currentWeek) { setWeek(currentWeek); setFormWeek(String(currentWeek)); }
      }

      const betsRes = await fetch(`/api/trash/bets?league_key=${encodeURIComponent(lk)}`, { headers });
      if (betsRes.ok) {
        const { bets: b } = await betsRes.json();
        setBets(b || []);
      }
    } catch {
      setError('Something went wrong loading your data.');
    } finally {
      setLoading(false);
    }
  }

  async function submitBet() {
    if (!formOpp)         { setFormError('Pick an opponent.');                             return; }
    if (!formWeek)        { setFormError('Enter a week number.');                          return; }
    if (!formStake.trim()){ setFormError('Name your stake — what does the loser owe?');   return; }

    const opp = leagueTeams.find(t => t.teamKey === formOpp);
    if (!opp) { setFormError('Opponent not found.'); return; }

    setFormSaving(true); setFormError('');
    try {
      const headers = { ...(await getAuthHeader()), 'Content-Type': 'application/json' };
      const res = await fetch('/api/trash/bets', {
        method: 'POST', headers,
        body: JSON.stringify({
          league_key: leagueKey, my_team_key: teamKey, my_team_name: teamName,
          opp_team_key: opp.teamKey, opp_team_name: opp.name,
          week: parseInt(formWeek, 10), stake: formStake.trim(), bet_type: formType,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Could not create bet.'); return; }
      setBets(prev => [data.bet, ...prev]);
      setShowForm(false); setFormOpp(''); setFormStake(''); setFormType('total_score');
    } catch {
      setFormError('Network error — try again.');
    } finally {
      setFormSaving(false);
    }
  }

  async function settleBets() {
    if (!week) return;
    setSettling(true); setSettleMsg('');
    try {
      const headers = { ...(await getAuthHeader()), 'Content-Type': 'application/json' };
      const res = await fetch('/api/trash/settle', {
        method: 'POST', headers,
        body: JSON.stringify({ league_key: leagueKey, week }),
      });
      const data = await res.json();
      if (!res.ok) { setSettleMsg(`Error: ${data.error || 'Could not settle.'}`); return; }
      if (data.resolved > 0) {
        setBets(prev => prev.map(b => data.bets.find(u => u.id === b.id) || b));
        setSettleMsg(`✅ Settled ${data.resolved} bet${data.resolved !== 1 ? 's' : ''}!`);
      } else {
        setSettleMsg("Scores aren't final yet — check back after the games.");
      }
    } catch {
      setSettleMsg('Could not reach Yahoo. Try again.');
    } finally {
      setSettling(false);
    }
  }

  async function confirmPayment(betId, action) {
    setConfirming(betId);
    try {
      const headers = { ...(await getAuthHeader()), 'Content-Type': 'application/json' };
      const res = await fetch('/api/trash/confirm', {
        method: 'POST', headers,
        body: JSON.stringify({ bet_id: betId, action }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Could not update bet.'); return; }
      setBets(prev => prev.map(b => b.id === betId ? data.bet : b));
    } catch {
      alert('Network error — try again.');
    } finally {
      setConfirming(null);
    }
  }

  if (!mounted || loading) return <PageSkeleton />;

  const won     = bets.filter(b => b.status === 'won').length;
  const lost    = bets.filter(b => b.status === 'lost').length;
  const tied    = bets.filter(b => b.status === 'tied').length;
  const pending = bets.filter(b => b.status === 'pending').length;

  // Deadbeats: opponents flagged as deadbeat across all bets
  const deadbeats = bets
    .filter(b => b.payment_status === 'deadbeat')
    .reduce((acc, b) => {
      if (!acc[b.opp_team_key]) acc[b.opp_team_key] = { name: b.opp_team_name, count: 0 };
      acc[b.opp_team_key].count++;
      return acc;
    }, {});
  const deadbeatList = Object.values(deadbeats).sort((a, b) => b.count - a.count);

  const statusColor = { won: '#22c55e', lost: '#ef4444', tied: '#a1a1aa', pending: '#f97316' };
  const statusLabel = { won: '✅ Won', lost: '💀 Lost', tied: '🤝 Tied', pending: '⏳ Live' };
  const payColor    = { paid: '#22c55e', deadbeat: '#ef4444', pending_payment: '#f97316', 'n/a': 'transparent' };

  return (
    <div style={s.page}>

      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.push('/dashboard')}>← Back</button>
        <div style={s.headerTitle}>🔥 Trash Talk Table</div>
        <div style={{ minWidth: 60, display: 'flex', justifyContent: 'flex-end' }}>
          <LeaguePicker leagues={leagues} selected={selected} onSelect={setSelected} />
        </div>
      </div>

      {needsConnect && (
        <div style={s.connectBanner}>
          🔗 Connect your Yahoo account first.{' '}
          <span style={s.connectLink} onClick={() => router.push('/connect')}>Connect →</span>
        </div>
      )}
      {error && <div style={s.errorBanner}>{error}</div>}

      {!needsConnect && !error && (
        <>
          {/* Scoreboard */}
          <div style={s.scoreboard}>
            <ScoreChip label="Wins"    value={won}     color="#22c55e" />
            <ScoreChip label="Losses"  value={lost}    color="#ef4444" />
            <ScoreChip label="Tied"    value={tied}    color="#71717a" />
            <ScoreChip label="Pending" value={pending} color="#f97316" />
          </div>

          {/* Actions */}
          <div style={s.actionsRow}>
            <button style={s.newBetBtn} onClick={() => setShowForm(v => !v)}>
              {showForm ? '✕ Cancel' : '+ New Bet'}
            </button>
            {pending > 0 && (
              <button style={s.settleBtn} onClick={settleBets} disabled={settling}>
                {settling ? 'Settling…' : '⚡ Settle Bets'}
              </button>
            )}
          </div>

          {settleMsg && <div style={s.settleMsg}>{settleMsg}</div>}

          {/* New Bet Form */}
          {showForm && (
            <div style={s.form}>
              <div style={s.formTitle}>New Bet — Week {formWeek}</div>

              <label style={s.label}>Opponent</label>
              {leagueTeams.length === 0
                ? <div style={{ color: '#52525b', fontSize: 13 }}>Loading league…</div>
                : (
                  <select style={s.select} value={formOpp} onChange={e => setFormOpp(e.target.value)}>
                    <option value="">Pick a team…</option>
                    {leagueTeams.map(t => <option key={t.teamKey} value={t.teamKey}>{t.name}</option>)}
                  </select>
                )
              }

              <label style={s.label}>Bet Type</label>
              <select style={s.select} value={formType} onChange={e => setFormType(e.target.value)}>
                {BET_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>

              <label style={s.label}>Week</label>
              <input
                style={s.input} type="number" min="1" max="18"
                value={formWeek} onChange={e => setFormWeek(e.target.value)}
                placeholder="Week number"
              />

              <label style={s.label}>Stake — what does the loser owe?</label>
              <input
                style={s.input} type="text"
                value={formStake} onChange={e => setFormStake(e.target.value)}
                placeholder="buys lunch · posts on IG · bragging rights…"
                maxLength={120}
              />

              {formError && <div style={s.formError}>{formError}</div>}

              <button style={s.submitBtn} onClick={submitBet} disabled={formSaving}>
                {formSaving ? 'Creating…' : '🔥 Lock It In'}
              </button>
            </div>
          )}

          {/* Bets List */}
          {bets.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🤐</div>
              <div style={s.emptyTitle}>No bets yet</div>
              <div style={s.emptySub}>Hit "+ New Bet" to start some trash talk.</div>
            </div>
          ) : (
            <div style={s.betList}>
              {bets.map(bet => (
                <div key={bet.id} style={{ ...s.betCard, borderColor: statusColor[bet.status] + '44' }}>
                  <div style={s.betTop}>
                    <div style={s.betTeams}>
                      <span style={s.myTeam}>{bet.my_team_name}</span>
                      <span style={s.vs}>vs</span>
                      <span style={s.oppTeam}>{bet.opp_team_name}</span>
                    </div>
                    <div style={{ ...s.betStatus, color: statusColor[bet.status] }}>
                      {statusLabel[bet.status]}
                    </div>
                  </div>

                  <div style={s.betMeta}>
                    <span style={s.metaChip}>Week {bet.week}</span>
                    <span style={s.metaChip}>{BET_TYPE_LABEL[bet.bet_type] || bet.bet_type}</span>
                    {bet.my_pts !== null && bet.opp_pts !== null && (
                      <span style={s.metaChip}>
                        {Number(bet.my_pts).toFixed(1)} – {Number(bet.opp_pts).toFixed(1)}
                      </span>
                    )}
                  </div>

                  <div style={s.betStake}>
                    🎯 Stake: <span style={s.stakeText}>{bet.stake}</span>
                  </div>

                  {/* Payment status badge */}
                  {bet.payment_status !== 'n/a' && (
                    <div style={{ ...s.payBadge, background: payColor[bet.payment_status] + '22', color: payColor[bet.payment_status] }}>
                      {bet.payment_status === 'pending_payment' && '💰 Waiting on payment'}
                      {bet.payment_status === 'paid'            && '✅ Paid up'}
                      {bet.payment_status === 'deadbeat'        && '💀 DEADBEAT — not paid'}
                    </div>
                  )}

                  {/* Winner confirmation buttons */}
                  {bet.status === 'won' && bet.payment_status === 'pending_payment' && (
                    <div style={s.confirmRow}>
                      <button
                        style={s.paidBtn}
                        onClick={() => confirmPayment(bet.id, 'paid')}
                        disabled={confirming === bet.id}
                      >
                        {confirming === bet.id ? '…' : '✅ They Paid'}
                      </button>
                      <button
                        style={s.deadbeatBtn}
                        onClick={() => confirmPayment(bet.id, 'deadbeat')}
                        disabled={confirming === bet.id}
                      >
                        {confirming === bet.id ? '…' : '💀 Deadbeat'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Deadbeat Board */}
          {deadbeatList.length > 0 && (
            <div style={s.deadbeatBoard}>
              <div style={s.deadbeatTitle}>💀 League Deadbeat Board</div>
              <div style={s.deadbeatSub}>Teams that haven't paid their debts</div>
              {deadbeatList.map(d => (
                <div key={d.name} style={s.deadbeatRow}>
                  <span style={s.deadbeatName}>{d.name}</span>
                  <span style={s.deadbeatCount}>{d.count} unpaid bet{d.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style jsx>{`
        select option { background: #1a1a1a; color: #fff; }
        input::placeholder { color: #3f3f46; }
      `}</style>
    </div>
  );
}

function ScoreChip({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#52525b', fontWeight: 600, marginTop: 2 }}>{label.toUpperCase()}</div>
    </div>
  );
}

const s = {
  page:         { background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: 60 },
  header:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px', borderBottom: '1px solid #1f1f1f' },
  headerTitle:  { fontSize: 17, fontWeight: 800 },
  backBtn:      { background: 'none', border: 'none', color: '#f97316', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: 0, width: 60 },
  connectBanner:{ margin: '16px', padding: '14px 16px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 12, fontSize: 14, color: '#f97316' },
  connectLink:  { fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' },
  errorBanner:  { margin: '16px', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, fontSize: 14, color: '#ef4444' },
  scoreboard:   { display: 'flex', justifyContent: 'space-around', padding: '20px 16px', background: '#111', margin: '16px', borderRadius: 16, border: '1px solid #1f1f1f' },
  actionsRow:   { display: 'flex', gap: 10, padding: '0 16px 12px' },
  newBetBtn:    { flex: 1, background: '#f97316', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 20px', fontSize: 15, fontWeight: 800, cursor: 'pointer' },
  settleBtn:    { flex: 1, background: 'transparent', color: '#f97316', border: '1.5px solid #f97316', borderRadius: 12, padding: '13px 20px', fontSize: 15, fontWeight: 800, cursor: 'pointer' },
  settleMsg:    { margin: '0 16px 12px', padding: '10px 14px', background: 'rgba(249,115,22,0.06)', border: '1px solid #2a2a2a', borderRadius: 10, fontSize: 13, color: '#a1a1aa' },
  form:         { margin: '0 16px 20px', padding: '20px', background: '#111', border: '1px solid #1f1f1f', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  formTitle:    { fontSize: 15, fontWeight: 800, marginBottom: 4 },
  label:        { fontSize: 12, color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: -4 },
  select:       { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, color: '#fff', padding: '12px 14px', fontSize: 14, width: '100%', appearance: 'none', cursor: 'pointer' },
  input:        { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, color: '#fff', padding: '12px 14px', fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none' },
  formError:    { color: '#ef4444', fontSize: 13, padding: '8px 12px', background: 'rgba(239,68,68,0.06)', borderRadius: 8 },
  submitBtn:    { background: '#f97316', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 4 },
  empty:        { textAlign: 'center', padding: '60px 20px' },
  emptyTitle:   { fontSize: 18, fontWeight: 700, color: '#3f3f46', marginBottom: 8 },
  emptySub:     { fontSize: 14, color: '#3f3f46' },
  betList:      { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 },
  betCard:      { background: '#111', border: '1px solid', borderRadius: 14, padding: '16px' },
  betTop:       { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  betTeams:     { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 },
  myTeam:       { fontWeight: 700, fontSize: 14 },
  vs:           { fontSize: 11, color: '#52525b', fontWeight: 600 },
  oppTeam:      { fontWeight: 700, fontSize: 14, color: '#a1a1aa' },
  betStatus:    { fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' },
  betMeta:      { display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  metaChip:     { fontSize: 11, color: '#71717a', background: '#1a1a1a', padding: '3px 8px', borderRadius: 6, fontWeight: 600 },
  betStake:     { fontSize: 13, color: '#71717a' },
  stakeText:    { color: '#f97316', fontWeight: 700 },
  payBadge:     { marginTop: 10, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 },
  confirmRow:   { display: 'flex', gap: 8, marginTop: 12 },
  paidBtn:      { flex: 1, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 800, cursor: 'pointer' },
  deadbeatBtn:  { flex: 1, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 800, cursor: 'pointer' },
  deadbeatBoard:{ margin: '24px 16px 0', padding: '20px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16 },
  deadbeatTitle:{ fontSize: 15, fontWeight: 800, color: '#ef4444', marginBottom: 4 },
  deadbeatSub:  { fontSize: 12, color: '#71717a', marginBottom: 14 },
  deadbeatRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(239,68,68,0.1)' },
  deadbeatName: { fontWeight: 700, fontSize: 14 },
  deadbeatCount:{ fontSize: 12, color: '#ef4444', fontWeight: 700 },
};

export default withAuth(TrashTalk);

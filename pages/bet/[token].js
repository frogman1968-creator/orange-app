/**
 * pages/bet/[token].js — Public shareable bet challenge page
 *
 * No login required. Anyone with the link can view the bet.
 * Shows the challenge details + CTA to get Orange.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const STATUS_CONFIG = {
  pending: { label: '⏳ Live — Awaiting Result',   color: '#f97316', bg: '#1a0a00' },
  won:     { label: '✅ Challenger Won',             color: '#22c55e', bg: '#0d1a0d' },
  lost:    { label: '💀 Challenger Lost',            color: '#ef4444', bg: '#1a0000' },
  tied:    { label: '🤝 Tied',                       color: '#a1a1aa', bg: '#111' },
};

const PAY_CONFIG = {
  paid:            { label: '✅ Paid up',    color: '#22c55e' },
  deadbeat:        { label: '💀 DEADBEAT',  color: '#ef4444' },
  pending_payment: { label: '💰 Owes up',   color: '#f97316' },
  'n/a':           { label: '',             color: 'transparent' },
};

export default function BetChallengePage() {
  const router   = useRouter();
  const { token } = router.query;

  const [bet, setBet]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const res = await fetch(`/api/trash/share?token=${encodeURIComponent(token)}`);
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) { setNotFound(true); return; }
        const data = await res.json();
        setBet(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const statusCfg = bet ? (STATUS_CONFIG[bet.status] || STATUS_CONFIG.pending) : null;
  const payCfg    = bet ? (PAY_CONFIG[bet.paymentStatus] || PAY_CONFIG['n/a']) : null;

  return (
    <>
      <Head>
        <title>{bet ? `${bet.challenger} challenged ${bet.opponent} — Orange` : 'Bet Challenge — Orange'}</title>
        <meta name="description" content={bet ? `Week ${bet.week} · ${bet.stake} · ${bet.betType}` : 'Fantasy football bet challenge on Orange'} />
        <meta property="og:title" content={bet ? `🔥 ${bet.challenger} is calling out ${bet.opponent}` : 'Bet Challenge'} />
        <meta property="og:description" content={bet ? `Week ${bet.week} side bet: ${bet.stake}` : ''} />
        <meta name="theme-color" content="#f97316" />
      </Head>

      <div style={S.page}>
        {/* Orange top bar */}
        <div style={S.topBar}>
          <span style={S.topBarLogo}>🟠</span>
          <span style={S.topBarName}>Orange</span>
          <span style={S.topBarTag}>Fantasy Football</span>
        </div>

        {loading && (
          <div style={S.center}>
            <div style={S.spinner} />
            <div style={S.loadingText}>Loading bet...</div>
          </div>
        )}

        {notFound && (
          <div style={S.center}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤷</div>
            <div style={S.notFoundTitle}>Bet not found</div>
            <div style={S.notFoundSub}>This link may have expired or been removed.</div>
            <button style={S.ctaBtn} onClick={() => window.location.href = 'https://orangeff.app'}>
              Go to Orange →
            </button>
          </div>
        )}

        {!loading && bet && (
          <div style={S.content}>
            {/* Challenge header */}
            <div style={S.challengeHeader}>
              <div style={S.fireEmoji}>🔥</div>
              <div style={S.challengeTitle}>Trash Talk Challenge</div>
              <div style={S.challengeSub}>Week {bet.week} Side Bet</div>
            </div>

            {/* Teams */}
            <div style={S.teamsCard}>
              <div style={S.teamBlock}>
                <div style={S.teamRole}>CHALLENGER</div>
                <div style={S.teamName}>{bet.challenger}</div>
              </div>
              <div style={S.vsBlock}>VS</div>
              <div style={S.teamBlock}>
                <div style={S.teamRole}>OPPONENT</div>
                <div style={S.teamName}>{bet.opponent}</div>
              </div>
            </div>

            {/* Bet details */}
            <div style={S.detailsCard}>
              <div style={S.detailRow}>
                <span style={S.detailLabel}>STAKE</span>
                <span style={S.detailValue}>{bet.stake}</span>
              </div>
              <div style={S.divider} />
              <div style={S.detailRow}>
                <span style={S.detailLabel}>BET TYPE</span>
                <span style={S.detailValue}>{bet.betType}</span>
              </div>
              <div style={S.divider} />
              <div style={S.detailRow}>
                <span style={S.detailLabel}>WEEK</span>
                <span style={S.detailValue}>{bet.week}</span>
              </div>
            </div>

            {/* Status */}
            <div style={{ ...S.statusCard, background: statusCfg.bg, borderColor: statusCfg.color + '44' }}>
              <div style={{ ...S.statusLabel, color: statusCfg.color }}>
                {statusCfg.label}
              </div>
              {payCfg?.label && (
                <div style={{ ...S.payLabel, color: payCfg.color }}>
                  {payCfg.label}
                </div>
              )}
            </div>

            {/* Share this link */}
            <button style={S.shareBtn} onClick={copyLink}>
              {copied ? '✅ Link Copied!' : '📋 Copy Challenge Link'}
            </button>

            {/* CTA */}
            <div style={S.ctaCard}>
              <div style={S.ctaEmoji}>🟠</div>
              <div style={S.ctaTitle}>Want to run your own bets?</div>
              <div style={S.ctaSub}>
                Orange gives every fantasy manager AI-powered draft picks, lineup advice, and the Trash Talk Table — all connected to your Yahoo league.
              </div>
              <button
                style={S.ctaBtn}
                onClick={() => window.location.href = 'https://orangeff.app/signup'}
              >
                Try Orange Free for 14 Days →
              </button>
              <div style={S.ctaNote}>No credit card required</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  topBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '14px 20px',
    borderBottom: '1px solid #1a1a1a',
    background: '#0d0d0d',
  },
  topBarLogo: { fontSize: 22 },
  topBarName: { fontSize: 16, fontWeight: 900, color: '#fff' },
  topBarTag:  { fontSize: 11, color: '#555', marginLeft: 4 },

  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '70vh', padding: 24, textAlign: 'center',
  },
  spinner: {
    width: 32, height: 32,
    border: '3px solid #222', borderTopColor: '#f97316',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    marginBottom: 16,
  },
  loadingText: { fontSize: 13, color: '#555' },
  notFoundTitle: { fontSize: 22, fontWeight: 800, marginBottom: 8 },
  notFoundSub:   { fontSize: 14, color: '#555', marginBottom: 24 },

  content: { padding: '24px 20px', maxWidth: 480, margin: '0 auto' },

  challengeHeader: { textAlign: 'center', marginBottom: 24 },
  fireEmoji:       { fontSize: 48, marginBottom: 8 },
  challengeTitle:  { fontSize: 24, fontWeight: 900, marginBottom: 4 },
  challengeSub:    { fontSize: 13, color: '#f97316', fontWeight: 700 },

  teamsCard: {
    display: 'flex', alignItems: 'center',
    background: '#111', border: '1px solid #1a1a1a', borderRadius: 14,
    padding: '20px 16px', marginBottom: 16,
  },
  teamBlock: { flex: 1, textAlign: 'center' },
  teamRole:  { fontSize: 9, color: '#555', fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 },
  teamName:  { fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.3 },
  vsBlock:   { fontSize: 13, fontWeight: 900, color: '#333', padding: '0 12px' },

  detailsCard: {
    background: '#111', border: '1px solid #1a1a1a', borderRadius: 14,
    padding: '4px 16px', marginBottom: 16,
  },
  detailRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0',
  },
  detailLabel: { fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: 1 },
  detailValue: { fontSize: 14, fontWeight: 700, color: '#fff' },
  divider:     { height: 1, background: '#1a1a1a' },

  statusCard: {
    border: '1px solid', borderRadius: 12,
    padding: '12px 16px', textAlign: 'center', marginBottom: 16,
  },
  statusLabel: { fontSize: 13, fontWeight: 800 },
  payLabel:    { fontSize: 11, fontWeight: 700, marginTop: 4 },

  shareBtn: {
    width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a',
    borderRadius: 12, padding: '12px', color: '#fff', fontSize: 14,
    fontWeight: 700, cursor: 'pointer', marginBottom: 24,
  },

  ctaCard: {
    background: '#0d0a00', border: '1px solid #f9731622',
    borderRadius: 16, padding: '24px 20px', textAlign: 'center',
  },
  ctaEmoji: { fontSize: 36, marginBottom: 12 },
  ctaTitle: { fontSize: 18, fontWeight: 900, marginBottom: 8 },
  ctaSub:   { fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 20 },
  ctaBtn: {
    width: '100%', background: '#f97316', color: '#000',
    border: 'none', borderRadius: 12, padding: '14px',
    fontSize: 15, fontWeight: 800, cursor: 'pointer', marginBottom: 8,
  },
  ctaNote: { fontSize: 11, color: '#555' },
};

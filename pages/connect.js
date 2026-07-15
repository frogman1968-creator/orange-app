/**
 * Yahoo Fantasy OAuth Connection Page
 *
 * This page handles the Yahoo OAuth flow.
 * Currently shows a "pending approval" state since Yahoo API
 * approval is still in progress.
 *
 * When Yahoo approves:
 * 1. Set NEXT_PUBLIC_YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET in Vercel
 * 2. The "Connect Yahoo" button will start the OAuth flow via /api/auth/yahoo
 * 3. Yahoo redirects back to /api/auth/yahoo/callback
 * 4. Callback stores tokens in Supabase and redirects to /dashboard
 */

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Connect() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (router.query.error) setError('Yahoo authorization was cancelled or failed. Try again.');
    if (router.query.connected === 'true') setConnected(true);
  }, [router.query]);

  async function startYahooAuth() {
    // Pass the Supabase access token via state so the callback links accounts
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    window.location.href = `/api/auth/yahoo?token=${encodeURIComponent(token)}`;
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => router.push('/dashboard')}>← Back</button>
        <div style={styles.headerTitle}>Connect League</div>
        <div style={{ width: 48 }} />
      </div>

      <div style={styles.content}>

        {/* Success state */}
        {connected && (
          <div style={styles.successCard}>
            <div style={styles.successIcon}>✅</div>
            <div style={styles.successTitle}>Yahoo connected!</div>
            <div style={styles.successSub}>Your Yahoo league is now live in Orange.</div>
            <button style={styles.primaryBtn} onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={styles.errorCard}>
            <div style={styles.errorText}>⚠️ {error}</div>
          </div>
        )}

        {/* Main connect UI */}
        {!connected && (
          <>
            <div style={styles.logoWrap}>
              <div style={styles.orangeLogo}>🟠</div>
              <div style={styles.plus}>+</div>
              <div style={styles.yahooLogo}>Y!</div>
            </div>

            <div style={styles.title}>Connect Yahoo Fantasy</div>
            <div style={styles.sub}>
              Orange pulls your real roster, matchups, waiver wire, and standings directly from Yahoo — no manual entry.
            </div>

            <button style={styles.yahooBtn} onClick={startYahooAuth}>
              <span style={styles.yahooBtnY}>Y!</span>
              Connect with Yahoo Fantasy
            </button>

            {/* What gets connected */}
            <div style={styles.featuresSection}>
              <div style={styles.featuresTitle}>What Orange will access</div>
              {[
                { icon: '📋', label: 'Your full roster — starters and bench' },
                { icon: '⚔️', label: 'Weekly matchup and live scoring' },
                { icon: '📊', label: 'League standings' },
                { icon: '🔔', label: 'Waiver wire and free agents' },
                { icon: '📅', label: 'Full season schedule' },
              ].map((f, i) => (
                <div key={i} style={styles.featureRow}>
                  <span style={styles.featureIcon}>{f.icon}</span>
                  <span style={styles.featureLabel}>{f.label}</span>
                </div>
              ))}
            </div>

            <div style={styles.privacyNote}>
              Orange only reads your fantasy data. It never posts, makes transactions, or modifies your league.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: '#0a0a0a', minHeight: '100vh', color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
  content: { padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 },
  orangeLogo: { fontSize: 48 },
  plus: { fontSize: 24, color: '#52525b', fontWeight: 300 },
  yahooLogo: {
    width: 56, height: 56, borderRadius: 14, background: '#6001D2',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, fontWeight: 900, color: '#fff',
  },
  title: { fontSize: 24, fontWeight: 800, marginBottom: 12, textAlign: 'center' },
  sub: { fontSize: 14, color: '#a1a1aa', textAlign: 'center', lineHeight: 1.6, marginBottom: 28, maxWidth: 320 },
  pendingCard: {
    background: '#111', border: '1px solid #27272a', borderRadius: 14,
    padding: 20, marginBottom: 28, width: '100%', maxWidth: 360, textAlign: 'center',
  },
  pendingIcon: { fontSize: 32, marginBottom: 10 },
  pendingTitle: { fontSize: 16, fontWeight: 800, marginBottom: 8 },
  pendingBody: { fontSize: 13, color: '#a1a1aa', lineHeight: 1.6, marginBottom: 12 },
  pendingMeta: { fontSize: 11, color: '#52525b', fontWeight: 600 },
  yahooBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    background: '#6001D2', border: 'none', borderRadius: 12,
    padding: '16px 24px', width: '100%', maxWidth: 360,
    fontSize: 16, fontWeight: 700, color: '#fff', cursor: 'pointer', marginBottom: 28,
  },
  yahooBtnY: { fontWeight: 900, fontSize: 20 },
  featuresSection: { width: '100%', maxWidth: 360, marginBottom: 20 },
  featuresTitle: { fontSize: 11, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 },
  featureRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  featureIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  featureLabel: { fontSize: 14, color: '#d4d4d8' },
  privacyNote: { fontSize: 11, color: '#3f3f46', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 },
  successCard: {
    background: '#0d1f0d', border: '1px solid #22c55e33', borderRadius: 14,
    padding: 28, textAlign: 'center', width: '100%', maxWidth: 360,
  },
  successIcon: { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 22, fontWeight: 800, color: '#22c55e', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#a1a1aa', marginBottom: 20 },
  errorCard: {
    background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: 10,
    padding: '12px 16px', marginBottom: 16, width: '100%', maxWidth: 360,
  },
  errorText: { fontSize: 13, color: '#f87171' },
  primaryBtn: {
    background: '#22c55e', color: '#000', border: 'none',
    borderRadius: 10, padding: '14px 24px', fontSize: 15, fontWeight: 800, cursor: 'pointer',
  },
};

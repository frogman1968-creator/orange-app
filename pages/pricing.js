import { useRouter } from 'next/router';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Pricing() {
  const router = useRouter();
  const [loading, setLoading] = useState(null);
  const { expired } = router.query;

  async function handleCheckout(plan) {
    setLoading(plan);
    try {
      // Pass auth token so checkout can link subscription to Supabase user
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.push('/dashboard')}>←</button>
        <span style={styles.logo}>🟠</span>
        <span style={styles.headerTitle}>Orange</span>
      </div>

      <div style={styles.content}>

        {expired && (
          <div style={styles.expiredBanner}>
            ⏰ Your free trial has ended — pick a plan to keep winning.
          </div>
        )}

        <div style={styles.heroText}>
          <div style={styles.headline}>Less than a coffee.</div>
          <div style={styles.subline}>Win your league all season long.</div>
        </div>

        {/* Feature List */}
        <div style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <div key={i} style={styles.featureRow}>
              <span style={styles.featureCheck}>✓</span>
              <span style={styles.featureText}>{f}</span>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div style={styles.plans}>

          {/* Season Pass — featured */}
          <div style={styles.planCardFeatured}>
            <div style={styles.bestValueBadge}>BEST VALUE</div>
            <div style={styles.planName}>Season Pass</div>
            <div style={styles.planPrice}>$24.99</div>
            <div style={styles.planPeriod}>one-time · draft through playoffs</div>
            <div style={styles.planPerWeek}>Less than $1/week</div>
            <button
              style={styles.planBtnFeatured}
              onClick={() => handleCheckout('season')}
              disabled={loading === 'season'}
            >
              {loading === 'season' ? 'Loading...' : 'Get Season Pass →'}
            </button>
          </div>

          {/* Monthly */}
          <div style={styles.planCard}>
            <div style={styles.planName}>Monthly</div>
            <div style={styles.planPrice}>$4.99</div>
            <div style={styles.planPeriod}>per month · cancel anytime</div>
            <button
              style={styles.planBtn}
              onClick={() => handleCheckout('monthly')}
              disabled={loading === 'monthly'}
            >
              {loading === 'monthly' ? 'Loading...' : 'Start Monthly →'}
            </button>
          </div>

        </div>

        <div style={styles.guarantee}>
          🔒 Secure checkout via Stripe · Cancel anytime · No hidden fees
        </div>

        <button style={styles.skipBtn} onClick={() => router.push('/dashboard')}>
          Continue with free features
        </button>

      </div>
    </div>
  );
}

const FEATURES = [
  'Roster-aware draft with survival odds',
  'Opponent-aware start/sit recommendations',
  'Expert consensus + Vegas game totals',
  'Multi-week lineup previews',
  'Bye week alerts — never get caught again',
  'Orange Suggests — real-time draft pattern tips',
  'Matchup grades A–F for every player',
  'No ads. No lag. No garbage.',
];

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f0f0f',
    color: '#fff',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 16px', borderBottom: '1px solid #1f1f1f', background: '#111',
  },
  backBtn: {
    background: 'transparent', border: '1px solid #2a2a2a',
    color: '#71717a', borderRadius: 6, padding: '4px 10px', fontSize: 16, cursor: 'pointer',
  },
  logo: { fontSize: 20 },
  headerTitle: { fontSize: 17, fontWeight: 700 },
  content: { padding: '24px 20px', maxWidth: 480, margin: '0 auto' },
  expiredBanner: {
    background: '#1a1200', border: '1px solid #f97316',
    borderRadius: 10, padding: '12px 16px',
    color: '#fbbf24', fontSize: 13, fontWeight: 600,
    textAlign: 'center', marginBottom: 24,
  },
  heroText: { textAlign: 'center', marginBottom: 24 },
  headline: { fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px' },
  subline: { fontSize: 16, color: '#71717a', marginTop: 6 },
  featureList: {
    background: '#141414', border: '1px solid #1f1f1f',
    borderRadius: 12, padding: '16px', marginBottom: 24,
  },
  featureRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' },
  featureCheck: { color: '#f97316', fontWeight: 800, fontSize: 14, flexShrink: 0 },
  featureText: { fontSize: 13, color: '#a1a1aa' },
  plans: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 },
  planCardFeatured: {
    background: '#1a1200', border: '2px solid #f97316',
    borderRadius: 14, padding: '20px', position: 'relative',
  },
  planCard: {
    background: '#141414', border: '1px solid #2a2a2a',
    borderRadius: 14, padding: '20px',
  },
  bestValueBadge: {
    position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
    background: '#f97316', color: '#fff',
    fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 20,
    letterSpacing: '0.5px',
  },
  planName: { fontSize: 16, fontWeight: 800, marginBottom: 6 },
  planPrice: { fontSize: 36, fontWeight: 800, color: '#f97316', letterSpacing: '-1px' },
  planPeriod: { fontSize: 12, color: '#71717a', marginTop: 2, marginBottom: 4 },
  planPerWeek: { fontSize: 12, color: '#22c55e', fontWeight: 600, marginBottom: 16 },
  planBtnFeatured: {
    width: '100%', background: '#f97316', color: '#fff', border: 'none',
    borderRadius: 10, padding: '14px 0', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', marginTop: 8,
  },
  planBtn: {
    width: '100%', background: '#1f1f1f', color: '#fff',
    border: '1px solid #2a2a2a', borderRadius: 10, padding: '14px 0',
    fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 12,
  },
  guarantee: {
    fontSize: 12, color: '#3f3f46', textAlign: 'center', marginBottom: 16,
  },
  skipBtn: {
    width: '100%', background: 'transparent', border: 'none',
    color: '#3f3f46', fontSize: 13, cursor: 'pointer', padding: '8px 0',
  },
};

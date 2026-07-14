import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // If already logged in, skip the landing page and go straight to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard');
      } else {
        setChecking(false);
      }
    });
  }, []);

  if (checking) {
    return (
      <div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 36 }}>🟠</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.logoWrap}>
          <div style={styles.logoCircle}>🟠</div>
          <span style={styles.logoText}>Orange</span>
        </div>

        <h1 style={styles.headline}>
          Your Fantasy Football<br />
          <span style={styles.accent}>Companion.</span>
        </h1>

        <p style={styles.sub}>
          Roster-aware draft picks. Opponent-aware lineups.<br />
          No lag. No ads. No garbage.
        </p>

        <div style={styles.features}>
          {FEATURES.map(f => (
            <div key={f.title} style={styles.featureCard}>
              <span style={styles.featureIcon}>{f.icon}</span>
              <div>
                <div style={styles.featureTitle}>{f.title}</div>
                <div style={styles.featureSub}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/signup')}
          style={styles.ctaButton}
        >
          Get Started Free →
        </button>

        <p style={styles.signin}>
          Already have an account?{' '}
          <span style={styles.signinLink} onClick={() => router.push('/login')}>Sign in</span>
        </p>

        <p style={styles.disclaimer}>14-day free trial · No credit card required</p>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: '🎯',
    title: 'Roster-Aware Draft',
    desc: 'See the players you actually need — not a wall of 300 names.',
  },
  {
    icon: '📊',
    title: 'Live ADP Rankings',
    desc: 'Rankings update with injuries & news. No stale queues.',
  },
  {
    icon: '⚔️',
    title: 'Opponent-Aware Lineups',
    desc: 'Start/sit picks tuned to beat your specific opponent this week.',
  },
  {
    icon: '🚨',
    title: 'Orange Alerts',
    desc: 'Injury flags and waiver wire moves when it matters.',
  },
];

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f0f0f',
    color: '#fff',
    fontFamily: "'Inter', -apple-system, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 20px',
  },
  hero: {
    maxWidth: 640,
    width: '100%',
    paddingTop: 80,
    paddingBottom: 80,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 24,
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logoCircle: { fontSize: 36 },
  logoText: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: '#fff',
  },
  headline: {
    fontSize: 48,
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: '-1px',
    margin: 0,
  },
  accent: { color: '#f97316' },
  sub: {
    fontSize: 18,
    color: '#a1a1aa',
    lineHeight: 1.6,
    margin: 0,
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  featureCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: '#1a1a1a',
    borderRadius: 12,
    padding: '16px 20px',
    textAlign: 'left',
    border: '1px solid #2a2a2a',
  },
  featureIcon: { fontSize: 28, flexShrink: 0 },
  featureTitle: { fontWeight: 600, fontSize: 15, marginBottom: 2 },
  featureSub: { fontSize: 13, color: '#71717a', lineHeight: 1.4 },
  ctaButton: {
    background: '#f97316',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '16px 36px',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
    letterSpacing: '-0.2px',
    width: '100%',
  },
  signin: { fontSize: 13, color: '#71717a', margin: 0 },
  signinLink: { color: '#f97316', cursor: 'pointer', fontWeight: 600 },
  disclaimer: { fontSize: 13, color: '#52525b', margin: 0 },
};

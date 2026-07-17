/**
 * /onboarding — New user walkthrough
 *
 * Flow:
 *   Welcome → Draft smarter → Start the right guys → Connect Yahoo → Enter the league
 *
 * Triggered by signup emailRedirectTo.
 * If user has already been onboarded, redirects to /dashboard immediately.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const STEPS = [
  {
    icon: '🟠',
    title: 'Welcome to Orange',
    subtitle: 'Your fantasy football edge.',
    body: 'Orange connects to your Yahoo Fantasy league and gives you the intel most managers never see — before every pick, every lineup decision, every waiver wire move.',
    cta: 'Let\'s go',
  },
  {
    icon: '🎯',
    title: 'Draft smarter.',
    subtitle: 'Know who\'ll still be there.',
    body: 'Orange calculates survival probability for every player — so you know if your guy will still be on the board at your next pick, or if you need to take him now.',
    cta: 'Next',
    preview: 'draft',
  },
  {
    icon: '📊',
    title: 'Start the right guys.',
    subtitle: 'Every week, automatically.',
    body: 'Opponent matchup grades, Vegas game totals, expert consensus, and bye week alerts — all combined into a single AI recommendation for your roster.',
    cta: 'Next',
    preview: 'lineup',
  },
  {
    icon: '🔗',
    title: 'Connect your Yahoo league.',
    subtitle: 'Where the magic happens.',
    body: 'Orange reads your roster, matchup, league settings, and scoring format directly from Yahoo. It takes about 30 seconds and unlocks everything.',
    cta: 'Connect Yahoo →',
    connectStep: true,
  },
  {
    icon: '🏆',
    title: 'You\'re ready.',
    subtitle: '14 days free. Then $4.99/month.',
    body: 'Full access to every feature for 14 days — no card required. Your league is waiting.',
    cta: 'Enter the league →',
    final: true,
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    // If already onboarded, skip straight to dashboard
    if (typeof window !== 'undefined' && localStorage.getItem('orange_onboarded') === 'true') {
      router.replace('/dashboard');
    }
  }, [mounted]);

  const current = STEPS[step];

  function advance() {
    if (current.connectStep) {
      // Mark onboarded so back-navigation doesn't loop
      localStorage.setItem('orange_onboarded', 'true');
      router.push('/connect');
      return;
    }
    if (current.final) {
      localStorage.setItem('orange_onboarded', 'true');
      router.push('/dashboard');
      return;
    }
    setAnimating(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setAnimating(false);
    }, 200);
  }

  function skip() {
    localStorage.setItem('orange_onboarded', 'true');
    router.push('/dashboard');
  }

  if (!mounted) return null;

  return (
    <div style={styles.page}>

      {/* Skip */}
      {!current.final && (
        <button style={styles.skip} onClick={skip}>Skip</button>
      )}

      {/* Progress dots */}
      <div style={styles.dots}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ ...styles.dot, background: i === step ? '#f97316' : '#27272a' }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ ...styles.content, opacity: animating ? 0 : 1, transition: 'opacity 0.2s ease' }}>

        <div style={styles.icon}>{current.icon}</div>
        <div style={styles.title}>{current.title}</div>
        <div style={styles.subtitle}>{current.subtitle}</div>
        <div style={styles.body}>{current.body}</div>

        {/* Draft preview */}
        {current.preview === 'draft' && (
          <div style={styles.previewCard}>
            <div style={styles.previewRow}>
              <span style={styles.posBadgeRB}>RB</span>
              <div style={styles.previewInfo}>
                <div style={styles.previewName}>Breece Hall</div>
                <div style={styles.previewMeta}>NYJ · ADP 4.2 · Proj 18.4 pts</div>
              </div>
              <div style={{ ...styles.survivalChip, background: '#14532d', color: '#4ade80' }}>88% survives</div>
            </div>
            <div style={styles.previewRow}>
              <span style={styles.posBadgeWR}>WR</span>
              <div style={styles.previewInfo}>
                <div style={styles.previewName}>Tyreek Hill</div>
                <div style={styles.previewMeta}>MIA · ADP 6.1 · Proj 16.2 pts</div>
              </div>
              <div style={{ ...styles.survivalChip, background: '#7f1d1d', color: '#f87171' }}>31% survives</div>
            </div>
          </div>
        )}

        {/* Lineup preview */}
        {current.preview === 'lineup' && (
          <div style={styles.previewCard}>
            <div style={styles.previewRow}>
              <span style={styles.posBadgeQB}>QB</span>
              <div style={styles.previewInfo}>
                <div style={styles.previewName}>Jalen Hurts</div>
                <div style={styles.previewMeta}>vs DAL (weak pass D) · O/U 51.5</div>
              </div>
              <div style={{ ...styles.gradeChip, color: '#4ade80' }}>A</div>
            </div>
            <div style={styles.previewRow}>
              <span style={styles.posBadgeRB}>RB</span>
              <div style={styles.previewInfo}>
                <div style={styles.previewName}>Miles Sanders</div>
                <div style={styles.previewMeta}>vs NYG (strong run D) · O/U 44.0</div>
              </div>
              <div style={{ ...styles.gradeChip, color: '#f87171' }}>D</div>
            </div>
          </div>
        )}

        {/* Connect Yahoo step visual */}
        {current.connectStep && (
          <div style={styles.connectCard}>
            <div style={styles.connectRow}>
              <div style={styles.connectDot} />
              <div style={styles.connectLabel}>Your roster</div>
            </div>
            <div style={styles.connectRow}>
              <div style={styles.connectDot} />
              <div style={styles.connectLabel}>Live matchup data</div>
            </div>
            <div style={styles.connectRow}>
              <div style={styles.connectDot} />
              <div style={styles.connectLabel}>League scoring format</div>
            </div>
            <div style={styles.connectRow}>
              <div style={styles.connectDot} />
              <div style={styles.connectLabel}>All {'{N}'} of your leagues</div>
            </div>
          </div>
        )}

        {/* Final step */}
        {current.final && (
          <div style={styles.trialBadge}>
            <div style={styles.trialBadgeTitle}>✓ 14-day free trial</div>
            <div style={styles.trialBadgeSub}>No credit card required</div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={styles.footer}>
        <button style={styles.ctaBtn} onClick={advance}>
          {current.cta}
        </button>
        {current.connectStep && (
          <button style={styles.skipConnectBtn} onClick={() => setStep(s => s + 1)}>
            Skip for now — connect later
          </button>
        )}
        {step > 0 && !current.final && !current.connectStep && (
          <button style={styles.backBtn} onClick={() => setStep(s => s - 1)}>Back</button>
        )}
      </div>
    </div>
  );
}

const posBadgeBase = {
  display: 'inline-block', borderRadius: 4, padding: '2px 6px',
  fontSize: 10, fontWeight: 800, flexShrink: 0,
};

const styles = {
  page: {
    background: '#0a0a0a', minHeight: '100vh', color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'flex', flexDirection: 'column',
    padding: '24px 24px 40px',
  },
  skip: {
    alignSelf: 'flex-end', background: 'none', border: 'none',
    color: '#52525b', fontSize: 14, cursor: 'pointer', padding: '4px 0',
  },
  dots: {
    display: 'flex', gap: 6, justifyContent: 'center', marginTop: 24, marginBottom: 48,
  },
  dot: { width: 8, height: 8, borderRadius: 4, transition: 'background 0.3s ease' },
  content: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.5px' },
  subtitle: { fontSize: 16, fontWeight: 600, color: '#f97316', marginBottom: 16 },
  body: { fontSize: 15, color: '#a1a1aa', lineHeight: 1.6, maxWidth: 320, marginBottom: 28 },

  previewCard: {
    background: '#141414', border: '1px solid #27272a', borderRadius: 14,
    padding: '12px 14px', width: '100%', maxWidth: 340,
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  previewRow: { display: 'flex', alignItems: 'center', gap: 10 },
  previewInfo: { flex: 1, textAlign: 'left' },
  previewName: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  previewMeta: { fontSize: 11, color: '#71717a' },
  posBadgeRB: { ...posBadgeBase, background: '#1a3a1a', color: '#4ade80' },
  posBadgeWR: { ...posBadgeBase, background: '#1a1a3a', color: '#818cf8' },
  posBadgeQB: { ...posBadgeBase, background: '#3a1a00', color: '#fb923c' },
  survivalChip: { borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 },
  gradeChip: { fontSize: 22, fontWeight: 900, minWidth: 28, textAlign: 'center' },

  connectCard: {
    background: '#0d1117', border: '1px solid #1e2030', borderRadius: 14,
    padding: '16px 20px', width: '100%', maxWidth: 300,
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  connectRow: { display: 'flex', alignItems: 'center', gap: 12 },
  connectDot: {
    width: 8, height: 8, borderRadius: '50%', background: '#ff6b1a', flexShrink: 0,
    boxShadow: '0 0 6px #ff6b1a88',
  },
  connectLabel: { fontSize: 14, color: '#ccc', fontWeight: 500 },

  trialBadge: {
    background: '#0d1f0d', border: '1px solid #22c55e33', borderRadius: 14,
    padding: '16px 24px', textAlign: 'center',
  },
  trialBadgeTitle: { fontSize: 16, fontWeight: 800, color: '#22c55e', marginBottom: 4 },
  trialBadgeSub: { fontSize: 13, color: '#71717a' },

  footer: { display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 32 },
  ctaBtn: {
    background: '#f97316', color: '#000', border: 'none',
    borderRadius: 12, padding: '16px', fontSize: 16, fontWeight: 800,
    cursor: 'pointer', width: '100%',
  },
  skipConnectBtn: {
    background: 'transparent', color: '#52525b', border: 'none',
    fontSize: 13, cursor: 'pointer', padding: '8px', textAlign: 'center',
  },
  backBtn: {
    background: 'transparent', color: '#52525b', border: 'none',
    fontSize: 14, cursor: 'pointer', padding: '8px',
  },
};

/**
 * PaywallModal
 * Shows when trial has expired. Blocks premium features.
 * Dismissible to free features only.
 */

import { useRouter } from 'next/router';

export default function PaywallModal({ onDismiss }) {
  const router = useRouter();

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.handle} />

        <div style={styles.icon}>🟠</div>
        <div style={styles.title}>Your free trial has ended</div>
        <div style={styles.sub}>
          Pick a plan to keep your roster-aware draft picks, expert consensus, bye week alerts, and opponent matchup grades.
        </div>

        <div style={styles.plans}>
          <button
            style={styles.planFeatured}
            onClick={() => router.push('/pricing')}
          >
            <div style={styles.planLabel}>Season Pass</div>
            <div style={styles.planPrice}>$24.99 <span style={styles.planNote}>one-time</span></div>
            <div style={styles.planSub}>Draft through playoffs · less than $1/week</div>
          </button>

          <button
            style={styles.planSecondary}
            onClick={() => router.push('/pricing')}
          >
            <div style={styles.planLabel}>Monthly</div>
            <div style={styles.planPrice}>$4.99 <span style={styles.planNote}>/month</span></div>
          </button>
        </div>

        <button style={styles.dismissBtn} onClick={onDismiss}>
          Continue with free features only
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)',
    zIndex: 200,
    display: 'flex', alignItems: 'flex-end',
  },
  modal: {
    background: '#161616',
    borderRadius: '20px 20px 0 0',
    border: '1px solid #2a2a2a',
    width: '100%',
    padding: '0 24px 48px',
  },
  handle: {
    width: 40, height: 4, background: '#3f3f46',
    borderRadius: 2, margin: '14px auto 24px',
  },
  icon: { fontSize: 36, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 8 },
  sub: {
    fontSize: 14, color: '#71717a', textAlign: 'center',
    lineHeight: 1.5, marginBottom: 24,
  },
  plans: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 },
  planFeatured: {
    background: '#1a1200', border: '2px solid #f97316',
    borderRadius: 12, padding: '16px',
    cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  planSecondary: {
    background: '#141414', border: '1px solid #2a2a2a',
    borderRadius: 12, padding: '14px',
    cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  planLabel: { fontSize: 13, fontWeight: 700, color: '#a1a1aa', marginBottom: 4 },
  planPrice: { fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 2 },
  planNote: { fontSize: 14, color: '#71717a', fontWeight: 400 },
  planSub: { fontSize: 12, color: '#22c55e' },
  dismissBtn: {
    width: '100%', background: 'transparent', border: 'none',
    color: '#3f3f46', fontSize: 13, cursor: 'pointer', padding: '10px 0',
  },
};

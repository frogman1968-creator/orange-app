import { useRouter } from 'next/router';
import { useTrial } from '../lib/useTrial';
import { useAuth } from '../lib/useAuth';
import { withAuth } from '../lib/withAuth';

function Account() {
  const router = useRouter();
  const { status, daysLeft, isPremium, isExpired } = useTrial();
  const { user, signOut } = useAuth();

  function handleManage() {
    router.push('/pricing');
  }

  async function handleSignOut() {
    localStorage.removeItem('orange_trial_start');
    localStorage.removeItem('orange_subscribed');
    await signOut();
    router.push('/login');
  }

  const statusConfig = {
    loading:    { label: 'Loading…',         color: '#52525b', bg: '#141414' },
    trial:      { label: `Free Trial — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`, color: '#f97316', bg: '#1a0d00' },
    expired:    { label: 'Trial Expired',     color: '#ef4444', bg: '#1a0000' },
    subscribed: { label: 'Active Subscriber', color: '#22c55e', bg: '#001a0a' },
  };

  const cfg = statusConfig[status] || statusConfig.loading;

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.back} onClick={() => router.back()}>← Back</button>
        <div style={styles.headerTitle}>Account</div>
        <div style={{ width: 48 }} />
      </div>

      {/* Profile */}
      <div style={styles.profileCard}>
        <div style={styles.avatar}>🟠</div>
        <div style={styles.profileInfo}>
          <div style={styles.profileName}>{user?.email || '—'}</div>
          <div style={styles.profileLeague}>Footagio League</div>
        </div>
      </div>

      {/* Subscription Status */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Subscription</div>
        <div style={{ ...styles.statusCard, background: cfg.bg, border: `1px solid ${cfg.color}33` }}>
          <div style={styles.statusRow}>
            <span style={styles.statusLabel}>Status</span>
            <span style={{ ...styles.statusValue, color: cfg.color }}>{cfg.label}</span>
          </div>

          {status === 'trial' && (
            <div style={styles.trialBar}>
              <div style={styles.trialBarTrack}>
                <div style={{
                  ...styles.trialBarFill,
                  width: `${(daysLeft / 14) * 100}%`,
                  background: daysLeft > 7 ? '#22c55e' : daysLeft > 3 ? '#f59e0b' : '#ef4444',
                }} />
              </div>
              <div style={styles.trialBarLabel}>{daysLeft} of 14 days remaining</div>
            </div>
          )}

          {status === 'subscribed' && (
            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Access</span>
              <span style={{ ...styles.statusValue, color: '#a1a1aa' }}>All premium features unlocked</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {(status === 'trial' || status === 'expired') && (
          <button style={styles.upgradeBtn} onClick={() => router.push('/pricing')}>
            🟠 Upgrade Now
          </button>
        )}
        {status === 'subscribed' && (
          <button style={styles.manageBtn} onClick={handleManage}>
            Manage Subscription
          </button>
        )}
      </div>

      {/* Features */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Your Plan Includes</div>
        <div style={styles.featureList}>
          {[
            { icon: '🎯', label: 'Draft survival odds', locked: !isPremium },
            { icon: '🟠', label: 'Orange Suggests picks', locked: !isPremium },
            { icon: '📊', label: 'More Info — expert consensus + Vegas data', locked: !isPremium },
            { icon: '⛔', label: 'Bye week alerts', locked: false },
            { icon: '📋', label: 'Roster & matchup view', locked: false },
            { icon: '📅', label: 'Multi-week lineup preview', locked: false },
          ].map((f, i) => (
            <div key={i} style={styles.featureRow}>
              <span style={styles.featureIcon}>{f.icon}</span>
              <span style={{ ...styles.featureLabel, color: f.locked ? '#3f3f46' : '#d4d4d8' }}>{f.label}</span>
              <span style={styles.featureCheck}>{f.locked ? '🔒' : '✓'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* App Info */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>App</div>
        <div style={styles.infoList}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Version</span>
            <span style={styles.infoValue}>1.0.0 (beta)</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>League</span>
            <span style={styles.infoValue}>Footagio League</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Data source</span>
            <span style={styles.infoValue}>Yahoo API (pending)</span>
          </div>
        </div>
        <button
          style={{ ...styles.manageBtn, marginTop: 12 }}
          onClick={() => router.push('/connect')}
        >
          Y! Manage Yahoo Connection
        </button>
        <button
          style={{ ...styles.manageBtn, marginTop: 8 }}
          onClick={() => router.push('/notifications')}
        >
          🔔 Notification Settings
        </button>
      </div>

      {/* Legal */}
      <div style={styles.section}>
        <button style={{ ...styles.manageBtn, marginTop: 0 }} onClick={() => router.push('/legal?tab=privacy')}>
          Privacy Policy
        </button>
        <button style={{ ...styles.manageBtn, marginTop: 8 }} onClick={() => router.push('/legal?tab=terms')}>
          Terms of Service
        </button>
      </div>

      {/* Sign Out */}
      <div style={styles.section}>
        <button style={styles.signOutBtn} onClick={handleSignOut}>
          Sign Out
        </button>
      </div>

      {/* Bottom Nav */}
      <div style={styles.bottomNav}>
        <button style={styles.navBtn} onClick={() => router.push('/draft')}>🎯 Draft</button>
        <button style={styles.navBtn} onClick={() => router.push('/lineup')}>📊 Lineup</button>
        <button style={styles.navBtn} onClick={() => router.push('/dashboard')}>🏠 Home</button>
        <button style={{ ...styles.navBtn, ...styles.navBtnActive }}>👤 Account</button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: '#0a0a0a', minHeight: '100vh', color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    paddingBottom: 80,
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
  profileCard: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '20px 16px', borderBottom: '1px solid #1a1a1a',
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    background: '#1a0d00', border: '2px solid #f97316',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28,
  },
  profileInfo: {},
  profileName: { fontSize: 18, fontWeight: 800, marginBottom: 2 },
  profileLeague: { fontSize: 13, color: '#71717a' },
  section: { padding: '20px 16px', borderBottom: '1px solid #1a1a1a' },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 },
  statusCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  statusRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusLabel: { fontSize: 13, color: '#71717a' },
  statusValue: { fontSize: 13, fontWeight: 700 },
  trialBar: { marginTop: 8 },
  trialBarTrack: { height: 6, background: '#27272a', borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  trialBarFill: { height: '100%', borderRadius: 3, transition: 'width 0.3s ease' },
  trialBarLabel: { fontSize: 11, color: '#71717a' },
  upgradeBtn: {
    width: '100%', background: '#f97316', color: '#000',
    border: 'none', borderRadius: 10, padding: '14px',
    fontSize: 15, fontWeight: 800, cursor: 'pointer',
  },
  manageBtn: {
    width: '100%', background: 'transparent', color: '#a1a1aa',
    border: '1px solid #27272a', borderRadius: 10, padding: '14px',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  featureList: { display: 'flex', flexDirection: 'column', gap: 12 },
  featureRow: { display: 'flex', alignItems: 'center', gap: 10 },
  featureIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  featureLabel: { flex: 1, fontSize: 14 },
  featureCheck: { fontSize: 13, color: '#22c55e' },
  infoList: { display: 'flex', flexDirection: 'column', gap: 10 },
  infoRow: { display: 'flex', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, color: '#71717a' },
  infoValue: { fontSize: 13, color: '#a1a1aa' },
  signOutBtn: {
    width: '100%', background: 'transparent', color: '#3f3f46',
    border: '1px solid #27272a', borderRadius: 10, padding: '12px',
    fontSize: 13, cursor: 'pointer', marginBottom: 8,
  },
  signOutNote: { fontSize: 11, color: '#3f3f46', textAlign: 'center' },
  bottomNav: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#111', borderTop: '1px solid #1f1f1f',
    display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px',
  },
  navBtn: {
    background: 'none', border: 'none', color: '#52525b',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 12px',
  },
  navBtnActive: { color: '#f97316' },
};

export default withAuth(Account);

import { useRouter } from 'next/router';
import { usePushNotifications } from '../lib/usePushNotifications';
import { withAuth } from '../lib/withAuth';

const ALERT_TYPES = [
  { id: 'bye',     icon: '⛔', label: 'Bye week alerts',        sub: 'Notified Tuesday before a bye week' },
  { id: 'injury',  icon: '⚠️', label: 'Injury updates',         sub: 'Real-time practice report changes' },
  { id: 'waiver',  icon: '🔔', label: 'Waiver wire opens',      sub: 'Wednesday when the wire resets' },
  { id: 'lineup',  icon: '📊', label: 'Lineup reminder',        sub: 'Sunday at 11am before games lock' },
  { id: 'score',   icon: '🏆', label: 'Final score recap',      sub: 'Sunday night after MNF' },
  { id: 'trade',   icon: '⚖️', label: 'Trade offers',           sub: 'When a trade is proposed in your league' },
];

function Notifications() {
  const router = useRouter();
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => router.back()}>← Back</button>
        <div style={styles.headerTitle}>🔔 Notifications</div>
        <div style={{ width: 48 }} />
      </div>

      <div style={styles.content}>

        {/* Main toggle */}
        <div style={styles.mainCard}>
          <div style={styles.mainCardLeft}>
            <div style={styles.mainIcon}>🔔</div>
            <div>
              <div style={styles.mainTitle}>Push Notifications</div>
              <div style={styles.mainSub}>
                {!supported      ? 'Not supported on this browser' :
                 permission === 'denied' ? 'Blocked — enable in browser settings' :
                 subscribed      ? 'Active — you\'ll receive alerts' :
                                   'Get alerts for injuries, bye weeks, and more'}
              </div>
            </div>
          </div>

          {supported && permission !== 'denied' && (
            <button
              style={{ ...styles.toggle, background: subscribed ? '#f97316' : '#27272a' }}
              onClick={subscribed ? unsubscribe : subscribe}
              disabled={loading}
            >
              <div style={{
                ...styles.toggleThumb,
                transform: subscribed ? 'translateX(20px)' : 'translateX(2px)',
              }} />
            </button>
          )}
        </div>

        {permission === 'denied' && (
          <div style={styles.blockedCard}>
            ⚠️ Notifications are blocked. Go to your browser settings → Site Settings → Notifications and allow orange-app-sigma.vercel.app.
          </div>
        )}

        {/* Alert types */}
        {subscribed && (
          <>
            <div style={styles.sectionTitle}>Alert types</div>
            <div style={styles.alertList}>
              {ALERT_TYPES.map(a => (
                <div key={a.id} style={styles.alertRow}>
                  <span style={styles.alertIcon}>{a.icon}</span>
                  <div style={styles.alertInfo}>
                    <div style={styles.alertLabel}>{a.label}</div>
                    <div style={styles.alertSub}>{a.sub}</div>
                  </div>
                  <div style={styles.alertCheck}>✓</div>
                </div>
              ))}
            </div>
            <div style={styles.note}>
              Alert preferences per-type coming soon. All alert types are active when notifications are enabled.
            </div>
          </>
        )}

        {/* Not subscribed — show preview */}
        {!subscribed && supported && permission !== 'denied' && (
          <>
            <div style={styles.sectionTitle}>What you'll get</div>
            <div style={styles.alertList}>
              {ALERT_TYPES.map(a => (
                <div key={a.id} style={{ ...styles.alertRow, opacity: 0.5 }}>
                  <span style={styles.alertIcon}>{a.icon}</span>
                  <div style={styles.alertInfo}>
                    <div style={styles.alertLabel}>{a.label}</div>
                    <div style={styles.alertSub}>{a.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              style={styles.enableBtn}
              onClick={subscribe}
              disabled={loading}
            >
              {loading ? 'Enabling…' : '🔔 Enable Notifications'}
            </button>
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
  content: { padding: 16 },
  mainCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#141414', border: '1px solid #27272a', borderRadius: 12,
    padding: 16, marginBottom: 16, gap: 12,
  },
  mainCardLeft: { display: 'flex', alignItems: 'center', gap: 12, flex: 1 },
  mainIcon: { fontSize: 28 },
  mainTitle: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  mainSub: { fontSize: 12, color: '#71717a', lineHeight: 1.4 },
  toggle: {
    width: 44, height: 26, borderRadius: 13, border: 'none',
    cursor: 'pointer', position: 'relative', flexShrink: 0,
    transition: 'background 0.2s ease',
  },
  toggleThumb: {
    position: 'absolute', top: 3, width: 20, height: 20,
    borderRadius: 10, background: '#fff',
    transition: 'transform 0.2s ease',
  },
  blockedCard: {
    background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: 10,
    padding: '12px 14px', fontSize: 12, color: '#f87171', lineHeight: 1.5, marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, color: '#52525b',
    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12,
  },
  alertList: {
    background: '#141414', border: '1px solid #1f1f1f',
    borderRadius: 12, marginBottom: 16, overflow: 'hidden',
  },
  alertRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '13px 14px', borderBottom: '1px solid #1a1a1a',
  },
  alertIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  alertInfo: { flex: 1 },
  alertLabel: { fontSize: 14, fontWeight: 600, marginBottom: 2 },
  alertSub: { fontSize: 11, color: '#71717a' },
  alertCheck: { color: '#22c55e', fontWeight: 700 },
  note: { fontSize: 11, color: '#3f3f46', textAlign: 'center', lineHeight: 1.5 },
  enableBtn: {
    width: '100%', background: '#f97316', color: '#000', border: 'none',
    borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800,
    cursor: 'pointer', marginTop: 8,
  },
};

export default withAuth(Notifications);

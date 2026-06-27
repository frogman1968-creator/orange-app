import { useRouter } from 'next/router';

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <div style={styles.icon}>🟠</div>
        <div style={styles.code}>404</div>
        <div style={styles.title}>Out of bounds.</div>
        <div style={styles.sub}>
          This page doesn't exist — but your roster does.
        </div>
        <div style={styles.buttons}>
          <button style={styles.primary} onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </button>
          <button style={styles.secondary} onClick={() => router.back()}>
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  content: {
    textAlign: 'center',
    maxWidth: 360,
  },
  icon: {
    fontSize: 56,
    marginBottom: 16,
  },
  code: {
    fontSize: 72,
    fontWeight: 900,
    color: '#f97316',
    lineHeight: 1,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#ffffff',
    marginBottom: 10,
  },
  sub: {
    fontSize: 15,
    color: '#71717a',
    marginBottom: 32,
    lineHeight: 1.5,
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  primary: {
    background: '#f97316',
    color: '#000',
    border: 'none',
    borderRadius: 10,
    padding: '14px 24px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondary: {
    background: 'transparent',
    color: '#71717a',
    border: '1px solid #27272a',
    borderRadius: 10,
    padding: '14px 24px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

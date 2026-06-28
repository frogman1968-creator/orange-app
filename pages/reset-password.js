import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [done, setDone]           = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking]   = useState(true);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash — it auto-sets the session
    // We just need to confirm there's an active session from the reset link
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true);
      }
      setChecking(false);
    });

    // Also check if session already exists (user landed with valid token)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true);
        setChecking(false);
      }
    });
  }, []);

  async function handleReset(e) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);

    // Auto-redirect to dashboard after 2 seconds
    setTimeout(() => router.push('/dashboard'), 2000);
  }

  if (checking) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>🟠</div>
        </div>
      </div>
    );
  }

  if (!validSession) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>🟠</div>
          <div style={styles.title}>Link expired</div>
          <div style={styles.sub}>
            This password reset link is invalid or has expired. Request a new one.
          </div>
          <button style={styles.primaryBtn} onClick={() => router.push('/login')}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>🟠</div>
          <div style={styles.title}>Password updated</div>
          <div style={styles.sub}>You're all set. Taking you to the dashboard…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🟠</div>
        <div style={styles.title}>Set new password</div>
        <div style={styles.sub}>Choose a strong password for your Orange account.</div>

        <form onSubmit={handleReset} style={styles.form}>
          <label style={styles.label}>New Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="8+ characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
          />

          <label style={styles.label}>Confirm Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="Repeat new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.primaryBtn} type="submit" disabled={loading}>
            {loading ? 'Updating…' : 'Update Password →'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: '#0a0a0a', minHeight: '100vh', color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%', maxWidth: 380,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  logo: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 800, marginBottom: 6, textAlign: 'center' },
  sub: { fontSize: 13, color: '#71717a', marginBottom: 28, textAlign: 'center' },
  form: { width: '100%', display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#a1a1aa', marginBottom: 4, marginTop: 12 },
  input: {
    background: '#141414', border: '1px solid #27272a', borderRadius: 8,
    padding: '12px 14px', color: '#fff', fontSize: 15, outline: 'none',
    width: '100%',
  },
  error: {
    background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: 8,
    padding: '10px 12px', color: '#f87171', fontSize: 13, marginTop: 8,
  },
  primaryBtn: {
    marginTop: 20, background: '#f97316', color: '#000', border: 'none',
    borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800,
    cursor: 'pointer', width: '100%',
  },
};

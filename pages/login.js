import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    // Redirect to dashboard (or wherever they were going)
    const next = router.query.next || '/dashboard';
    router.push(next);
  }

  async function handleReset(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message || resetError.error_description || JSON.stringify(resetError) || 'Failed to send reset email.');
      setLoading(false);
      return;
    }

    setResetSent(true);
    setLoading(false);
  }

  if (resetSent) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>🟠</div>
          <div style={styles.title}>Check your email</div>
          <div style={styles.sub}>
            Password reset link sent to <strong style={{ color: '#f97316' }}>{email}</strong>.
          </div>
          <button style={styles.secondaryBtn} onClick={() => { setResetSent(false); setShowReset(false); }}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  if (showReset) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>🟠</div>
          <div style={styles.title}>Reset password</div>
          <div style={styles.sub}>Enter your email and we'll send a reset link.</div>

          <form onSubmit={handleReset} style={styles.form}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />

            {error && <div style={styles.error}>{error}</div>}

            <button style={styles.primaryBtn} type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>

          <div style={styles.footer}>
            <span style={styles.link} onClick={() => setShowReset(false)}>Back to login</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🟠</div>
        <div style={styles.title}>Welcome back</div>
        <div style={styles.sub}>Sign in to your Orange account</div>

        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="Your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <div style={styles.forgotRow}>
            <span style={styles.link} onClick={() => { setShowReset(true); setError(null); }}>
              Forgot password?
            </span>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.primaryBtn} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <div style={styles.footer}>
          No account yet?{' '}
          <span style={styles.link} onClick={() => router.push('/signup')}>Create one free</span>
        </div>
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
  forgotRow: { display: 'flex', justifyContent: 'flex-end', marginTop: 6 },
  error: {
    background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: 8,
    padding: '10px 12px', color: '#f87171', fontSize: 13, marginTop: 8,
  },
  primaryBtn: {
    marginTop: 20, background: '#f97316', color: '#000', border: 'none',
    borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800,
    cursor: 'pointer', width: '100%',
  },
  secondaryBtn: {
    marginTop: 16, background: 'transparent', color: '#71717a',
    border: '1px solid #27272a', borderRadius: 10, padding: '12px',
    fontSize: 14, cursor: 'pointer', width: '100%',
  },
  footer: { marginTop: 20, fontSize: 13, color: '#71717a', textAlign: 'center' },
  link: { color: '#f97316', cursor: 'pointer', fontWeight: 600 },
};

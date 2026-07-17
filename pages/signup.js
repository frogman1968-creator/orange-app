import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Signup() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [done, setDone]         = useState(false);

  async function handleSignup(e) {
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
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://orangeff.app/onboarding',
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>🟠</div>
          <div style={styles.title}>Check your email</div>
          <div style={styles.sub}>
            We sent a confirmation link to <strong style={{ color: '#f97316' }}>{email}</strong>.
            Click it to activate your account and start your free trial.
          </div>
          <button style={styles.secondaryBtn} onClick={() => router.push('/login')}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🟠</div>
        <div style={styles.title}>Create your account</div>
        <div style={styles.sub}>14-day free trial · No credit card required</div>

        <form onSubmit={handleSignup} style={styles.form}>
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
            placeholder="8+ characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <label style={styles.label}>Confirm Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="Repeat password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.primaryBtn} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>
        </form>

        <div style={styles.footer}>
          Already have an account?{' '}
          <span style={styles.link} onClick={() => router.push('/login')}>Sign in</span>
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

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const LAST_UPDATED = 'June 28, 2026';
const APP_NAME     = 'Orange';
const COMPANY      = 'Axis Creative';
const EMAIL        = 'frogman1968@gmail.com';
const WEBSITE      = 'https://orange-app-sigma.vercel.app';

export default function Legal() {
  const router = useRouter();
  const [tab, setTab] = useState('privacy'); // 'privacy' | 'terms'

  // Respect ?tab= query param from account page links
  useEffect(() => {
    if (router.query.tab === 'terms') setTab('terms');
    else if (router.query.tab === 'privacy') setTab('privacy');
  }, [router.query.tab]);

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.back} onClick={() => router.back()}>← Back</button>
        <div style={styles.logo}>🟠</div>
      </div>

      {/* Tab switcher */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(tab === 'privacy' ? styles.tabActive : {}) }}
          onClick={() => setTab('privacy')}
        >
          Privacy Policy
        </button>
        <button
          style={{ ...styles.tab, ...(tab === 'terms' ? styles.tabActive : {}) }}
          onClick={() => setTab('terms')}
        >
          Terms of Service
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {tab === 'privacy' ? <PrivacyPolicy /> : <TermsOfService />}
      </div>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <div style={styles.doc}>
      <h1 style={styles.h1}>Privacy Policy</h1>
      <p style={styles.meta}>Last updated: {LAST_UPDATED}</p>

      <p style={styles.p}>
        {APP_NAME} ("we," "our," or "us") is operated by {COMPANY}. This Privacy Policy explains how
        we collect, use, and protect your information when you use the {APP_NAME} fantasy football
        companion app.
      </p>

      <h2 style={styles.h2}>1. Information We Collect</h2>
      <p style={styles.p}><strong>Account information:</strong> When you create an account, we collect your email address and a hashed password. We do not store plaintext passwords.</p>
      <p style={styles.p}><strong>Fantasy sports data:</strong> If you connect your Yahoo Fantasy account, we access your league, roster, and matchup data to power app features. We do not store this data beyond your active session.</p>
      <p style={styles.p}><strong>Payment information:</strong> Payments are processed by Stripe. We do not store your credit card number. We receive and store a Stripe customer ID and subscription status.</p>
      <p style={styles.p}><strong>Push notification tokens:</strong> If you opt in to push notifications, we store your browser push subscription token to deliver alerts. You can revoke this at any time in app settings.</p>
      <p style={styles.p}><strong>Usage data:</strong> We use Vercel Analytics to collect anonymized usage statistics (pages visited, session counts). No personally identifiable information is included.</p>

      <h2 style={styles.h2}>2. How We Use Your Information</h2>
      <p style={styles.p}>We use your information to provide and improve the {APP_NAME} service, process payments and manage your subscription, send fantasy football alerts you have opted into, and respond to support requests.</p>
      <p style={styles.p}>We do not sell your personal information to third parties.</p>

      <h2 style={styles.h2}>3. Data Storage and Security</h2>
      <p style={styles.p}>Your account data is stored securely in Supabase, a SOC 2-compliant database provider. All data is encrypted in transit using TLS and at rest using AES-256 encryption.</p>

      <h2 style={styles.h2}>4. Third-Party Services</h2>
      <p style={styles.p}>We use the following third-party services:</p>
      <p style={styles.p}><strong>Supabase</strong> — database and authentication (<a style={styles.a} href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>)</p>
      <p style={styles.p}><strong>Stripe</strong> — payment processing (<a style={styles.a} href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>)</p>
      <p style={styles.p}><strong>Yahoo Fantasy Sports API</strong> — fantasy league data (<a style={styles.a} href="https://legal.yahoo.com/us/en/yahoo/privacy/index.html" target="_blank" rel="noopener noreferrer">privacy policy</a>)</p>
      <p style={styles.p}><strong>Vercel</strong> — hosting and analytics (<a style={styles.a} href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">privacy policy</a>)</p>

      <h2 style={styles.h2}>5. Your Rights</h2>
      <p style={styles.p}>You may request deletion of your account and associated data at any time by emailing us at <a style={styles.a} href={`mailto:${EMAIL}`}>{EMAIL}</a>. We will process deletion requests within 30 days.</p>
      <p style={styles.p}>You may also disconnect your Yahoo account or revoke push notification permissions at any time from the Account settings page.</p>

      <h2 style={styles.h2}>6. Children's Privacy</h2>
      <p style={styles.p}>{APP_NAME} is not intended for users under 13 years of age. We do not knowingly collect data from children under 13.</p>

      <h2 style={styles.h2}>7. Changes to This Policy</h2>
      <p style={styles.p}>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email. Continued use of the app after changes constitutes acceptance of the updated policy.</p>

      <h2 style={styles.h2}>8. Contact</h2>
      <p style={styles.p}>Questions about this policy? Email us at <a style={styles.a} href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>
    </div>
  );
}

function TermsOfService() {
  return (
    <div style={styles.doc}>
      <h1 style={styles.h1}>Terms of Service</h1>
      <p style={styles.meta}>Last updated: {LAST_UPDATED}</p>

      <p style={styles.p}>
        These Terms of Service ("Terms") govern your use of {APP_NAME}, operated by {COMPANY}.
        By creating an account or using the app, you agree to these Terms.
      </p>

      <h2 style={styles.h2}>1. The Service</h2>
      <p style={styles.p}>{APP_NAME} is a fantasy football companion app that provides draft assistance, lineup optimization, trade analysis, and player news. It is intended for personal, non-commercial use.</p>

      <h2 style={styles.h2}>2. Accounts</h2>
      <p style={styles.p}>You must provide a valid email address to create an account. You are responsible for maintaining the security of your password and for all activity under your account. Notify us immediately at <a style={styles.a} href={`mailto:${EMAIL}`}>{EMAIL}</a> if you suspect unauthorized access.</p>

      <h2 style={styles.h2}>3. Free Trial and Subscriptions</h2>
      <p style={styles.p}>New users receive a 14-day free trial with full access to all features. After the trial period, continued access to premium features requires an active paid subscription.</p>
      <p style={styles.p}><strong>Monthly plan:</strong> $4.99/month, billed monthly. Cancel anytime.</p>
      <p style={styles.p}><strong>Season Pass:</strong> $24.99 one-time payment for the full NFL season.</p>
      <p style={styles.p}>Subscriptions are managed through Stripe. You may cancel at any time; cancellation takes effect at the end of the current billing period. We do not offer refunds for partial billing periods.</p>

      <h2 style={styles.h2}>4. Acceptable Use</h2>
      <p style={styles.p}>You agree not to: use the service for any unlawful purpose; attempt to reverse-engineer or scrape the app; share account credentials; or use automated tools to access the service at scale.</p>

      <h2 style={styles.h2}>5. Third-Party Integrations</h2>
      <p style={styles.p}>Connecting your Yahoo Fantasy account is optional and subject to Yahoo's own terms of service. {APP_NAME} is not affiliated with, endorsed by, or sponsored by Yahoo or the NFL.</p>

      <h2 style={styles.h2}>6. Disclaimers</h2>
      <p style={styles.p}>{APP_NAME} provides fantasy sports analysis and recommendations for entertainment purposes. We do not guarantee the accuracy of player projections, lineup suggestions, or trade valuations. Actual fantasy results may vary.</p>
      <p style={styles.p}>The service is provided "as is" without warranties of any kind, express or implied.</p>

      <h2 style={styles.h2}>7. Limitation of Liability</h2>
      <p style={styles.p}>To the fullest extent permitted by law, {COMPANY} shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of {APP_NAME}, including lost fantasy matchups or waiver wire misses.</p>

      <h2 style={styles.h2}>8. Termination</h2>
      <p style={styles.p}>We reserve the right to suspend or terminate accounts that violate these Terms. You may delete your account at any time by contacting us at <a style={styles.a} href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>

      <h2 style={styles.h2}>9. Changes to Terms</h2>
      <p style={styles.p}>We may update these Terms from time to time. We will notify registered users of material changes via email. Continued use of the app after changes constitutes acceptance of the updated Terms.</p>

      <h2 style={styles.h2}>10. Governing Law</h2>
      <p style={styles.p}>These Terms are governed by the laws of the State of Florida, without regard to conflict of law principles.</p>

      <h2 style={styles.h2}>11. Contact</h2>
      <p style={styles.p}>Questions about these Terms? Email us at <a style={styles.a} href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>
    </div>
  );
}

const styles = {
  page: {
    background: '#0a0a0a', minHeight: '100vh', color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    paddingBottom: 60,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid #1a1a1a',
  },
  back: {
    background: 'none', border: 'none', color: '#71717a',
    fontSize: 14, cursor: 'pointer', padding: 0,
  },
  logo: { fontSize: 28 },
  tabs: {
    display: 'flex', borderBottom: '1px solid #1a1a1a',
  },
  tab: {
    flex: 1, padding: '14px 0', background: 'none', border: 'none',
    color: '#52525b', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    color: '#f97316', borderBottom: '2px solid #f97316',
  },
  content: { padding: '0 20px' },
  doc: { maxWidth: 640, margin: '0 auto', paddingTop: 24 },
  h1: { fontSize: 22, fontWeight: 800, marginBottom: 4, color: '#fff' },
  h2: { fontSize: 15, fontWeight: 700, color: '#f97316', marginTop: 28, marginBottom: 8 },
  meta: { fontSize: 12, color: '#52525b', marginBottom: 20 },
  p: { fontSize: 14, color: '#a1a1aa', lineHeight: 1.7, marginBottom: 12 },
  a: { color: '#f97316', textDecoration: 'none' },
};

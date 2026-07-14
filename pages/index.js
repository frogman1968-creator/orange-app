import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard');
      } else {
        setChecking(false);
        // Slight delay so CSS transitions fire after mount
        setTimeout(() => setVisible(true), 60);
      }
    });
  }, []);

  if (checking) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 36 }}>🟠</div>
      </div>
    );
  }

  return (
    <div className="page">

      {/* Aurora glow layers */}
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />

      <div className="hero">

        {/* Logo */}
        <div className={`anim-item anim-0 ${visible ? 'anim-in' : ''}`}>
          <div className="logo-mark">
            <span className="logo-mark-text">Orange</span>
          </div>
        </div>

        {/* Headline */}
        <div className={`anim-item anim-1 ${visible ? 'anim-in' : ''}`}>
          <h1 className="headline">
            Your Fantasy Football<br />
            <span className="accent">Companion.</span>
          </h1>
        </div>

        {/* Sub */}
        <div className={`anim-item anim-2 ${visible ? 'anim-in' : ''}`}>
          <p className="sub">
            Roster-aware draft picks. Opponent-aware lineups.<br />
            No lag. No ads. No garbage.
          </p>
        </div>

        {/* Feature cards */}
        <div className={`features anim-item anim-3 ${visible ? 'anim-in' : ''}`}>
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-sub">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={`anim-item anim-4 ${visible ? 'anim-in' : ''}`} style={{ width: '100%' }}>
          <button className="cta-btn" onClick={() => router.push('/signup')}>
            <span className="cta-shimmer" />
            Get Started Free →
          </button>
        </div>

        {/* Sign in link */}
        <div className={`anim-item anim-5 ${visible ? 'anim-in' : ''}`}>
          <p className="signin-row">
            Already have an account?{' '}
            <span className="signin-link" onClick={() => router.push('/login')}>Sign in</span>
          </p>
        </div>

        <div className={`anim-item anim-5 ${visible ? 'anim-in' : ''}`}>
          <p className="disclaimer">14-day free trial · No credit card required</p>
        </div>

      </div>

      <style jsx>{`

        /* ── Page ─────────────────────────────── */
        .page {
          min-height: 100vh;
          background: #080808;
          color: #fff;
          font-family: 'Inter', -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 20px;
          position: relative;
          overflow: hidden;
        }

        /* ── Aurora glow ──────────────────────── */
        .aurora {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .aurora-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%);
          top: -150px;
          left: 50%;
          transform: translateX(-50%);
          animation: pulse1 6s ease-in-out infinite;
        }
        .aurora-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%);
          bottom: 0;
          left: -100px;
          animation: pulse2 8s ease-in-out infinite;
        }
        .aurora-3 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 70%);
          bottom: 100px;
          right: -80px;
          animation: pulse3 7s ease-in-out infinite;
        }

        @keyframes pulse1 {
          0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          50%       { opacity: 0.6; transform: translateX(-50%) scale(1.15); }
        }
        @keyframes pulse2 {
          0%, 100% { opacity: 1; transform: scale(1) translate(0, 0); }
          50%       { opacity: 0.5; transform: scale(1.2) translate(20px, -20px); }
        }
        @keyframes pulse3 {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.1) translate(-10px, 10px); }
        }

        /* ── Hero ─────────────────────────────── */
        .hero {
          max-width: 620px;
          width: 100%;
          padding-top: 80px;
          padding-bottom: 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 24px;
          position: relative;
          z-index: 1;
        }

        /* ── Entrance animations ──────────────── */
        .anim-item {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .anim-item.anim-in { opacity: 1; transform: translateY(0); }

        .anim-0 { transition-delay: 0ms; }
        .anim-1 { transition-delay: 100ms; }
        .anim-2 { transition-delay: 200ms; }
        .anim-3 { transition-delay: 320ms; }
        .anim-4 { transition-delay: 460ms; }
        .anim-5 { transition-delay: 560ms; }

        /* ── Logo mark ────────────────────────── */
        .logo-mark {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background: linear-gradient(145deg, #fb923c, #f97316, #ea580c);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: logo-bob 4s ease-in-out infinite, logo-pulse 3s ease-in-out infinite;
          box-shadow:
            0 0 40px rgba(249,115,22,0.55),
            0 0 80px rgba(249,115,22,0.25),
            0 0 0 8px rgba(249,115,22,0.08);
        }
        .logo-mark-text {
          color: #111;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.5px;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        @keyframes logo-bob {
          0%, 100% { transform: translateY(0); }
          40%       { transform: translateY(-6px); }
          70%       { transform: translateY(3px); }
        }
        @keyframes logo-pulse {
          0%, 100% {
            box-shadow:
              0 0 40px rgba(249,115,22,0.55),
              0 0 80px rgba(249,115,22,0.25),
              0 0 0 8px rgba(249,115,22,0.08);
          }
          50% {
            box-shadow:
              0 0 60px rgba(249,115,22,0.75),
              0 0 110px rgba(249,115,22,0.35),
              0 0 0 14px rgba(249,115,22,0.12);
          }
        }

        /* ── Headline ─────────────────────────── */
        .headline {
          font-size: clamp(36px, 6vw, 52px);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -1.5px;
          margin: 0;
        }
        .accent {
          background: linear-gradient(90deg, #f97316, #fb923c, #f97316);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 3s linear infinite;
        }
        @keyframes gradient-shift {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }

        /* ── Sub ──────────────────────────────── */
        .sub {
          font-size: 17px;
          color: #a1a1aa;
          line-height: 1.65;
          margin: 0;
        }

        /* ── Feature cards ────────────────────── */
        .features {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }
        .feature-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 16px 20px;
          text-align: left;
          transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
          cursor: default;
        }
        .feature-card:hover {
          border-color: rgba(249,115,22,0.45);
          box-shadow: 0 0 22px rgba(249,115,22,0.12), inset 0 0 20px rgba(249,115,22,0.04);
          transform: translateY(-2px);
        }
        .feature-icon { font-size: 28px; flex-shrink: 0; }
        .feature-title { font-weight: 700; font-size: 15px; margin-bottom: 3px; color: #fff; }
        .feature-sub { font-size: 13px; color: '#71717a'; line-height: 1.45; color: #71717a; }

        /* ── CTA button ───────────────────────── */
        .cta-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
          background: #f97316;
          color: #fff;
          border: none;
          border-radius: 14px;
          padding: 17px 36px;
          font-size: 17px;
          font-weight: 800;
          cursor: pointer;
          letter-spacing: -0.2px;
          box-shadow: 0 4px 24px rgba(249,115,22,0.35);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(249,115,22,0.5);
        }
        .cta-btn:active { transform: translateY(0); }

        /* Shimmer sweep */
        .cta-shimmer {
          position: absolute;
          top: 0; left: -75%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            120deg,
            transparent 30%,
            rgba(255,255,255,0.25) 50%,
            transparent 70%
          );
          animation: shimmer-sweep 2.8s ease-in-out infinite;
        }
        @keyframes shimmer-sweep {
          0%   { left: -75%; }
          60%, 100% { left: 125%; }
        }

        /* ── Sign in / disclaimer ─────────────── */
        .signin-row { font-size: 14px; color: #71717a; margin: 0; }
        .signin-link { color: #f97316; cursor: pointer; font-weight: 700; }
        .signin-link:hover { text-decoration: underline; }
        .disclaimer { font-size: 13px; color: #3f3f46; margin: 0; }

      `}</style>
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
    icon: '🤖',
    title: 'AI Start/Sit Engine',
    desc: 'Claude-powered recommendations tailored to your roster and matchup.',
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

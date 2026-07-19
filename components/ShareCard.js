/**
 * ShareCard — Branded social share card modal
 *
 * Three card types:
 *   'draft'   — letter grade + rank + team name
 *   'matchup' — weekly score, W/L result
 *   'waiver'  — player grabbed off waivers
 *
 * Usage:
 *   <ShareCard
 *     type="draft"
 *     data={{ grade: 'A-', rank: 3, numTeams: 12, teamName: 'Ankle Breachers' }}
 *     onClose={() => setShowShare(false)}
 *   />
 */

import { useState, useEffect } from 'react';

const GRADE_COLOR = {
  'A+': '#00e676', 'A': '#00e676', 'A-': '#69f0ae',
  'B+': '#40c4ff', 'B': '#40c4ff', 'B-': '#80d8ff',
  'C+': '#ffab40', 'C': '#ffab40', 'C-': '#ffd740',
  'D':  '#ff5252', 'F': '#ff5252',
};

function ordinal(n) {
  if (!n) return '';
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

// ── Card renderers ────────────────────────────────────────────────────────────

function DraftCard({ data }) {
  const gradeClr = GRADE_COLOR[data.grade] || '#f97316';
  return (
    <div style={card.wrap}>
      <div style={card.topLine}>
        <span style={card.logoMark}>🟠</span>
        <span style={card.brandName}>Orange</span>
        <span style={card.brandTag}>Fantasy Football</span>
      </div>
      <div style={card.divider} />
      <div style={card.label}>DRAFT REPORT CARD</div>
      <div style={{ ...card.gradeHero, color: gradeClr }}>{data.grade || '—'}</div>
      <div style={card.teamName}>{data.teamName || 'My Team'}</div>
      <div style={card.rankLine}>
        {ordinal(data.rank)} of {data.numTeams} teams in the league
      </div>
      <div style={card.divider} />
      <div style={card.footer}>
        <span style={card.footerText}>No ADP. Just results.</span>
        <span style={card.footerUrl}>orangeff.app</span>
      </div>
    </div>
  );
}

function MatchupCard({ data }) {
  const won = data.myScore > data.oppScore;
  const tied = data.myScore === data.oppScore;
  const result = tied ? 'TIE' : won ? 'WIN' : 'LOSS';
  const resultColor = tied ? '#a1a1aa' : won ? '#00e676' : '#ef4444';
  return (
    <div style={card.wrap}>
      <div style={card.topLine}>
        <span style={card.logoMark}>🟠</span>
        <span style={card.brandName}>Orange</span>
        <span style={card.brandTag}>Fantasy Football</span>
      </div>
      <div style={card.divider} />
      <div style={card.label}>WEEK {data.week || '—'} RESULT</div>
      <div style={{ ...card.resultBadge, color: resultColor, borderColor: resultColor + '44' }}>
        {result}
      </div>
      <div style={card.scoreRow}>
        <div style={card.scoreBlock}>
          <div style={card.scoreNum}>{data.myScore ?? '—'}</div>
          <div style={card.scoreTeam}>{data.teamName || 'Me'}</div>
        </div>
        <div style={card.scoreSep}>vs</div>
        <div style={card.scoreBlock}>
          <div style={{ ...card.scoreNum, color: '#555' }}>{data.oppScore ?? '—'}</div>
          <div style={card.scoreTeam}>{data.oppName || 'Opp'}</div>
        </div>
      </div>
      <div style={card.divider} />
      <div style={card.footer}>
        <span style={card.footerText}>AI-powered lineup advice</span>
        <span style={card.footerUrl}>orangeff.app</span>
      </div>
    </div>
  );
}

function WaiverCard({ data }) {
  const POS_COLORS = {
    QB: '#7c3aed', RB: '#16a34a', WR: '#0284c7', TE: '#d97706',
  };
  const posColor = POS_COLORS[data.position] || '#f97316';
  return (
    <div style={card.wrap}>
      <div style={card.topLine}>
        <span style={card.logoMark}>🟠</span>
        <span style={card.brandName}>Orange</span>
        <span style={card.brandTag}>Fantasy Football</span>
      </div>
      <div style={card.divider} />
      <div style={card.label}>WAIVER WIRE MOVE</div>
      <div style={{ ...card.waiverPosChip, background: posColor }}>
        {data.position}
      </div>
      <div style={card.waiverName}>{data.playerName || 'Player'}</div>
      <div style={card.waiverTeam}>{data.nflTeam || ''}</div>
      <div style={card.waiverAction}>🔄 Just grabbed off waivers</div>
      <div style={card.divider} />
      <div style={card.footer}>
        <span style={card.footerText}>Orange picked him.</span>
        <span style={card.footerUrl}>orangeff.app</span>
      </div>
    </div>
  );
}

const CARD_MAP = { draft: DraftCard, matchup: MatchupCard, waiver: WaiverCard };

// ── Share text generators ─────────────────────────────────────────────────────
function getShareText(type, data) {
  if (type === 'draft') {
    return `Just got my fantasy draft graded by Orange — ${data.grade} (${ordinal(data.rank)} of ${data.numTeams} teams). No ADP nonsense, just real results. 🟠 orangeff.app`;
  }
  if (type === 'matchup') {
    const won = data.myScore > data.oppScore;
    const tied = data.myScore === data.oppScore;
    const result = tied ? 'Tied' : won ? 'Won' : 'Lost';
    return `Week ${data.week || '—'} result: ${result} ${data.myScore}–${data.oppScore}. Orange had my lineup right. 🟠 orangeff.app`;
  }
  if (type === 'waiver') {
    return `Just grabbed ${data.playerName} (${data.position}) off waivers. Orange called it first. 🟠 orangeff.app`;
  }
  return 'Playing smarter fantasy football with Orange. 🟠 orangeff.app';
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ShareCard({ type, data, onClose }) {
  const [shared, setShared]   = useState(false);
  const [copied, setCopied]   = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  const CardComponent = CARD_MAP[type];
  if (!CardComponent) return null;

  const shareText = getShareText(type, data);

  async function handleShare() {
    try {
      if (canShare) {
        await navigator.share({
          title: 'Orange Fantasy Football',
          text: shareText,
          url: 'https://orangeff.app',
        });
        setShared(true);
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  }

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.sheet}>
        <div style={S.sheetHandle} />

        {/* Card preview */}
        <div style={S.cardPreviewWrap}>
          <CardComponent data={data} />
        </div>

        {/* Screenshot hint */}
        <div style={S.hintRow}>
          <span style={S.hintIcon}>📸</span>
          <span style={S.hintText}>Screenshot the card above to share as an image</span>
        </div>

        {/* Action buttons */}
        <div style={S.btnRow}>
          <button style={S.shareBtn} onClick={handleShare}>
            {shared ? '✅ Shared!' : copied ? '✅ Copied!' : canShare ? '↗ Share' : '📋 Copy Text'}
          </button>
          <button style={S.closeBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Card styles (used inside the card — designed to screenshot well) ──────────
const card = {
  wrap: {
    background: 'linear-gradient(145deg, #0d0d0d 0%, #111 60%, #0a0500 100%)',
    border: '1px solid #f9731622',
    borderRadius: 20,
    padding: '28px 24px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#fff',
  },
  topLine: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
  },
  logoMark:  { fontSize: 22 },
  brandName: { fontSize: 18, fontWeight: 900, color: '#fff' },
  brandTag:  { fontSize: 11, color: '#555', marginLeft: 2 },
  divider:   { height: 1, background: '#1a1a1a', margin: '14px 0' },
  label: {
    fontSize: 10, fontWeight: 800, color: '#f97316',
    letterSpacing: 2, marginBottom: 12,
  },
  // Draft
  gradeHero: {
    fontSize: 96, fontWeight: 900, lineHeight: 1, letterSpacing: -4,
    marginBottom: 8,
  },
  teamName: { fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 },
  rankLine: { fontSize: 14, color: '#888' },
  footer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  footerText: { fontSize: 12, color: '#555' },
  footerUrl:  { fontSize: 12, fontWeight: 700, color: '#f97316' },

  // Matchup
  resultBadge: {
    display: 'inline-block',
    fontSize: 36, fontWeight: 900, letterSpacing: 3,
    border: '2px solid', borderRadius: 10, padding: '6px 20px',
    marginBottom: 16,
  },
  scoreRow: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4,
  },
  scoreBlock: { flex: 1, textAlign: 'center' },
  scoreNum:   { fontSize: 40, fontWeight: 900, color: '#fff', lineHeight: 1 },
  scoreTeam:  { fontSize: 12, color: '#555', marginTop: 4 },
  scoreSep:   { fontSize: 13, color: '#333', fontWeight: 700 },

  // Waiver
  waiverPosChip: {
    display: 'inline-block',
    fontSize: 12, fontWeight: 800, color: '#fff',
    padding: '4px 12px', borderRadius: 6, marginBottom: 12,
  },
  waiverName:   { fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 4 },
  waiverTeam:   { fontSize: 14, color: '#888', marginBottom: 12 },
  waiverAction: { fontSize: 14, color: '#f97316', fontWeight: 700 },
};

// ── Modal / sheet styles ──────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
  },
  sheet: {
    background: '#111',
    borderRadius: '20px 20px 0 0',
    padding: '8px 20px 40px',
    animation: 'slideUp 0.3s ease',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    background: '#333', margin: '8px auto 20px',
  },
  cardPreviewWrap: {
    marginBottom: 16,
  },
  hintRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#1a1a1a', borderRadius: 10, padding: '10px 14px',
    marginBottom: 14,
  },
  hintIcon: { fontSize: 16 },
  hintText: { fontSize: 12, color: '#888', lineHeight: 1.4 },
  btnRow: { display: 'flex', gap: 10 },
  shareBtn: {
    flex: 2, background: '#f97316', color: '#000',
    border: 'none', borderRadius: 12, padding: '14px',
    fontSize: 15, fontWeight: 800, cursor: 'pointer',
  },
  closeBtn: {
    flex: 1, background: '#1a1a1a', color: '#888',
    border: '1px solid #2a2a2a', borderRadius: 12, padding: '14px',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
};

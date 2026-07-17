/**
 * LeaguePicker — tap to switch between Yahoo leagues.
 *
 * Usage:
 *   const { leagues, selected, setSelected } = useLeague();
 *   <LeaguePicker leagues={leagues} selected={selected} onSelect={setSelected} />
 *
 * Renders a tappable chip showing the current league name.
 * Opens a bottom sheet with all leagues listed.
 */

import { useState } from 'react';

export default function LeaguePicker({ leagues = [], selected, onSelect }) {
  const [open, setOpen] = useState(false);

  if (!leagues.length || !selected) return null;
  // Only show picker if user has more than 1 league
  if (leagues.length < 2) return (
    <div style={S.singleLeague}>{selected.name}</div>
  );

  function pick(league) {
    onSelect(league);
    setOpen(false);
  }

  // Extract a readable league ID from leagueKey (e.g. "nfl.l.123456" → "123456")
  function leagueShortId(leagueKey) {
    return leagueKey?.split('.l.')?.[1] || leagueKey;
  }

  return (
    <>
      {/* Trigger chip */}
      <button style={S.chip} onClick={() => setOpen(true)}>
        <span style={S.chipText}>{selected.name}</span>
        <span style={S.chevron}>▾</span>
      </button>

      {/* Bottom sheet overlay */}
      {open && (
        <div style={S.overlay} onClick={() => setOpen(false)}>
          <div style={S.sheet} onClick={e => e.stopPropagation()}>
            <div style={S.handle} />
            <div style={S.sheetTitle}>Switch League</div>

            {leagues.map(league => {
              const isSelected = league.leagueKey === selected.leagueKey;
              return (
                <button
                  key={league.leagueKey}
                  style={{ ...S.leagueRow, ...(isSelected ? S.leagueRowActive : {}) }}
                  onClick={() => pick(league)}
                >
                  <div style={S.leagueRowLeft}>
                    <div style={S.leagueName}>{league.name}</div>
                    <div style={S.leagueId}>League #{leagueShortId(league.leagueKey)} · Yahoo NFL</div>
                  </div>
                  {isSelected && <span style={S.checkmark}>✓</span>}
                </button>
              );
            })}

            <button style={S.cancelBtn} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

const S = {
  singleLeague: {
    fontSize: 13, color: '#888', fontWeight: 500,
  },
  chip: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: '#1a1a2e', border: '1px solid #2a2a4a',
    borderRadius: 20, padding: '5px 12px',
    cursor: 'pointer', maxWidth: 200,
  },
  chipText: {
    fontSize: 13, color: '#ccc', fontWeight: 600,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  chevron: { fontSize: 10, color: '#ff6b1a', flexShrink: 0 },

  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    zIndex: 1000, display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    width: '100%', background: '#0d0d1a',
    borderTop: '1px solid #2a2a4a', borderRadius: '20px 20px 0 0',
    padding: '12px 0 32px', maxHeight: '70vh', overflowY: 'auto',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, background: '#2a2a4a',
    margin: '0 auto 16px',
  },
  sheetTitle: {
    fontSize: 11, fontWeight: 800, color: '#555',
    letterSpacing: 1.5, textTransform: 'uppercase',
    textAlign: 'center', marginBottom: 16,
  },
  leagueRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', padding: '14px 20px', background: 'none', border: 'none',
    borderBottom: '1px solid #111', cursor: 'pointer', textAlign: 'left',
  },
  leagueRowActive: { background: '#ff6b1a0d' },
  leagueRowLeft: { flex: 1 },
  leagueName: { fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 },
  leagueId:   { fontSize: 11, color: '#555' },
  checkmark:  { fontSize: 16, color: '#ff6b1a', fontWeight: 800 },

  cancelBtn: {
    display: 'block', width: 'calc(100% - 32px)', margin: '16px 16px 0',
    background: '#1a1a2e', border: 'none', borderRadius: 12,
    padding: '14px 0', color: '#888', fontSize: 14, fontWeight: 600,
    cursor: 'pointer',
  },
};

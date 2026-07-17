/**
 * mockDraftEngine.js
 *
 * Bot draft logic for the Orange mock draft simulator.
 * Each bot has a strategy that influences which positions it prioritizes.
 *
 * Strategies:
 *   balanced   — follows ADP closely
 *   rb_heavy   — grabs RBs early, values RB depth
 *   wr_heavy   — loads up on WRs early
 *   zero_rb    — avoids RBs first 4 rounds, loads WRs/TEs
 *   te_premium — grabs a TE in rounds 2-4
 */

export const BOT_STRATEGIES = [
  'rb_heavy', 'wr_heavy', 'balanced', 'zero_rb', 'te_premium',
  'balanced', 'rb_heavy', 'wr_heavy', 'balanced', 'zero_rb',
  'balanced', 'rb_heavy',
];

/**
 * Given a team's current roster and roster positions (from league settings),
 * return what positions still need starters filled.
 */
export function getTeamNeeds(roster, rosterPositions) {
  // Standard fallback requirements
  const defaultReqs = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1 };
  const needs = { ...defaultReqs };

  if (rosterPositions?.length) {
    const reqs = {};
    for (const slot of rosterPositions) {
      if (['BN', 'IR'].includes(slot.position)) continue;
      if (!slot.position.includes('/')) {
        reqs[slot.position] = (reqs[slot.position] || 0) + slot.count;
      } else {
        // FLEX slot
        reqs.FLEX = (reqs.FLEX || 0) + slot.count;
      }
    }
    if (Object.keys(reqs).length) Object.assign(needs, reqs);
  }

  // Subtract what the team already has
  const counts = {};
  for (const p of roster) counts[p.position] = (counts[p.position] || 0) + 1;

  const unfilled = {};
  for (const [pos, req] of Object.entries(needs)) {
    if (pos === 'FLEX') {
      // FLEX can be filled by RB/WR/TE — count towards flex if no pure slot
      continue;
    }
    const have = counts[pos] || 0;
    if (have < req) unfilled[pos] = req - have;
  }
  return unfilled;
}

/**
 * Determine if K or DEF should be drafted (only in later rounds).
 */
function shouldDraftKorDef(round, totalRounds, position, roster) {
  const hasK   = roster.some(p => p.position === 'K');
  const hasDef = roster.some(p => p.position === 'DEF');
  if (position === 'K'   && !hasK   && round >= totalRounds - 3) return true;
  if (position === 'DEF' && !hasDef && round >= totalRounds - 3) return true;
  return false;
}

/**
 * Main bot pick function.
 *
 * @param {number} teamIndex 0-based
 * @param {string} strategy  'balanced' | 'rb_heavy' | 'wr_heavy' | 'zero_rb' | 'te_premium'
 * @param {array}  roster    Current team's roster
 * @param {array}  available Available players (not yet drafted)
 * @param {array}  rosterPositions  From league settings
 * @param {number} round     Current round (1-based)
 * @param {number} totalRounds
 * @returns {object} The player to draft
 */
export function botPick(teamIndex, strategy, roster, available, rosterPositions, round, totalRounds) {
  if (!available.length) return null;

  // Sort available by ADP (lower = better)
  const byAdp = [...available].sort((a, b) => a.adp - b.adp);

  const needs = getTeamNeeds(roster, rosterPositions);
  const needPositions = Object.keys(needs);

  // Build priority list based on strategy + round
  let priorityPositions = [];

  if (strategy === 'rb_heavy') {
    if (round <= 4) priorityPositions = ['RB', 'WR', 'QB', 'TE'];
    else priorityPositions = [...needPositions, 'RB', 'WR'];
  } else if (strategy === 'wr_heavy') {
    if (round <= 4) priorityPositions = ['WR', 'RB', 'QB', 'TE'];
    else priorityPositions = [...needPositions, 'WR', 'RB'];
  } else if (strategy === 'zero_rb') {
    if (round <= 4) priorityPositions = ['WR', 'TE', 'QB', 'WR'];
    else priorityPositions = [...needPositions, 'RB', 'WR'];
  } else if (strategy === 'te_premium') {
    if (round <= 4 && !roster.some(p => p.position === 'TE')) {
      priorityPositions = ['TE', 'WR', 'RB', 'QB'];
    } else {
      priorityPositions = [...needPositions, 'WR', 'RB'];
    }
  } else {
    // balanced — follow ADP
    priorityPositions = [...needPositions, 'RB', 'WR', 'QB', 'TE'];
  }

  // Add K/DEF late
  if (round >= totalRounds - 3) {
    priorityPositions.push('K', 'DEF');
  }

  // Remove dupes while preserving order
  const seen = new Set();
  priorityPositions = priorityPositions.filter(p => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });

  // Find best available player matching priority
  for (const pos of priorityPositions) {
    // Skip K/DEF unless it's time
    if (['K', 'DEF'].includes(pos) && !shouldDraftKorDef(round, totalRounds, pos, roster)) continue;

    const candidates = byAdp.filter(p => p.position === pos);
    if (candidates.length) {
      // 15% chance to pick the 2nd-best (feels human)
      if (candidates.length > 1 && Math.random() < 0.15) {
        return candidates[1];
      }
      return candidates[0];
    }
  }

  // Fallback: take best available (skip K/DEF until late)
  const nonSpecial = byAdp.filter(p => !['K','DEF'].includes(p.position));
  const special    = byAdp.filter(p => ['K','DEF'].includes(p.position));

  if (round < totalRounds - 3 && nonSpecial.length) return nonSpecial[0];
  return byAdp[0];
}

/**
 * Calculate which overall pick number belongs to which team position (1-indexed).
 * Returns the team position (1-indexed) for a given overall pick.
 */
export function getTeamForPick(pickNum, numTeams) {
  const round = Math.ceil(pickNum / numTeams);
  const posInRound = (pickNum - 1) % numTeams;
  const isEvenRound = round % 2 === 0;
  const teamPos = isEvenRound ? (numTeams - posInRound) : (posInRound + 1);
  return teamPos; // 1-indexed position in draft
}

/**
 * Get all pick numbers for a given team position in a snake draft.
 */
export function getMyPickNumbers(myPosition, numTeams, totalRounds) {
  const picks = [];
  for (let round = 1; round <= totalRounds; round++) {
    const isEvenRound = round % 2 === 0;
    const pickInRound = isEvenRound ? (numTeams - myPosition + 1) : myPosition;
    picks.push((round - 1) * numTeams + pickInRound);
  }
  return picks;
}

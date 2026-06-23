/**
 * Footagio League - Sample Data
 * League ID: 788615 (Yahoo)
 * 12 teams, PPR scoring
 * Used while Yahoo OAuth approval is pending
 */

export const LEAGUE = {
  id: '788615',
  name: 'Footagio League',
  platform: 'yahoo',
  season: 2025,
  scoringType: 'PPR',
  numTeams: 8,
  commissioner: 'Frogman68',
};

export const TEAMS = [
  { id: 1, name: "Frogman's Squad",    owner: 'Frogman68',    wins: 9, losses: 4, pf: 1842.4, pa: 1701.2, isMe: true },
  { id: 2, name: 'Gridiron Ghosts',    owner: 'GhostRider22', wins: 8, losses: 5, pf: 1798.6, pa: 1744.3 },
  { id: 3, name: 'Blitz Kings',        owner: 'BlitzKing99',  wins: 8, losses: 5, pf: 1776.1, pa: 1689.4 },
  { id: 4, name: 'End Zone Elite',     owner: 'EZElite',      wins: 7, losses: 6, pf: 1754.9, pa: 1722.8 },
  { id: 5, name: 'Touchdown Tyrants',  owner: 'TDTyrant',     wins: 7, losses: 6, pf: 1731.2, pa: 1768.5 },
  { id: 6, name: 'Red Zone Rangers',   owner: 'RZRanger',     wins: 6, losses: 7, pf: 1698.3, pa: 1742.1 },
  { id: 7, name: 'Sack City',          owner: 'SackMaster',   wins: 6, losses: 7, pf: 1677.8, pa: 1711.6 },
  { id: 8, name: 'Hail Mary Heroes',   owner: 'HailMary',     wins: 5, losses: 8, pf: 1654.2, pa: 1789.3 },
  { id: 9, name: 'Field Goal Felons',  owner: 'FGFelon',      wins: 5, losses: 8, pf: 1632.7, pa: 1801.4 },
  { id: 10, name: 'Punt Returners',    owner: 'PuntKing',     wins: 4, losses: 9, pf: 1601.3, pa: 1834.6 },
  { id: 11, name: 'False Start FC',    owner: 'FalseStart',   wins: 4, losses: 9, pf: 1578.9, pa: 1856.2 },
  { id: 12, name: 'Fumble Recovery',   owner: 'FumbleKing',   wins: 3, losses: 10, pf: 1544.1, pa: 1899.7 },
];

export const MY_ROSTER = {
  teamId: 1,
  starters: [
    { id: 'p1',  name: 'Lamar Jackson',     position: 'QB',   team: 'BAL', status: 'active',       projectedPts: 32.4, lastWeekPts: 38.2 },
    { id: 'p2',  name: 'Christian McCaffrey', position: 'RB', team: 'SF',  status: 'questionable', projectedPts: 24.1, lastWeekPts: 19.8, injuryNote: 'Knee - Limited' },
    { id: 'p3',  name: 'Saquon Barkley',    position: 'RB',   team: 'PHI', status: 'active',       projectedPts: 22.6, lastWeekPts: 28.4 },
    { id: 'p4',  name: "Ja'Marr Chase",     position: 'WR',   team: 'CIN', status: 'active',       projectedPts: 21.8, lastWeekPts: 24.6 },
    { id: 'p5',  name: 'Tyreek Hill',       position: 'WR',   team: 'MIA', status: 'active',       projectedPts: 19.4, lastWeekPts: 16.2 },
    { id: 'p6',  name: 'Sam LaPorta',       position: 'TE',   team: 'DET', status: 'active',       projectedPts: 14.2, lastWeekPts: 18.9 },
    { id: 'p7',  name: 'Stefon Diggs',      position: 'FLEX', team: 'NE',  status: 'active',       projectedPts: 16.8, lastWeekPts: 14.1 },
    { id: 'p8',  name: 'Harrison Butker',   position: 'K',    team: 'KC',  status: 'active',       projectedPts: 9.2,  lastWeekPts: 11.0 },
    { id: 'p9',  name: 'San Francisco 49ers', position: 'DEF', team: 'SF', status: 'active',       projectedPts: 10.4, lastWeekPts: 8.0  },
  ],
  bench: [
    { id: 'p10', name: 'Josh Downs',        position: 'WR',   team: 'IND', status: 'active',       projectedPts: 13.2, lastWeekPts: 17.4 },
    { id: 'p11', name: 'Jaylen Warren',     position: 'RB',   team: 'PIT', status: 'active',       projectedPts: 11.8, lastWeekPts: 9.6  },
    { id: 'p12', name: 'Jonnu Smith',       position: 'TE',   team: 'MIA', status: 'active',       projectedPts: 10.1, lastWeekPts: 12.3 },
    { id: 'p13', name: 'Gus Edwards',       position: 'RB',   team: 'LAC', status: 'doubtful',     projectedPts: 8.4,  lastWeekPts: 6.2, injuryNote: 'Hamstring' },
    { id: 'p14', name: 'Elijah Moore',      position: 'WR',   team: 'CLE', status: 'active',       projectedPts: 9.8,  lastWeekPts: 7.1  },
    { id: 'p15', name: 'Bailey Zappe',      position: 'QB',   team: 'NE',  status: 'active',       projectedPts: 16.2, lastWeekPts: 14.8 },
  ],
};

export const CURRENT_MATCHUP = {
  week: 14,
  myScore: 142.8,
  myProjected: 170.9,
  opponent: {
    teamId: 2,
    name: "Gridiron Ghosts",
    owner: 'GhostRider22',
    score: 138.4,
    projected: 158.2,
    starters: [
      { id: 'o1', name: 'Josh Allen',         position: 'QB',   team: 'BUF', projectedPts: 31.2 },
      { id: 'o2', name: 'Derrick Henry',      position: 'RB',   team: 'TEN', projectedPts: 20.4 },
      { id: 'o3', name: 'Tony Pollard',       position: 'RB',   team: 'TEN', projectedPts: 14.6 },
      { id: 'o4', name: 'CeeDee Lamb',        position: 'WR',   team: 'DAL', projectedPts: 23.8 },
      { id: 'o5', name: 'Deebo Samuel',       position: 'WR',   team: 'SF',  projectedPts: 15.2 },
      { id: 'o6', name: 'Mark Andrews',       position: 'TE',   team: 'BAL', projectedPts: 13.4 },
      { id: 'o7', name: 'Khalil Shakir',      position: 'FLEX', team: 'BUF', projectedPts: 12.8 },
      { id: 'o8', name: 'Evan McPherson',     position: 'K',    team: 'CIN', projectedPts: 8.6  },
      { id: 'o9', name: 'Dallas Cowboys',     position: 'DEF',  team: 'DAL', projectedPts: 9.2  },
    ],
  },
  opponentWeaknesses: {
    QB: 'B', RB: 'C', WR: 'A', TE: 'B', K: 'C', DEF: 'B',
  },
};

export const WEEKLY_RECOMMENDATIONS = [
  { player: MY_ROSTER.starters[0], recommendation: 'start', reason: 'Lamar is QB1 this week — favorable matchup vs a weak pass defense. Lock him in.', matchupGrade: 'A', confidence: 0.95 },
  { player: MY_ROSTER.starters[1], recommendation: 'monitor', reason: 'McCaffrey is questionable with a knee injury. Check injury report Friday before locking in.', matchupGrade: 'B', confidence: 0.6, injuryFlag: true },
  { player: MY_ROSTER.starters[2], recommendation: 'start', reason: "Barkley vs a bottom-5 run defense. He's a must-start this week.", matchupGrade: 'A', confidence: 0.92 },
  { player: MY_ROSTER.starters[3], recommendation: 'start', reason: "Chase has a grade-A matchup against a secondary that's given up 28+ PPR points to WRs.", matchupGrade: 'A', confidence: 0.90 },
  { player: MY_ROSTER.starters[4], recommendation: 'start', reason: "Hill is volatile but the target share is there. Start him.", matchupGrade: 'B', confidence: 0.78 },
  { player: MY_ROSTER.starters[5], recommendation: 'start', reason: 'LaPorta has been consistent — 8+ targets last 3 weeks. Solid TE1.', matchupGrade: 'B', confidence: 0.82 },
  { player: MY_ROSTER.starters[6], recommendation: 'start', reason: 'Diggs is your best FLEX option this week. Decent volume, favorable coverage.', matchupGrade: 'C', confidence: 0.70 },
  { player: MY_ROSTER.bench[0], recommendation: 'sit', reason: 'Josh Downs has upside but Diggs is the safer play this week.', matchupGrade: 'C', confidence: 0.65 },
  { player: MY_ROSTER.bench[3], recommendation: 'sit', reason: 'Edwards is doubtful — do not start until he is confirmed active.', matchupGrade: 'D', confidence: 0.95, injuryFlag: true },
];

export const WAIVER_RECOMMENDATIONS = [
  { addPlayer: { name: 'Jaylen Waddle', position: 'WR', team: 'MIA' }, dropPlayer: { name: 'Elijah Moore', position: 'WR', team: 'CLE' }, reason: 'Waddle returning from injury with full practice this week. High upside add.', priority: 1 },
  { addPlayer: { name: 'Jerome Ford', position: 'RB', team: 'CLE' }, dropPlayer: { name: 'Gus Edwards', position: 'RB', team: 'LAC' }, reason: 'Edwards doubtful. Ford is the handcuff getting 15+ carries.', priority: 2 },
  { addPlayer: { name: 'Tyjae Spears', position: 'RB', team: 'TEN' }, dropPlayer: null, reason: 'Trending up — grab before he blows up your waiver priority.', priority: 3 },
];

// ─── Player Detail Cards (More Info) ─────────────────────────────────────────
// Expert consensus, Vegas totals, defensive ranks — per player
export const PLAYER_DETAILS = {
  p1: {
    expertConsensus: 31.8, expertLow: 24.0, expertHigh: 41.0,
    ecrRank: 1, ecrPos: 'QB1',
    oppTeam: 'PIT', oppDefRank: 28, oppDefLabel: '#28 pass defense',
    vegasTotal: 51.5, impliedTeamScore: 28.2,
    injuryStatus: 'Active — full practice all week',
    verdict: 'Lock', verdictColor: '#22c55e',
    verdictDetail: 'Elite matchup vs a bottom-5 pass defense. No hesitation — QB1 this week.',
  },
  p2: {
    expertConsensus: 22.4, expertLow: 12.0, expertHigh: 34.0,
    ecrRank: 4, ecrPos: 'RB4',
    oppTeam: 'SEA', oppDefRank: 14, oppDefLabel: '#14 run defense',
    vegasTotal: 47.0, impliedTeamScore: 24.5,
    injuryStatus: '⚠️ Questionable — knee, limited Wed & Thu',
    verdict: 'Monitor', verdictColor: '#f59e0b',
    verdictDetail: 'Talent is undeniable but the knee is a real concern. Check Friday injury report before locking in. If active, start him.',
  },
  p3: {
    expertConsensus: 23.1, expertLow: 16.0, expertHigh: 32.0,
    ecrRank: 3, ecrPos: 'RB3',
    oppTeam: 'WAS', oppDefRank: 31, oppDefLabel: '#31 run defense',
    vegasTotal: 49.5, impliedTeamScore: 27.0,
    injuryStatus: 'Active — full practice',
    verdict: 'Lock', verdictColor: '#22c55e',
    verdictDetail: 'Bottom-5 run defense, high game total, full health. Barkley is a must-start.',
  },
  p4: {
    expertConsensus: 22.6, expertLow: 14.0, expertHigh: 33.0,
    ecrRank: 2, ecrPos: 'WR2',
    oppTeam: 'IND', oppDefRank: 29, oppDefLabel: '#29 pass defense',
    vegasTotal: 50.0, impliedTeamScore: 26.8,
    injuryStatus: 'Active — full practice',
    verdict: 'Lock', verdictColor: '#22c55e',
    verdictDetail: 'Grade-A matchup against a secondary giving up 28+ PPR pts to WRs. Chase is WR1 upside this week.',
  },
  p5: {
    expertConsensus: 18.2, expertLow: 9.0, expertHigh: 34.0,
    ecrRank: 7, ecrPos: 'WR7',
    oppTeam: 'NE', oppDefRank: 18, oppDefLabel: '#18 pass defense',
    vegasTotal: 46.5, impliedTeamScore: 24.0,
    injuryStatus: 'Active — full practice',
    verdict: 'Start', verdictColor: '#22c55e',
    verdictDetail: 'Hill is boom-or-bust but the target share and Tua connection are real. Neutral matchup but the ceiling is always there.',
  },
  p6: {
    expertConsensus: 13.8, expertLow: 7.0, expertHigh: 22.0,
    ecrRank: 5, ecrPos: 'TE5',
    oppTeam: 'GB', oppDefRank: 22, oppDefLabel: '#22 TE defense',
    vegasTotal: 48.0, impliedTeamScore: 25.5,
    injuryStatus: 'Active — full practice',
    verdict: 'Start', verdictColor: '#22c55e',
    verdictDetail: '8+ targets the last 3 weeks. Consistent floor with TE1 upside. Solid start.',
  },
  p7: {
    expertConsensus: 15.4, expertLow: 8.0, expertHigh: 24.0,
    ecrRank: 18, ecrPos: 'WR18',
    oppTeam: 'MIN', oppDefRank: 20, oppDefLabel: '#20 pass defense',
    vegasTotal: 45.5, impliedTeamScore: 23.0,
    injuryStatus: 'Active — full practice',
    verdict: 'Start', verdictColor: '#22c55e',
    verdictDetail: 'Best FLEX option available. Neutral matchup but volume is consistent enough to trust.',
  },
  p8: {
    expertConsensus: 9.0, expertLow: 5.0, expertHigh: 16.0,
    ecrRank: 2, ecrPos: 'K2',
    oppTeam: 'HOU', oppDefRank: 15, oppDefLabel: '#15 vs kickers',
    vegasTotal: 48.5, impliedTeamScore: 26.0,
    injuryStatus: 'Active — full practice',
    verdict: 'Start', verdictColor: '#22c55e',
    verdictDetail: 'Elite kicker on a high-scoring offense. High game total means more scoring opportunities.',
  },
  p9: {
    expertConsensus: 10.2, expertLow: 4.0, expertHigh: 18.0,
    ecrRank: 3, ecrPos: 'DEF3',
    oppTeam: 'ARI', oppDefRank: 28, oppDefLabel: 'vs #28 offense',
    vegasTotal: 43.5, impliedTeamScore: 24.0,
    injuryStatus: 'Active — full roster',
    verdict: 'Start', verdictColor: '#22c55e',
    verdictDetail: 'SF defense vs a Cardinals offense ranked 28th in scoring. Good week for a sack and turnover upside.',
  },
};

// ─── Bye Weeks ────────────────────────────────────────────────────────────────
// Maps player id → the week they are on bye
export const BYE_WEEKS = {
  p5: 15,  // Tyreek Hill (MIA) — bye week 15
  p8: 15,  // Harrison Butker (KC) — bye week 15
  p1: 16,  // Lamar Jackson (BAL) — bye week 16
  p9: 16,  // SF 49ers DEF — bye week 16
};

// ─── Full Season Schedule + Weekly Data ───────────────────────────────────────
export const SCHEDULE = {
  14: {
    status: 'live',
    opponent: { teamId: 2, name: 'Gridiron Ghosts', owner: 'GhostRider22', score: 138.4, projected: 158.2 },
    myScore: 142.8,
    myProjected: 170.9,
    opponentWeaknesses: { QB: 'B', RB: 'C', WR: 'A', TE: 'B', K: 'C', DEF: 'B' },
    opponentStarters: CURRENT_MATCHUP.opponent.starters,
  },
  15: {
    status: 'upcoming',
    opponent: { teamId: 3, name: 'Blitz Kings', owner: 'BlitzKing99', score: 0, projected: 151.2 },
    myScore: 0,
    myProjected: 154.6,
    opponentWeaknesses: { QB: 'A', RB: 'D', WR: 'C', TE: 'A', K: 'B', DEF: 'C' },
    opponentStarters: [
      { id: 'w15o1', name: 'Dak Prescott',     position: 'QB',   team: 'DAL', projectedPts: 24.6 },
      { id: 'w15o2', name: 'Derrick Henry',     position: 'RB',   team: 'TEN', projectedPts: 21.2 },
      { id: 'w15o3', name: 'Josh Jacobs',       position: 'RB',   team: 'GB',  projectedPts: 16.4 },
      { id: 'w15o4', name: 'Davante Adams',     position: 'WR',   team: 'LV',  projectedPts: 17.8 },
      { id: 'w15o5', name: 'DJ Moore',          position: 'WR',   team: 'CHI', projectedPts: 16.2 },
      { id: 'w15o6', name: 'Jake Ferguson',     position: 'TE',   team: 'DAL', projectedPts: 11.4 },
      { id: 'w15o7', name: 'Keenan Allen',      position: 'FLEX', team: 'CHI', projectedPts: 14.8 },
      { id: 'w15o8', name: 'Brandon Aubrey',    position: 'K',    team: 'DAL', projectedPts: 9.8  },
      { id: 'w15o9', name: 'Dallas Cowboys',    position: 'DEF',  team: 'DAL', projectedPts: 10.2 },
    ],
  },
  16: {
    status: 'upcoming',
    opponent: { teamId: 4, name: 'End Zone Elite', owner: 'EZElite', score: 0, projected: 144.8 },
    myScore: 0,
    myProjected: 161.2,
    opponentWeaknesses: { QB: 'C', RB: 'B', WR: 'A', TE: 'D', K: 'B', DEF: 'C' },
    opponentStarters: [
      { id: 'w16o1', name: 'C.J. Stroud',       position: 'QB',   team: 'HOU', projectedPts: 22.4 },
      { id: 'w16o2', name: 'Breece Hall',        position: 'RB',   team: 'NYJ', projectedPts: 20.8 },
      { id: 'w16o3', name: 'Tony Pollard',       position: 'RB',   team: 'TEN', projectedPts: 15.6 },
      { id: 'w16o4', name: 'Puka Nacua',         position: 'WR',   team: 'LAR', projectedPts: 19.4 },
      { id: 'w16o5', name: 'Stefon Diggs',       position: 'WR',   team: 'NE',  projectedPts: 15.8 },
      { id: 'w16o6', name: 'Cole Kmet',          position: 'TE',   team: 'CHI', projectedPts: 9.6  },
      { id: 'w16o7', name: 'Josh Downs',         position: 'FLEX', team: 'IND', projectedPts: 13.2 },
      { id: 'w16o8', name: 'Jake Elliott',       position: 'K',    team: 'PHI', projectedPts: 8.8  },
      { id: 'w16o9', name: 'New York Jets',      position: 'DEF',  team: 'NYJ', projectedPts: 10.8 },
    ],
  },
};

// ─── Weekly Recommendations (per week) ───────────────────────────────────────
export const WEEKLY_RECS = {
  14: [
    { player: MY_ROSTER.starters[0], recommendation: 'start',   reason: 'Lamar is QB1 this week — favorable matchup vs a weak pass defense. Lock him in.',             matchupGrade: 'A', confidence: 0.95 },
    { player: MY_ROSTER.starters[1], recommendation: 'monitor', reason: 'McCaffrey is questionable with a knee injury. Check injury report Friday before locking in.',  matchupGrade: 'B', confidence: 0.60, injuryFlag: true },
    { player: MY_ROSTER.starters[2], recommendation: 'start',   reason: "Barkley vs a bottom-5 run defense. Must-start.",                                                matchupGrade: 'A', confidence: 0.92 },
    { player: MY_ROSTER.starters[3], recommendation: 'start',   reason: "Chase has a grade-A matchup — secondary giving up 28+ PPR pts to WRs.",                        matchupGrade: 'A', confidence: 0.90 },
    { player: MY_ROSTER.starters[4], recommendation: 'start',   reason: "Hill is volatile but target share is real. Start him.",                                         matchupGrade: 'B', confidence: 0.78 },
    { player: MY_ROSTER.starters[5], recommendation: 'start',   reason: 'LaPorta — 8+ targets last 3 weeks. Solid TE1.',                                                 matchupGrade: 'B', confidence: 0.82 },
    { player: MY_ROSTER.starters[6], recommendation: 'start',   reason: 'Diggs is your best FLEX option. Decent volume, favorable coverage.',                            matchupGrade: 'C', confidence: 0.70 },
    { player: MY_ROSTER.bench[0],    recommendation: 'sit',     reason: 'Josh Downs has upside but Diggs is the safer play.',                                            matchupGrade: 'C', confidence: 0.65 },
    { player: MY_ROSTER.bench[3],    recommendation: 'sit',     reason: 'Edwards is doubtful — do not start until confirmed active.',                                    matchupGrade: 'D', confidence: 0.95, injuryFlag: true },
  ],
  15: [
    { player: MY_ROSTER.starters[0], recommendation: 'start',   reason: 'Blitz Kings are weak against QBs — grade A matchup. Lamar is a lock again.',                  matchupGrade: 'A', confidence: 0.94 },
    { player: MY_ROSTER.starters[1], recommendation: 'start',   reason: 'Blitz Kings rank #31 vs RBs. If CMC is healthy this week, he is a must-start.',               matchupGrade: 'A', confidence: 0.85 },
    { player: MY_ROSTER.starters[2], recommendation: 'start',   reason: 'Barkley gets a tough matchup this week but his volume is too good to sit.',                    matchupGrade: 'D', confidence: 0.72 },
    { player: MY_ROSTER.starters[3], recommendation: 'start',   reason: "Chase faces a neutral coverage. Still a top-3 WR — start with confidence.",                   matchupGrade: 'C', confidence: 0.80 },
    { player: MY_ROSTER.starters[4], recommendation: 'sit',     reason: '⛔ Tyreek Hill is on BYE this week. He cannot play.',                                          matchupGrade: 'F', confidence: 1.00, byeFlag: true },
    { player: MY_ROSTER.starters[5], recommendation: 'start',   reason: 'LaPorta gets a grade-A matchup against Blitz Kings — weak at TE all season.',                  matchupGrade: 'A', confidence: 0.90 },
    { player: MY_ROSTER.bench[0],    recommendation: 'start',   reason: 'Josh Downs steps up as FLEX this week with Hill on bye. Decent matchup.',                      matchupGrade: 'B', confidence: 0.74 },
    { player: MY_ROSTER.bench[4],    recommendation: 'sit',     reason: 'Moore is a low-floor option. Downs is the better play this week.',                             matchupGrade: 'C', confidence: 0.65 },
    { player: MY_ROSTER.starters[7], recommendation: 'sit',     reason: '⛔ Butker is on BYE this week. Pick up a kicker off waivers.',                                 matchupGrade: 'F', confidence: 1.00, byeFlag: true },
  ],
  16: [
    { player: MY_ROSTER.starters[0], recommendation: 'sit',     reason: '⛔ Lamar Jackson is on BYE in week 16. Start your backup QB.',                                 matchupGrade: 'F', confidence: 1.00, byeFlag: true },
    { player: MY_ROSTER.bench[5],    recommendation: 'start',   reason: 'Bailey Zappe starts with Lamar on bye. Manageable matchup — he gets the nod.',                 matchupGrade: 'C', confidence: 0.68 },
    { player: MY_ROSTER.starters[1], recommendation: 'start',   reason: 'CMC gets a favorable matchup in week 16. High-ceiling game if healthy.',                       matchupGrade: 'B', confidence: 0.82 },
    { player: MY_ROSTER.starters[2], recommendation: 'start',   reason: "End Zone Elite is weak against RBs. Barkley is a top-3 play this week.",                      matchupGrade: 'B', confidence: 0.88 },
    { player: MY_ROSTER.starters[3], recommendation: 'start',   reason: "Chase gets a grade-A matchup. WR1 ceiling this week.",                                         matchupGrade: 'A', confidence: 0.92 },
    { player: MY_ROSTER.starters[4], recommendation: 'start',   reason: 'Hill is back from bye. End Zone Elite weak vs WRs — high upside.',                            matchupGrade: 'A', confidence: 0.85 },
    { player: MY_ROSTER.starters[5], recommendation: 'sit',     reason: 'End Zone Elite is strong against TEs. Consider a streaming option.',                          matchupGrade: 'D', confidence: 0.78 },
    { player: MY_ROSTER.bench[2],    recommendation: 'start',   reason: 'Jonnu Smith gets a better matchup than LaPorta this week. Slot him in at TE.',                matchupGrade: 'B', confidence: 0.72 },
    { player: MY_ROSTER.starters[6], recommendation: 'start',   reason: 'Diggs vs End Zone Elite secondary — grade A matchup. Strong FLEX play.',                      matchupGrade: 'A', confidence: 0.80 },
    { player: MY_ROSTER.starters[8], recommendation: 'sit',     reason: '⛔ SF DEF is on BYE in week 16. Stream a defense off waivers.',                               matchupGrade: 'F', confidence: 1.00, byeFlag: true },
  ],
};

// ─── Draft Player Pool ────────────────────────────────────────────────────────
// Used by the draft companion when Yahoo API is pending
export const DRAFT_POOL = [
  // QBs
  { id: 'd1',  name: 'Lamar Jackson',        position: 'QB',  team: 'BAL', adp: 1.8,  projectedPts: 32.4, bye: 14 },
  { id: 'd2',  name: 'Josh Allen',            position: 'QB',  team: 'BUF', adp: 3.2,  projectedPts: 31.2, bye: 12 },
  { id: 'd3',  name: 'Jalen Hurts',           position: 'QB',  team: 'PHI', adp: 4.1,  projectedPts: 29.8, bye: 5  },
  { id: 'd4',  name: 'Dak Prescott',          position: 'QB',  team: 'DAL', adp: 9.4,  projectedPts: 24.6, bye: 7  },
  { id: 'd5',  name: 'Joe Burrow',            position: 'QB',  team: 'CIN', adp: 10.2, projectedPts: 24.1, bye: 9  },
  { id: 'd6',  name: 'C.J. Stroud',           position: 'QB',  team: 'HOU', adp: 12.8, projectedPts: 22.4, bye: 14 },
  { id: 'd7',  name: 'Anthony Richardson',    position: 'QB',  team: 'IND', adp: 14.6, projectedPts: 21.8, bye: 14 },
  { id: 'd8',  name: 'Jordan Love',           position: 'QB',  team: 'GB',  adp: 16.2, projectedPts: 21.2, bye: 10 },
  // RBs
  { id: 'd9',  name: 'Christian McCaffrey',   position: 'RB',  team: 'SF',  adp: 2.1,  projectedPts: 28.6, bye: 9  },
  { id: 'd10', name: 'Saquon Barkley',        position: 'RB',  team: 'PHI', adp: 5.4,  projectedPts: 24.2, bye: 5  },
  { id: 'd11', name: 'Derrick Henry',         position: 'RB',  team: 'TEN', adp: 6.2,  projectedPts: 23.1, bye: 5  },
  { id: 'd12', name: 'Breece Hall',           position: 'RB',  team: 'NYJ', adp: 7.8,  projectedPts: 22.4, bye: 12 },
  { id: 'd13', name: 'De\'Von Achane',        position: 'RB',  team: 'MIA', adp: 8.4,  projectedPts: 21.8, bye: 10 },
  { id: 'd14', name: 'Tony Pollard',          position: 'RB',  team: 'TEN', adp: 11.2, projectedPts: 19.6, bye: 5  },
  { id: 'd15', name: 'Travis Etienne',        position: 'RB',  team: 'JAX', adp: 12.6, projectedPts: 18.4, bye: 11 },
  { id: 'd16', name: 'Josh Jacobs',           position: 'RB',  team: 'GB',  adp: 13.4, projectedPts: 17.9, bye: 10 },
  { id: 'd17', name: 'Aaron Jones',           position: 'RB',  team: 'MIN', adp: 18.2, projectedPts: 16.4, bye: 6  },
  { id: 'd18', name: 'Jaylen Warren',         position: 'RB',  team: 'PIT', adp: 22.4, projectedPts: 14.2, bye: 9  },
  { id: 'd19', name: 'Tyjae Spears',          position: 'RB',  team: 'TEN', adp: 24.1, projectedPts: 13.8, bye: 5  },
  { id: 'd20', name: 'Gus Edwards',           position: 'RB',  team: 'LAC', adp: 28.6, projectedPts: 12.4, bye: 5  },
  // WRs
  { id: 'd21', name: 'CeeDee Lamb',           position: 'WR',  team: 'DAL', adp: 2.4,  projectedPts: 26.8, bye: 7  },
  { id: 'd22', name: "Ja'Marr Chase",         position: 'WR',  team: 'CIN', adp: 3.8,  projectedPts: 24.6, bye: 9  },
  { id: 'd23', name: 'Tyreek Hill',           position: 'WR',  team: 'MIA', adp: 4.6,  projectedPts: 23.2, bye: 10 },
  { id: 'd24', name: 'Amon-Ra St. Brown',     position: 'WR',  team: 'DET', adp: 7.2,  projectedPts: 22.1, bye: 11 },
  { id: 'd25', name: 'Puka Nacua',            position: 'WR',  team: 'LAR', adp: 9.8,  projectedPts: 20.4, bye: 6  },
  { id: 'd26', name: 'Stefon Diggs',          position: 'WR',  team: 'NE',  adp: 10.6, projectedPts: 18.8, bye: 14 },
  { id: 'd27', name: 'Davante Adams',         position: 'WR',  team: 'LV',  adp: 11.4, projectedPts: 18.2, bye: 8  },
  { id: 'd28', name: 'DJ Moore',              position: 'WR',  team: 'CHI', adp: 14.2, projectedPts: 17.6, bye: 7  },
  { id: 'd29', name: 'Keenan Allen',          position: 'WR',  team: 'CHI', adp: 16.8, projectedPts: 16.9, bye: 7  },
  { id: 'd30', name: 'Josh Downs',            position: 'WR',  team: 'IND', adp: 19.4, projectedPts: 15.2, bye: 14 },
  { id: 'd31', name: 'Jaylen Waddle',         position: 'WR',  team: 'MIA', adp: 20.2, projectedPts: 14.8, bye: 10 },
  { id: 'd32', name: 'Elijah Moore',          position: 'WR',  team: 'CLE', adp: 26.4, projectedPts: 11.2, bye: 5  },
  // TEs
  { id: 'd33', name: 'Sam LaPorta',           position: 'TE',  team: 'DET', adp: 8.8,  projectedPts: 16.4, bye: 11 },
  { id: 'd34', name: 'Mark Andrews',          position: 'TE',  team: 'BAL', adp: 9.2,  projectedPts: 15.8, bye: 14 },
  { id: 'd35', name: 'Trey McBride',          position: 'TE',  team: 'ARI', adp: 10.8, projectedPts: 14.6, bye: 11 },
  { id: 'd36', name: 'Jake Ferguson',         position: 'TE',  team: 'DAL', adp: 14.4, projectedPts: 12.8, bye: 7  },
  { id: 'd37', name: 'Jonnu Smith',           position: 'TE',  team: 'MIA', adp: 18.6, projectedPts: 10.4, bye: 10 },
  { id: 'd38', name: 'Cole Kmet',             position: 'TE',  team: 'CHI', adp: 20.4, projectedPts: 9.8,  bye: 7  },
  // Ks
  { id: 'd39', name: 'Harrison Butker',       position: 'K',   team: 'KC',  adp: 36.2, projectedPts: 10.8, bye: 10 },
  { id: 'd40', name: 'Evan McPherson',        position: 'K',   team: 'CIN', adp: 37.4, projectedPts: 10.4, bye: 9  },
  { id: 'd41', name: 'Brandon Aubrey',        position: 'K',   team: 'DAL', adp: 38.1, projectedPts: 10.2, bye: 7  },
  { id: 'd42', name: 'Jake Elliott',          position: 'K',   team: 'PHI', adp: 39.2, projectedPts: 9.8,  bye: 5  },
  { id: 'd43', name: 'Tyler Bass',            position: 'K',   team: 'BUF', adp: 40.6, projectedPts: 9.4,  bye: 12 },
  // DEFs
  { id: 'd44', name: 'San Francisco 49ers',   position: 'DEF', team: 'SF',  adp: 34.8, projectedPts: 12.4, bye: 9  },
  { id: 'd45', name: 'Dallas Cowboys',        position: 'DEF', team: 'DAL', adp: 35.2, projectedPts: 11.8, bye: 7  },
  { id: 'd46', name: 'Baltimore Ravens',      position: 'DEF', team: 'BAL', adp: 35.6, projectedPts: 11.6, bye: 14 },
  { id: 'd47', name: 'New York Jets',         position: 'DEF', team: 'NYJ', adp: 36.4, projectedPts: 11.2, bye: 12 },
  { id: 'd48', name: 'Cleveland Browns',      position: 'DEF', team: 'CLE', adp: 37.8, projectedPts: 10.6, bye: 5  },
  { id: 'd49', name: 'Pittsburgh Steelers',   position: 'DEF', team: 'PIT', adp: 38.4, projectedPts: 10.4, bye: 9  },
  { id: 'd50', name: 'Kansas City Chiefs',    position: 'DEF', team: 'KC',  adp: 39.6, projectedPts: 9.8,  bye: 10 },
];

// Roster slot requirements (standard 15-round PPR)
export const ROSTER_REQUIREMENTS = {
  QB: 2, RB: 4, WR: 4, TE: 2, K: 1, DEF: 1,
};

export const DRAFT_ORDER = [
  { pick: 1, round: 1, team: 'Gridiron Ghosts',   player: 'Christian McCaffrey', position: 'RB' },
  { pick: 2, round: 1, team: "Frogman's Squad",   player: 'Lamar Jackson',       position: 'QB', isMe: true },
  { pick: 3, round: 1, team: 'Blitz Kings',        player: 'CeeDee Lamb',        position: 'WR' },
  { pick: 4, round: 1, team: 'End Zone Elite',     player: 'Tyreek Hill',         position: 'WR' },
  { pick: 5, round: 1, team: 'Touchdown Tyrants',  player: 'Saquon Barkley',     position: 'RB' },
  { pick: 6, round: 1, team: 'Red Zone Rangers',   player: "Ja'Marr Chase",      position: 'WR' },
];

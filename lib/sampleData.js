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
  numTeams: 12,
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

export const DRAFT_ORDER = [
  { pick: 1, round: 1, team: 'Gridiron Ghosts',   player: 'Christian McCaffrey', position: 'RB' },
  { pick: 2, round: 1, team: "Frogman's Squad",   player: 'Lamar Jackson',       position: 'QB', isMe: true },
  { pick: 3, round: 1, team: 'Blitz Kings',        player: 'CeeDee Lamb',        position: 'WR' },
  { pick: 4, round: 1, team: 'End Zone Elite',     player: 'Tyreek Hill',         position: 'WR' },
  { pick: 5, round: 1, team: 'Touchdown Tyrants',  player: 'Saquon Barkley',     position: 'RB' },
  { pick: 6, round: 1, team: 'Red Zone Rangers',   player: "Ja'Marr Chase",      position: 'WR' },
];

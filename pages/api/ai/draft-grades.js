/**
 * POST /api/ai/draft-grades
 * Generates letter grades + comparative narrative for the user's drafted team
 * relative to all other teams in the league.
 *
 * Body: { gradesData: <object from /api/yahoo/draft-grades>, leagueKey: string }
 * Returns: { overallGrade, positions: [{key, grade, rank, total, commentary}], narrative, tradeTargets }
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Convert a rank (1-based, lower=better) + total teams into a letter grade.
 * Top 15% = A, 15-30% = B+, 30-50% = B, 50-70% = C+, 70-85% = C, 85-100% = D/F
 */
function rankToGrade(rank, total) {
  const pct = rank / total;
  if (pct <= 0.10) return 'A+';
  if (pct <= 0.20) return 'A';
  if (pct <= 0.30) return 'A-';
  if (pct <= 0.40) return 'B+';
  if (pct <= 0.50) return 'B';
  if (pct <= 0.60) return 'B-';
  if (pct <= 0.70) return 'C+';
  if (pct <= 0.80) return 'C';
  if (pct <= 0.90) return 'C-';
  return 'D';
}

/** Average multiple grades (A+ = 12 ... D = 1) */
function gradeToNum(g) {
  const map = { 'A+': 12, 'A': 11, 'A-': 10, 'B+': 9, 'B': 8, 'B-': 7, 'C+': 6, 'C': 5, 'C-': 4, 'D': 1 };
  return map[g] || 5;
}
function numToGrade(n) {
  if (n >= 11.5) return 'A+';
  if (n >= 10.5) return 'A';
  if (n >= 9.5)  return 'A-';
  if (n >= 8.5)  return 'B+';
  if (n >= 7.5)  return 'B';
  if (n >= 6.5)  return 'B-';
  if (n >= 5.5)  return 'C+';
  if (n >= 4.5)  return 'C';
  if (n >= 3.5)  return 'C-';
  return 'D';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const { gradesData } = req.body;
  if (!gradesData?.myTeam) {
    return res.status(400).json({ error: 'gradesData missing myTeam.' });
  }

  const { myTeam, numTeams, leagueTable, scoringSummary } = gradesData;
  const { ranks, analysis, name: teamName } = myTeam;

  // Calculate position grades
  const positionGrades = [
    { key: 'QB',    rank: ranks.QB,    label: 'QB Room'    },
    { key: 'RB',    rank: ranks.RB,    label: 'RB Room'    },
    { key: 'WR',    rank: ranks.WR,    label: 'WR Room'    },
    { key: 'TE',    rank: ranks.TE,    label: 'TE Room'    },
    { key: 'FLEX',  rank: ranks.FLEX,  label: 'FLEX Depth' },
    { key: 'depth', rank: ranks.depth, label: 'Bench Depth'},
    { key: 'bye',   rank: ranks.bye,   label: 'Bye Risk'   },
  ].filter(p => p.rank > 0).map(p => ({
    ...p,
    grade: rankToGrade(p.rank, numTeams),
    pts:   analysis.positionGroups[p.key] || 0,
  }));

  const coreGrades = positionGrades
    .filter(p => ['QB','RB','WR','TE'].includes(p.key))
    .map(p => gradeToNum(p.grade));
  const avgCore = coreGrades.length ? coreGrades.reduce((a, b) => a + b, 0) / coreGrades.length : 7;
  const overallGrade = numToGrade(avgCore);

  // Rank in full league table
  const myOverallRank = ranks.total;

  // Build prompt context
  const positionSummary = positionGrades.map(p =>
    `${p.label}: #${p.rank} of ${numTeams} (${p.grade})`
  ).join(', ');

  const leagueTableText = leagueTable
    .map(t => `${t.overallRank}. ${t.name}${t.isMyTeam ? ' ← YOU' : ''} — ${t.totalProjPts} proj pts`)
    .join('\n');

  const myStarters = myTeam.starters?.length
    ? myTeam.starters
        .sort((a, b) => b.projectedPts - a.projectedPts)
        .slice(0, 8)
        .map(p => `${p.name} (${p.position}) — ${p.projectedPts} proj pts`)
        .join(', ')
    : 'N/A';

  const byeNote = analysis.byeRiskScore >= 4
    ? `You have ${analysis.byeRiskScore} starters on the same bye week — this will hurt you when it comes.`
    : null;

  const prompt = `You are a sharp fantasy football analyst reviewing a team's draft performance relative to ALL other teams in the league.

League info:
- ${numTeams} teams total
- ${scoringSummary || 'Standard scoring'}
- My team: "${teamName}" — ranked #${myOverallRank} of ${numTeams} overall by projected points

Position group rankings (vs the whole league):
${positionSummary}

My best starters: ${myStarters}

Full league standings by projected season points:
${leagueTableText}
${byeNote ? `\nBye week warning: ${byeNote}` : ''}

Write a draft report card in this EXACT JSON format:

{
  "narrative": "3-4 sentences. Be direct. Lead with overall standing. Call out the 1-2 clear strengths and the 1 biggest vulnerability. Name actual players or positions. No ADP, no 'reached for' language — only league comparison.",
  "strengths": ["One short phrase identifying best position room", "Second strength"],
  "vulnerabilities": ["One phrase — their #1 weakness vs the league"],
  "tradeTargets": "One sentence: what position to target in trades and why, based on their rank in that group.",
  "byeAlert": ${byeNote ? `"${byeNote}"` : 'null'}
}

Be specific, confident, use the actual data. No filler sentences. If their WR room is #1, say it and why it matters. If their TE is last, say it plainly.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI response malformed' });

    const aiOutput = JSON.parse(jsonMatch[0]);

    return res.json({
      overallGrade,
      overallRank: myOverallRank,
      numTeams,
      totalProjPts: analysis.totalProjPts,
      positionGrades,
      concentrationRisk: analysis.concentrationRisk,
      byeRiskScore: analysis.byeRiskScore,
      ...aiOutput,
    });

  } catch (err) {
    console.error('AI draft grades error:', err);
    return res.status(500).json({ error: 'AI grading failed. Try again.' });
  }
}

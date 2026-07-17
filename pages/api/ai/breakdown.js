/**
 * POST /api/ai/breakdown
 * Monday Morning Breakdown — AI narrative recap of last week's matchup.
 *
 * Body: {
 *   week, result, myScore, oppScore, oppTeamName,
 *   starters: [{name, position, editorialTeam, points}],
 *   bench:    [{name, position, editorialTeam, points}],
 *   scoringSummary: string | null
 * }
 *
 * Returns: {
 *   headline, narrative,
 *   topPerformer:  { name, points, note },
 *   benchBomb:     { name, points, note } | null,
 *   biggestBust:   { name, points, note } | null,
 *   nextWeekTip:   string
 * }
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const {
    week, result, myScore, oppScore, oppTeamName,
    starters = [], bench = [], scoringSummary,
  } = req.body;

  if (!week || !result) return res.status(400).json({ error: 'Missing matchup data' });

  // --- Pre-compute key stats to give AI accurate numbers ---
  const sortedStarters = [...starters].sort((a, b) => b.points - a.points);
  const topPerformerRaw  = sortedStarters[0] || null;
  const worstStarterRaw  = sortedStarters[sortedStarters.length - 1] || null;
  const benchBombRaw     = [...bench].sort((a, b) => b.points - a.points)[0] || null;
  const margin           = Math.abs(myScore - oppScore).toFixed(1);
  const benchBombWouldHaveHelped =
    benchBombRaw && worstStarterRaw &&
    benchBombRaw.points > worstStarterRaw.points;

  const startersText = starters.map(p =>
    `  ${p.selectedPosition || p.position}: ${p.name} (${p.editorialTeam}) — ${p.points.toFixed(1)} pts`
  ).join('\n');

  const benchText = bench.map(p =>
    `  BN: ${p.name} (${p.position}, ${p.editorialTeam}) — ${p.points.toFixed(1)} pts`
  ).join('\n');

  const resultWord = result === 'won' ? 'WON' : result === 'lost' ? 'LOST' : 'TIED';
  const scoringContext = scoringSummary ? `\nLeague: ${scoringSummary}` : '';

  const prompt = `You are Orange — a sharp, direct fantasy football analyst writing a Monday morning breakdown. No fluff. No generic advice. Write like a smart friend who actually watched the games.${scoringContext}

WEEK ${week} RESULT: ${resultWord} ${myScore.toFixed(1)}–${oppScore.toFixed(1)} vs ${oppTeamName}
Margin: ${margin} points

STARTERS (actual points scored):
${startersText}

BENCH:
${benchText}

Key facts already calculated:
- Top performer: ${topPerformerRaw?.name || 'N/A'} with ${topPerformerRaw?.points?.toFixed(1) || 0} pts
- Worst starter: ${worstStarterRaw?.name || 'N/A'} with ${worstStarterRaw?.points?.toFixed(1) || 0} pts
- Highest bench player: ${benchBombRaw?.name || 'N/A'} with ${benchBombRaw?.points?.toFixed(1) || 0} pts
- Swapping ${worstStarterRaw?.name || 'N/A'} for ${benchBombRaw?.name || 'N/A'} would have ${benchBombWouldHaveHelped ? 'helped' : 'not helped'}

Write the breakdown as a JSON object with these exact fields:
{
  "headline": "One punchy 5-8 word headline for this game. No punctuation at the end.",
  "narrative": "2-3 sharp sentences. Reference actual players and actual point totals. Be specific about what carried the team, what hurt, and whether the margin was comfortable or a sweat. Mention the bench bomb only if it's genuinely notable (e.g., it's more than 10 pts and would have changed the outcome).",
  "topPerformer": { "name": "${topPerformerRaw?.name || ''}", "points": ${topPerformerRaw?.points?.toFixed(1) || 0}, "note": "One sentence on why they were the MVP this week." },
  "benchBomb": ${benchBombRaw && benchBombRaw.points >= 5 ? `{ "name": "${benchBombRaw.name}", "points": ${benchBombRaw.points.toFixed(1)}, "note": "One sentence — sting or relief depending on if it would have changed the result." }` : 'null'},
  "biggestBust": ${worstStarterRaw && worstStarterRaw.points < 8 ? `{ "name": "${worstStarterRaw.name}", "points": ${worstStarterRaw.points.toFixed(1)}, "note": "One sentence on why they let the team down." }` : 'null'},
  "nextWeekTip": "One actionable sentence: what should this manager focus on heading into next week? Reference a specific player or positional need."
}

Respond with the JSON only. No extra text.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI response malformed' });

    const parsed = JSON.parse(jsonMatch[0]);
    return res.json(parsed);
  } catch (err) {
    console.error('AI breakdown error:', err);
    return res.status(500).json({ error: 'AI breakdown failed. Try again.' });
  }
}

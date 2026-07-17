/**
 * POST /api/ai/waiver
 * AI-powered waiver wire recommendations.
 *
 * Body: { players: [...top15], roster: [...myRoster], leagueKey: string }
 * Returns: { picks: [{name, position, team, reason}], insight: string }
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getLeagueSummary(supabase, userId, leagueKey) {
  if (!leagueKey) return null;
  const { data } = await supabase
    .from('league_settings')
    .select('scoring_summary')
    .eq('user_id', userId)
    .eq('league_key', leagueKey)
    .single();
  return data?.scoring_summary || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const { players = [], roster = [], leagueKey } = req.body;
  if (!players.length) return res.status(400).json({ error: 'No players provided' });

  // Pull cached league settings for scoring context
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const scoringSummary = await getLeagueSummary(serviceClient, user.id, leagueKey);
  const scoringContext = scoringSummary
    ? `\nLeague scoring: ${scoringSummary}`
    : '';

  const rosterText = roster.length
    ? roster.map(p => `- ${p.name} (${p.position}, ${p.editorialTeam || 'FA'})`).join('\n')
    : 'No roster data provided.';

  const availableText = players.slice(0, 15).map((p, i) =>
    `${i + 1}. ${p.name} (${p.position}, ${p.editorialTeam || '?'}) — ` +
    `Proj: ${p.projectedPts?.toFixed(1) || '?'} pts` +
    `${p.injuryNote ? ` [${p.injuryNote}]` : ''}` +
    ` | Orange Score: ${p.score}`
  ).join('\n');

  const prompt = `You are an expert fantasy football analyst. A manager needs waiver wire advice for this week.${scoringContext}

Their current roster:
${rosterText}

Top available players ranked by Orange's algorithm:
${availableText}

Give exactly 3 pickup recommendations. For each, give one sharp sentence on why they should add this player THIS week. Factor in the league's scoring format when evaluating reception-heavy players. Focus on: opportunity (injuries creating openings), matchup, recent targets/carries, bye week coverage needs.

Respond in this exact JSON format — nothing else:
{
  "picks": [
    { "name": "Player Name", "position": "POS", "team": "TEAM", "reason": "One sharp sentence." },
    { "name": "Player Name", "position": "POS", "team": "TEAM", "reason": "One sharp sentence." },
    { "name": "Player Name", "position": "POS", "team": "TEAM", "reason": "One sharp sentence." }
  ],
  "insight": "One sentence about the waiver wire landscape this week that most managers will miss."
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI response malformed' });

    return res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('AI waiver error:', err);
    return res.status(500).json({ error: 'AI waiver analysis failed.' });
  }
}

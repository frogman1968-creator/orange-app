/**
 * POST /api/ai/draft
 * AI-powered draft pick recommendation.
 *
 * Body: { roster, available, round, pick, draftPosition, numTeams }
 * Returns: { pick: { name, position, team }, reason, insight }
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

  const { roster = [], available = [], round = 1, pick = 1, draftPosition = 1, numTeams = 10 } = req.body;

  const rosterText = roster.length === 0
    ? 'No players drafted yet.'
    : roster.map(p => `- ${p.name} (${p.position}, ${p.team}) — drafted R${p.draftedRound}`).join('\n');

  const availableText = available.slice(0, 20).map((p, i) =>
    `${i + 1}. ${p.name} (${p.position}, ${p.team}) — ADP ${p.adp?.toFixed(1)}, Proj ${p.projectedPts?.toFixed(1)} pts, Bye Wk ${p.bye}`
  ).join('\n');

  const prompt = `You are an expert fantasy football draft analyst. Give a single, confident pick recommendation.

Draft context:
- Round ${round}, Pick #${pick} overall
- Manager's draft slot: #${draftPosition} of ${numTeams} teams
- Snake draft format

Current roster:
${rosterText}

Top available players (ranked by Orange's scoring algorithm):
${availableText}

Respond in this exact JSON format — nothing else:
{
  "pick": {
    "name": "Player Full Name",
    "position": "POS",
    "team": "TEAM"
  },
  "reason": "One sharp sentence explaining why this is the right pick right now.",
  "insight": "One sentence about a risk or opportunity the manager should watch for this season."
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'AI response malformed' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.json(parsed);
  } catch (err) {
    console.error('AI draft error:', err);
    return res.status(500).json({ error: 'AI draft recommendation failed.' });
  }
}

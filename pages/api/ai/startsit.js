/**
 * POST /api/ai/startsit
 * Takes the user's roster and returns AI-powered start/sit recommendations.
 *
 * Body: { roster: [...players], matchup: {...}, scoringType: 'head' | 'ppr' | 'standard' }
 * Returns: { recommendations: [...], analysis: string }
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Auth check
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const { roster = [], matchup = null, scoringType = 'head' } = req.body;

  if (!roster.length) {
    return res.status(400).json({ error: 'No roster provided' });
  }

  // Build a concise roster summary for the prompt
  const rosterText = roster.map(p => {
    const status = p.injuryNote ? ` [${p.injuryNote}]` : (p.status && p.status !== 'active' ? ` [${p.status.toUpperCase()}]` : '');
    return `- ${p.name} (${p.position}, ${p.editorialTeam || 'FA'})${status} — slot: ${p.selectedPosition}`;
  }).join('\n');

  const matchupText = matchup
    ? `This week they face ${matchup.opponent?.name || 'unknown opponent'}.`
    : 'No matchup data available.';

  const scoringLabel = scoringType === 'ppr' ? 'PPR' : scoringType === 'standard' ? 'Standard' : 'Head-to-Head';

  const prompt = `You are an expert fantasy football analyst. A manager needs start/sit advice for their ${scoringLabel} league.

Their roster:
${rosterText}

${matchupText}

Based on this roster, provide:
1. TOP 3 STARTS — the 3 players they should definitely start this week, with a one-sentence reason for each.
2. SIT THIS WEEK — any players they should consider sitting (injured, bad matchup, poor form), with a brief reason.
3. ONE KEY INSIGHT — one sharp observation about their roster situation this week.

Be direct and specific. No generic advice. Reference the actual players by name.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content?.[0]?.text || '';

    return res.json({ analysis: text });
  } catch (err) {
    console.error('AI startsit error:', err);
    return res.status(500).json({ error: 'AI analysis failed. Try again.' });
  }
}

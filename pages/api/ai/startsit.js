/**
 * POST /api/ai/startsit
 * AI-powered start/sit recommendations.
 *
 * Body: { roster: [...players], matchup: {...}, leagueKey: string }
 * Returns: { analysis: string }
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getLeagueContext(supabase, userId, leagueKey) {
  if (!leagueKey) return null;
  const { data } = await supabase
    .from('league_settings')
    .select('scoring_summary, scoring_format, roster_positions')
    .eq('user_id', userId)
    .eq('league_key', leagueKey)
    .single();
  return data || null;
}

function buildFlexContext(rosterPositions) {
  if (!rosterPositions?.length) return null;
  const flexSlots = rosterPositions.filter(rp =>
    rp.position !== 'BN' && rp.position !== 'IR' && rp.position.includes('/')
  );
  if (!flexSlots.length) return null;
  return flexSlots.map(rp =>
    `${rp.count}x FLEX slot accepts: ${rp.position.split('/').join(', ')}`
  ).join('. ');
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

  const { roster = [], matchup = null, leagueKey } = req.body;
  if (!roster.length) return res.status(400).json({ error: 'No roster provided' });

  // Pull cached league settings
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const leagueCtx = await getLeagueContext(serviceClient, user.id, leagueKey);

  const scoringContext = leagueCtx?.scoring_summary
    ? `\nLeague: ${leagueCtx.scoring_summary}`
    : '';
  const flexContext = buildFlexContext(leagueCtx?.roster_positions);
  const flexNote = flexContext ? `\nFlex slots: ${flexContext}` : '';

  const scoringLabel = leagueCtx?.scoring_format || 'Head-to-Head';

  const rosterText = roster.map(p => {
    const statusNote = p.injuryNote
      ? ` [${p.injuryNote}]`
      : (p.status && p.status !== 'active' ? ` [${p.status.toUpperCase()}]` : '');
    return `- ${p.name} (${p.position}, ${p.editorialTeam || 'FA'})${statusNote} — slot: ${p.selectedPosition}`;
  }).join('\n');

  const matchupText = matchup
    ? `This week they face ${matchup.opponent?.name || 'unknown opponent'}.`
    : 'No matchup data available.';

  const prompt = `You are an expert fantasy football analyst. A manager needs start/sit advice for their ${scoringLabel} league.${scoringContext}${flexNote}

Their roster:
${rosterText}

${matchupText}

Based on this roster and the league's specific scoring rules, provide:
1. TOP 3 STARTS — the 3 players they should definitely start this week, with a one-sentence reason for each. Factor in reception value if this is a PPR or Half-PPR league.
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

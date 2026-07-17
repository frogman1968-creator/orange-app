/**
 * POST /api/ai/draft
 * AI-powered draft pick recommendation.
 * Uses the league's actual roster structure (not hardcoded) to determine positional needs.
 *
 * Body: { roster, available, round, pick, draftPosition, numTeams, leagueKey }
 * Returns: { pick: { name, position, team }, reason, insight }
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Build a human-readable roster structure and positional needs analysis.
 * rosterPositions: [{position: "QB", count: 1}, {position: "W/R/T", count: 1}, ...]
 * currentRoster:   [{name, position, team, draftedRound}]
 */
function buildRosterContext(rosterPositions, currentRoster) {
  if (!rosterPositions?.length) return null;

  // Build structure string
  const starterSlots = rosterPositions
    .filter(rp => rp.position !== 'BN' && rp.position !== 'IR')
    .map(rp => {
      const isFlex = rp.position.includes('/');
      const label  = isFlex ? `${rp.position} FLEX` : rp.position;
      return rp.count > 1 ? `${rp.count}x ${label}` : `1x ${label}`;
    })
    .join(', ');

  const benchCount = rosterPositions.find(rp => rp.position === 'BN')?.count || 0;

  // Count what the user has drafted by position
  const drafted = {};
  for (const p of currentRoster) {
    drafted[p.position] = (drafted[p.position] || 0) + 1;
  }

  // Calculate gaps for pure (non-flex) positions
  const gaps = [];
  for (const slot of rosterPositions) {
    if (slot.position === 'BN' || slot.position === 'IR') continue;
    const isFlex = slot.position.includes('/');

    if (!isFlex) {
      const have      = drafted[slot.position] || 0;
      const stillNeed = Math.max(0, slot.count - have);
      if (stillNeed > 0) {
        gaps.push(`${slot.position}: need ${stillNeed} more (have ${have}, need ${slot.count})`);
      }
    } else {
      // For FLEX slots, list eligible positions
      const eligible = slot.position.split('/').join(', ');
      gaps.push(`${slot.count}x FLEX (${eligible} eligible) — fill after core positions`);
    }
  }

  return {
    structureText: `Starters: ${starterSlots}. Bench: ${benchCount} spots.`,
    gapsText: gaps.length ? gaps.join('\n') : 'All starter positions are filled.',
  };
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

  const {
    roster = [], available = [], round = 1, pick = 1,
    draftPosition = 1, numTeams = 10, leagueKey,
  } = req.body;

  // Pull roster positions from Supabase cache
  let rosterPositions = null;
  let scoringSummary  = null;
  if (leagueKey) {
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: settings } = await serviceClient
      .from('league_settings')
      .select('roster_positions, scoring_summary')
      .eq('user_id', user.id)
      .eq('league_key', leagueKey)
      .single();

    rosterPositions = settings?.roster_positions || null;
    scoringSummary  = settings?.scoring_summary  || null;
  }

  // Build roster context from actual league structure
  const rosterCtx = buildRosterContext(rosterPositions, roster);

  const rosterText = roster.length === 0
    ? 'No players drafted yet.'
    : roster.map(p => `- ${p.name} (${p.position}, ${p.team}) — R${p.draftedRound}`).join('\n');

  const availableText = available.slice(0, 20).map((p, i) =>
    `${i + 1}. ${p.name} (${p.position}, ${p.team}) — ADP ${p.adp?.toFixed(1)}, Proj ${p.projectedPts?.toFixed(1)} pts, Bye Wk ${p.bye}`
  ).join('\n');

  const leagueStructureSection = rosterCtx
    ? `
League roster structure: ${rosterCtx.structureText}${scoringSummary ? `\nScoring: ${scoringSummary}` : ''}

Positional gaps still to fill:
${rosterCtx.gapsText}
`
    : scoringSummary ? `\nLeague scoring: ${scoringSummary}\n` : '';

  const prompt = `You are an expert fantasy football draft analyst. Give a single, confident pick recommendation.

Draft context:
- Round ${round}, Pick #${pick} overall
- Manager's draft slot: #${draftPosition} of ${numTeams} teams
- Snake draft format
${leagueStructureSection}
Current roster (${roster.length} players):
${rosterText}

Top available players:
${availableText}

Choose the single best pick RIGHT NOW given the league's specific roster requirements and what positions are still needed. If the manager is running low on a required position (e.g., needs 3 WRs but only has 1), weight that urgency heavily. Factor in ADP scarcity — if a position runs thin, draft ahead of the run.

Respond in this exact JSON format — nothing else:
{
  "pick": {
    "name": "Player Full Name",
    "position": "POS",
    "team": "TEAM"
  },
  "reason": "One sharp sentence explaining why this is the right pick right now. Reference the positional need if relevant.",
  "insight": "One sentence about a risk or opportunity the manager should watch for this season."
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI response malformed' });

    return res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('AI draft error:', err);
    return res.status(500).json({ error: 'AI draft recommendation failed.' });
  }
}

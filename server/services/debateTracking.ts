import Anthropic from "@anthropic-ai/sdk";

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
}) : null;

export interface ExtractedPosition {
  id: string;
  debaterId: string;
  debaterName: string;
  text: string;
  used: boolean;
  source: "dedicated" | "shared";
}

export interface ClaimEntry {
  speaker: string;
  claim: string;
  chunkNumber: number;
}

export interface DebateTracker {
  positions: ExtractedPosition[];
  claimsLog: ClaimEntry[];
  exhaustionSignaled: boolean;
}

export function createTracker(): DebateTracker {
  return {
    positions: [],
    claimsLog: [],
    exhaustionSignaled: false,
  };
}

export async function extractPositionsFromUpload(
  text: string,
  debaterId: string,
  debaterName: string,
  source: "dedicated" | "shared"
): Promise<ExtractedPosition[]> {
  if (!anthropic || !text || text.trim().length < 50) return [];

  const truncated = text.length > 20000 ? text.slice(0, 20000) : text;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Extract every distinct philosophical position, argument, claim, example, and objection from this text. Return ONLY a JSON array of strings, each one a self-contained statement of a single position or argument. Be exhaustive - capture every separable idea. Do not combine multiple arguments into one.

TEXT:
"""
${truncated}
"""

Return format: ["Position 1 text...", "Position 2 text...", ...]
Return ONLY the JSON array, nothing else.`
      }]
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed: string[] = JSON.parse(match[0]);
    return parsed.map((text, i) => ({
      id: `${debaterId}_${source}_${i}`,
      debaterId,
      debaterName,
      text: text.trim(),
      used: false,
      source,
    }));
  } catch (err) {
    console.error(`[DebateTracking] Failed to extract positions for ${debaterName}:`, err);
    return [];
  }
}

export async function analyzeChunkForClaims(
  chunkText: string,
  chunkNumber: number,
  speakerLabels: string[],
  tracker: DebateTracker
): Promise<{ newClaims: ClaimEntry[]; positionsUsed: string[] }> {
  if (!anthropic || !chunkText || chunkText.trim().length < 30) {
    return { newClaims: [], positionsUsed: [] };
  }

  const existingClaimsSummary = tracker.claimsLog.length > 0
    ? tracker.claimsLog.map(c => `- [${c.speaker}] ${c.claim}`).join("\n")
    : "None yet.";

  const unusedPositions = tracker.positions.filter(p => !p.used);
  const positionsList = unusedPositions.length > 0
    ? unusedPositions.map(p => `[${p.id}] ${p.text}`).join("\n")
    : "No tracked positions.";

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Analyze this debate chunk. Do two things:

1. EXTRACT CLAIMS: List every distinct philosophical claim, argument, objection, or counterexample made in this chunk. Each must be a self-contained statement identifying the speaker.

2. MATCH POSITIONS: Compare the chunk against these tracked source positions and list the IDs of any that were substantively used (same core argument, not just tangentially related):

TRACKED POSITIONS:
${positionsList}

DEBATE CHUNK:
"""
${chunkText}
"""

Return ONLY valid JSON:
{
  "claims": [{"speaker": "SPEAKER_LABEL", "claim": "concise statement of the claim"}],
  "positionsUsed": ["position_id_1", "position_id_2"]
}

Return ONLY the JSON, nothing else.`
      }]
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { newClaims: [], positionsUsed: [] };

    const parsed = JSON.parse(match[0]);
    const newClaims: ClaimEntry[] = (parsed.claims || []).map((c: any) => ({
      speaker: c.speaker || "UNKNOWN",
      claim: c.claim || "",
      chunkNumber,
    }));
    const positionsUsed: string[] = parsed.positionsUsed || [];

    return { newClaims, positionsUsed };
  } catch (err) {
    console.error(`[DebateTracking] Failed to analyze chunk ${chunkNumber}:`, err);
    return { newClaims: [], positionsUsed: [] };
  }
}

export function updateTracker(
  tracker: DebateTracker,
  newClaims: ClaimEntry[],
  positionsUsed: string[]
): void {
  tracker.claimsLog.push(...newClaims);

  for (const posId of positionsUsed) {
    const pos = tracker.positions.find(p => p.id === posId);
    if (pos) pos.used = true;
  }
}

export function getExhaustionRatio(tracker: DebateTracker, debaterId?: string): number {
  const relevant = debaterId
    ? tracker.positions.filter(p => p.debaterId === debaterId)
    : tracker.positions;
  if (relevant.length === 0) return 0;
  const usedCount = relevant.filter(p => p.used).length;
  return usedCount / relevant.length;
}

export function getOverallExhaustionRatio(tracker: DebateTracker): number {
  return getExhaustionRatio(tracker);
}

export function formatAntiRepetitionPrompt(tracker: DebateTracker): string {
  if (tracker.claimsLog.length === 0) return "";

  const recentClaims = tracker.claimsLog.slice(-40);
  const claimsList = recentClaims.map(c => `- [${c.speaker}] ${c.claim}`).join("\n");

  return `
=== ANTI-REPETITION LOG (DO NOT REPEAT THESE) ===
The following claims, arguments, and moves have ALREADY been made in this debate. 
Do NOT repeat any of them. "Repeat" means the same logical claim, same objection structure, or same counterexample pattern - even if different names, analogies, or examples are swapped in.
The ONLY permissible re-invocation is when an existing claim serves as a premise in a GENUINELY NEW argument not listed here. In that case, reference it briefly and immediately deploy it toward the new conclusion.

${claimsList}
=== END ANTI-REPETITION LOG ===
`;
}

export function formatUnusedPositionsPrompt(tracker: DebateTracker, thinkers: { id: string; name: string }[]): string {
  const unusedByDebater: Record<string, ExtractedPosition[]> = {};

  for (const thinker of thinkers) {
    const unused = tracker.positions.filter(p =>
      (p.debaterId === thinker.id || p.source === "shared") && !p.used
    );
    if (unused.length > 0) {
      unusedByDebater[thinker.name] = unused.slice(0, 6);
    }
  }

  if (Object.keys(unusedByDebater).length === 0) return "";

  let prompt = `
=== UNUSED SOURCE POSITIONS (PRIORITIZE THESE) ===
Before generating new content from general knowledge, you MUST first use these unused positions from the uploaded source material. Select the strongest unused argument that responds to the opponent's most recent point.

`;

  for (const [name, positions] of Object.entries(unusedByDebater)) {
    const total = tracker.positions.filter(p => p.debaterName === name || p.source === "shared").length;
    const used = tracker.positions.filter(p => (p.debaterName === name || p.source === "shared") && p.used).length;
    prompt += `${name.toUpperCase()}'s unused positions (${positions.length} remaining of ${total} total, ${used} already used):\n`;
    positions.forEach(p => {
      prompt += `  - ${p.text}\n`;
    });
    prompt += "\n";
  }

  prompt += `=== END UNUSED POSITIONS ===
`;
  return prompt;
}

export function checkExhaustion(
  tracker: DebateTracker,
  thinkers: { id: string; name: string }[]
): { exhausted: boolean; message: string } {
  if (tracker.positions.length === 0) return { exhausted: false, message: "" };
  if (tracker.exhaustionSignaled) return { exhausted: false, message: "" };

  const ratio = getOverallExhaustionRatio(tracker);
  if (ratio >= 0.9) {
    tracker.exhaustionSignaled = true;
    const totalPositions = tracker.positions.length;
    const usedPositions = tracker.positions.filter(p => p.used).length;

    const perDebater = thinkers.map(t => {
      const r = getExhaustionRatio(tracker, t.id);
      return `${t.name}: ${Math.round(r * 100)}% used`;
    }).join(", ");

    return {
      exhausted: true,
      message: `Source material approaching exhaustion: ${usedPositions}/${totalPositions} positions used (${Math.round(ratio * 100)}%). Per debater: ${perDebater}. Remaining content may draw from general model knowledge rather than uploaded material.`,
    };
  }

  return { exhausted: false, message: "" };
}

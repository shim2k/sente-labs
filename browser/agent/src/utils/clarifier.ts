import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ClarifyResult {
  score: number; // 1-10
  improved: string;
  suggestions: string[];
}

export async function clarifyInstruction(instruction: string, history: string[] = []): Promise<ClarifyResult> {
  const sysPrompt = `You are an assistant that evaluates how clear a SINGLE browser-automation instruction is. Take into account the RECENT TASKS list when judging clarity (they provide context about the current website).

SCORING (integer 1-10):
9-10  Perfectly clear, actionable with no ambiguity (e.g. "Go to linkedin.com", "Click the \"Jobs\" tab").
7-8   Mostly clear, minor rewrites could help but intent is obvious.
4-6   Needs clarification – missing a key detail or could be interpreted multiple ways.
1-3   Very ambiguous or multiple unrelated actions.

CONTEXT RULES
• If the instruction is generic (e.g. "log in", "sign out", "scroll down") BUT the recent tasks clearly show that the agent is already on a specific site, treat it as clear (score ≥ 8).
• Very short navigation requests like "go to linkedin" or "open google.com" are perfectly clear (score ≥ 9) – do NOT penalise brevity.

Return JSON ONLY with keys:
  score        Integer 1-10
  improved     Best single-sentence rewrite maximising success (or same string if already clear)
  suggestions  Up to 3 alternative phrasings (omit when score ≥ 8).`;

  const userPrompt = `TASK:\n${instruction}\n\nRECENT TASKS (context):\n${history.slice(-3).join('\n')}`;

  const chat = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 300,
    messages: [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: userPrompt }
    ]
  });

  let parsed: any = {};
  try {
    parsed = JSON.parse(chat.choices[0].message.content || '{}');
  } catch {
    // fallback
  }
  return {
    score: Math.max(1, Math.min(10, parsed.score || 5)),
    improved: parsed.improved || instruction,
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : []
  };
} 
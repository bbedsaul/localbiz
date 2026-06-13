import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { LetterGrade } from '../types.js';
import type { ReportItem } from './prioritize.js';
import type { Trend } from './trend.js';

export const narrativeSchema = z.object({
  headline: z.string().min(1),
  summaryParagraph: z.string().min(1),
  wins: z.array(z.string().min(1)).min(1).max(3),
  issues: z
    .array(
      z.object({
        title: z.string().min(1),
        plainExplanation: z.string().min(1),
        whyItMatters: z.string().min(1),
      }),
    )
    .max(3),
  recommendedAction: z.string().min(1),
});

export type ReportNarrative = z.infer<typeof narrativeSchema>;

export interface NarrationInput {
  business: string;
  period: string;
  grade: LetterGrade;
  composite: number;
  trend: Trend | null;
  wins: ReportItem[];
  /** Top issues only (max 3) — already ranked by business impact. */
  issues: ReportItem[];
}

export interface NarrationResult {
  narrative: ReportNarrative;
  source: 'claude' | 'fallback';
  model?: string;
  reason?: string;
}

const SYSTEM_PROMPT = `You write the monthly website report card email for SiteVitals, a monitoring service for local businesses.

You receive structured JSON with the business's scan results: grade, score, trend, wins, and issues. You fill a fixed report template. Rules, in order of importance:

1. NEVER state a number, percentage, date, or statistic that is not present in the input JSON. Do not compute, estimate, or extrapolate numbers (no "roughly 14 missed visitors"). If you want to quantify something and the number isn't in the input, describe it without numbers.
2. Write at an 8th-grade reading level. No jargon: say "security certificate" not "SSL/TLS", "show up on Google" not "SERP ranking".
3. Tone: a helpful neighbor who knows websites — warm, direct, encouraging. Never alarmist, never condescending, not a salesy auditor.
4. Always lead with what's going well before any problems.
5. Base wins on the input's wins array and issues on the input's issues array, in the order given (they are ranked by business impact). Do not invent wins or issues.
6. The recommendedAction is ONE concrete next step addressing the top issue (or a sentence of encouragement if there are no issues).

Return only the structured JSON output.`;

/** All digit-groups (2+ chars) in the narrative must appear in the input — the
 * cheap proof that no number was invented. Single digits get a pass ("3 wins"). */
export function numbersTrace(narrative: ReportNarrative, input: NarrationInput): boolean {
  const haystack = JSON.stringify(input).replace(/,/g, '');
  const text = JSON.stringify(narrative).replace(/,/g, '');
  const tokens = text.match(/\d+(?:\.\d+)?/g) ?? [];
  return tokens.filter((t) => t.length >= 2).every((t) => haystack.includes(t));
}

/** Deterministic non-AI narrative built straight from the scan data. */
export function fallbackNarrative(input: NarrationInput): ReportNarrative {
  const { business, period, grade, composite, trend, wins, issues } = input;

  const trendPhrase =
    trend === null || trend.direction === 'flat'
      ? ''
      : trend.direction === 'up'
        ? ` — up from ${trend.previousGrade} last time`
        : ` — down from ${trend.previousGrade} last time`;

  const summaryIssues =
    issues.length === 0
      ? 'Everything we checked looks healthy.'
      : `We found ${issues.length} thing${issues.length > 1 ? 's' : ''} worth fixing, listed below from most to least important.`;

  return {
    headline: `${business}: your ${period} website report card is ${grade}${trendPhrase}`,
    summaryParagraph: `${business} scored ${composite} out of 100 this ${period}. ${summaryIssues}`,
    wins:
      wins.length > 0
        ? wins.slice(0, 3).map((w) => w.detail)
        : [`We're watching ${business}'s website around the clock and will email you the moment something needs attention.`],
    issues: issues.slice(0, 3).map((issue) => ({
      title: issue.title,
      plainExplanation: issue.detail,
      whyItMatters: issue.why,
    })),
    recommendedAction:
      issues.length > 0
        ? `Start with the most important fix: ${issues[0]?.title.toLowerCase()}. ${issues[0]?.why}`
        : 'Keep doing what you’re doing — and keep an eye on next month’s report to stay ahead.',
  };
}

export type NarrationRequestFn = (input: NarrationInput) => Promise<unknown>;

export const DEFAULT_NARRATION_MODEL = 'claude-opus-4-8';

function defaultRequestFn(model: string): NarrationRequestFn {
  const client = new Anthropic();
  return async (input) => {
    const response = await client.messages.parse({
      model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(input) }],
      output_config: { format: zodOutputFormat(narrativeSchema) },
    });
    return response.parsed_output;
  };
}

export interface NarrateOptions {
  /** Injectable for tests; defaults to a real Claude API call. */
  requestFn?: NarrationRequestFn;
  model?: string;
}

/**
 * Turn scan data into the report narrative. Never throws: an invalid response
 * is retried once, then the deterministic fallback template takes over.
 */
export async function narrate(
  input: NarrationInput,
  options: NarrateOptions = {},
): Promise<NarrationResult> {
  const model = options.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_NARRATION_MODEL;

  let requestFn = options.requestFn;
  if (!requestFn) {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        narrative: fallbackNarrative(input),
        source: 'fallback',
        reason: 'ANTHROPIC_API_KEY not set',
      };
    }
    requestFn = defaultRequestFn(model);
  }

  let reason = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    let candidate: unknown;
    try {
      candidate = await requestFn(input);
    } catch (err) {
      reason = err instanceof Error ? err.message : String(err);
      continue;
    }
    const parsed = narrativeSchema.safeParse(candidate);
    if (!parsed.success) {
      reason = 'response did not match the report schema';
      continue;
    }
    if (!numbersTrace(parsed.data, input)) {
      reason = 'response contained numbers not present in the scan data';
      continue;
    }
    return { narrative: parsed.data, source: 'claude', model };
  }

  return {
    narrative: fallbackNarrative(input),
    source: 'fallback',
    reason: `narration failed twice (${reason})`,
  };
}

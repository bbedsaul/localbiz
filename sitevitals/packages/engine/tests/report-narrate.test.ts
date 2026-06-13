import { describe, expect, it, vi } from 'vitest';
import {
  fallbackNarrative,
  narrate,
  narrativeSchema,
  numbersTrace,
  type NarrationInput,
  type ReportNarrative,
} from '../src/report/narrate.js';
import { prioritizeIssues } from '../src/report/prioritize.js';
import { brokenScan } from './helpers/scan-fixtures.js';

function narrationInput(): NarrationInput {
  const scan = brokenScan();
  const { wins, issues } = prioritizeIssues(scan);
  return {
    business: "Joe's HVAC",
    period: 'June',
    grade: scan.scores.grade,
    composite: scan.scores.composite,
    trend: {
      previousGrade: 'C',
      previousComposite: 71,
      currentComposite: scan.scores.composite,
      delta: -20,
      direction: 'down',
      arrow: '↓',
    },
    wins,
    issues: issues.slice(0, 3),
  };
}

function goodNarrative(): ReportNarrative {
  return {
    headline: "Joe's HVAC: your June report card",
    summaryParagraph: 'Your website had a rough month — it was unreachable when we checked.',
    wins: ['Your domain name is in good standing.'],
    issues: [
      {
        title: 'Website was unreachable',
        plainExplanation: 'Your website answered with an error (HTTP 503) instead of loading.',
        whyItMatters: 'Customers who find nothing rarely try again.',
      },
    ],
    recommendedAction: 'Call your hosting company today and ask why the site is returning errors.',
  };
}

describe('narrate', () => {
  it('uses the Claude response when it validates', async () => {
    const requestFn = vi.fn(async () => goodNarrative());
    const result = await narrate(narrationInput(), { requestFn, model: 'test-model' });
    expect(result.source).toBe('claude');
    expect(result.model).toBe('test-model');
    expect(result.narrative.headline).toContain("Joe's HVAC");
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it('retries once on a malformed response, then succeeds', async () => {
    const requestFn = vi
      .fn()
      .mockResolvedValueOnce({ headline: 'missing everything else' })
      .mockResolvedValueOnce(goodNarrative());
    const result = await narrate(narrationInput(), { requestFn });
    expect(result.source).toBe('claude');
    expect(requestFn).toHaveBeenCalledTimes(2);
  });

  it('falls back to the template after two malformed responses', async () => {
    const requestFn = vi.fn(async () => ({ totally: 'wrong shape' }));
    const result = await narrate(narrationInput(), { requestFn });
    expect(result.source).toBe('fallback');
    expect(result.reason).toContain('schema');
    expect(requestFn).toHaveBeenCalledTimes(2);
    // Fallback output must itself satisfy the schema.
    expect(narrativeSchema.safeParse(result.narrative).success).toBe(true);
  });

  it('rejects responses that invent numbers not present in the scan data', async () => {
    const invented = goodNarrative();
    invented.issues[0]!.whyItMatters = 'Roughly 1437 customers could not reach you on Tuesday.';
    const requestFn = vi.fn(async () => invented);
    const result = await narrate(narrationInput(), { requestFn });
    expect(result.source).toBe('fallback');
    expect(result.reason).toContain('numbers');
    expect(requestFn).toHaveBeenCalledTimes(2);
  });

  it('falls back when the API errors', async () => {
    const requestFn = vi.fn(async () => {
      throw new Error('529 overloaded');
    });
    const result = await narrate(narrationInput(), { requestFn });
    expect(result.source).toBe('fallback');
    expect(result.reason).toContain('overloaded');
  });

  it('falls back immediately without an API key', async () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const result = await narrate(narrationInput());
      expect(result.source).toBe('fallback');
      expect(result.reason).toContain('ANTHROPIC_API_KEY');
    } finally {
      if (previous !== undefined) process.env.ANTHROPIC_API_KEY = previous;
    }
  });
});

describe('numbersTrace', () => {
  it('accepts numbers that come from the input', () => {
    const input = narrationInput();
    expect(numbersTrace(goodNarrative(), input)).toBe(true);
  });

  it('flags invented multi-digit numbers but tolerates single digits', () => {
    const input = narrationInput();
    const narrative = goodNarrative();
    narrative.summaryParagraph = 'We checked your site and found 3 things to fix.';
    expect(numbersTrace(narrative, input)).toBe(true);

    narrative.summaryParagraph = 'Your site lost about 250 visitors this month.';
    expect(numbersTrace(narrative, input)).toBe(false);
  });
});

describe('fallbackNarrative', () => {
  it('builds a valid narrative entirely from scan data', () => {
    const input = narrationInput();
    const narrative = fallbackNarrative(input);
    expect(narrativeSchema.safeParse(narrative).success).toBe(true);
    expect(numbersTrace(narrative, input)).toBe(true);
    expect(narrative.headline).toContain('June');
    expect(narrative.headline).toContain('down from C');
    expect(narrative.issues).toHaveLength(3);
    expect(narrative.issues[0]?.title).toBe('Website was unreachable');
  });

  it('handles a report with no wins and no issues', () => {
    const input = { ...narrationInput(), wins: [], issues: [] };
    const narrative = fallbackNarrative(input);
    expect(narrativeSchema.safeParse(narrative).success).toBe(true);
    expect(narrative.wins).toHaveLength(1);
    expect(narrative.recommendedAction.length).toBeGreaterThan(10);
  });
});

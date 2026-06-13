import { describe, expect, it } from 'vitest';
import { ISSUE_IMPACT, prioritizeIssues } from '../src/report/prioritize.js';
import { brokenScan, healthyScan, sparseScan } from './helpers/scan-fixtures.js';

describe('prioritizeIssues', () => {
  it('is deterministic', () => {
    expect(prioritizeIssues(brokenScan())).toEqual(prioritizeIssues(brokenScan()));
  });

  it('ranks issues by the static impact map order', () => {
    const { issues } = prioritizeIssues(brokenScan());
    const ids = issues.map((i) => i.id);

    // Spec ordering: downtime > SSL expiry > not ranking > NAP mismatch >
    // slow LCP > broken links > missing meta > missing alt.
    const expectedOrder = [
      'siteDown',
      'sslExpiringSoon',
      'notRanking',
      'napMismatch',
      'slowLcp',
      'brokenLinks',
      'missingMeta',
      'missingAlt',
    ];
    const positions = expectedOrder.map((id) => ids.indexOf(id));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions]).toEqual([...positions].sort((a, b) => a - b));

    // Impacts strictly follow the map.
    for (const issue of issues) {
      expect(issue.impact).toBe(ISSUE_IMPACT[issue.id as keyof typeof ISSUE_IMPACT]);
    }
  });

  it('puts real scan numbers into the issue details', () => {
    const { issues } = prioritizeIssues(brokenScan());
    const byId = Object.fromEntries(issues.map((i) => [i.id, i]));

    expect(byId.siteDown?.detail).toContain('HTTP 503');
    expect(byId.sslExpiringSoon?.detail).toContain('8 days');
    expect(byId.notRanking?.detail).toContain('2 of 3');
    expect(byId.slowLcp?.detail).toContain('6.8 seconds');
    expect(byId.brokenLinks?.detail).toContain('2 link(s)');
    expect(byId.missingAlt?.detail).toContain('17 of 31');
    expect(byId.napMismatch?.detail).toContain('+15125559999');
  });

  it('every issue carries a plain-English why', () => {
    const { issues } = prioritizeIssues(brokenScan());
    expect(issues.length).toBeGreaterThan(5);
    for (const issue of issues) {
      expect(issue.why.length).toBeGreaterThan(20);
    }
  });

  it('finds wins on a healthy site and caps them at 3', () => {
    const { wins, issues } = prioritizeIssues(healthyScan());
    expect(wins).toHaveLength(3);
    // Best win first: top-3 Google ranking beats everything else present.
    expect(wins[0]?.id).toBe('rankingTop3');
    expect(wins[0]?.detail).toContain('#2');
    // Healthy site: only the minor alt-text ding remains.
    expect(issues.map((i) => i.id)).toEqual(['missingAlt']);
  });

  it('does not fabricate issues from skipped checks', () => {
    const { issues } = prioritizeIssues(sparseScan());
    const ids = issues.map((i) => i.id);
    expect(ids).not.toContain('notRanking');
    expect(ids).not.toContain('missingListing');
    expect(ids).not.toContain('blacklisted');
  });
});

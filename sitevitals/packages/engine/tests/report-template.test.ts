import { describe, expect, it } from 'vitest';
import { fallbackNarrative } from '../src/report/narrate.js';
import { prioritizeIssues } from '../src/report/prioritize.js';
import { renderReportEmail } from '../src/report/template.js';
import { computeTrend } from '../src/report/trend.js';
import { brokenScan, healthyScan } from './helpers/scan-fixtures.js';

function render(scan = brokenScan(), previous = healthyScan()) {
  const trend = computeTrend(scan, previous);
  const { wins, issues } = prioritizeIssues(scan);
  const narrative = fallbackNarrative({
    business: "Joe's HVAC",
    period: 'June',
    grade: scan.scores.grade,
    composite: scan.scores.composite,
    trend,
    wins,
    issues: issues.slice(0, 3),
  });
  return renderReportEmail({
    business: "Joe's HVAC",
    period: 'June',
    grade: scan.scores.grade,
    composite: scan.scores.composite,
    trend,
    narrative,
    categories: scan.scores.categories,
    url: scan.url,
  });
}

describe('renderReportEmail', () => {
  it('matches the HTML snapshot', () => {
    expect(render().html).toMatchSnapshot();
  });

  it('matches the plaintext snapshot', () => {
    expect(render().text).toMatchSnapshot();
  });

  it('builds the subject from period, grade, and trend arrow', () => {
    const email = render();
    expect(email.subject).toBe('Your June Website Report Card: F ↓');

    const noTrendEmail = renderReportEmail({
      business: 'X',
      period: 'June',
      grade: 'B',
      composite: 85,
      trend: null,
      narrative: fallbackNarrative({
        business: 'X',
        period: 'June',
        grade: 'B',
        composite: 85,
        trend: null,
        wins: [],
        issues: [],
      }),
      categories: [],
      url: 'https://x.com',
    });
    expect(noTrendEmail.subject).toBe('Your June Website Report Card: B');
  });

  it('numbers in the email trace back to the scan data', () => {
    const scan = brokenScan();
    const email = render(scan);
    // Spot-check load-bearing numbers from the scan surface in both formats.
    expect(email.html).toContain(`${scan.scores.composite} / 100`);
    expect(email.text).toContain(`${scan.scores.composite} / 100`);
    expect(email.text).toContain('HTTP 503');
    expect(email.html).toContain('HTTP 503');
  });

  it('escapes HTML in narrative content', () => {
    const narrative = fallbackNarrative({
      business: '<script>alert(1)</script>',
      period: 'June',
      grade: 'A',
      composite: 95,
      trend: null,
      wins: [],
      issues: [],
    });
    const email = renderReportEmail({
      business: '<script>alert(1)</script>',
      period: 'June',
      grade: 'A',
      composite: 95,
      trend: null,
      narrative,
      categories: [],
      url: 'https://x.com',
    });
    expect(email.html).not.toContain('<script>alert(1)</script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('renders the CTA footer and category scores', () => {
    const email = render();
    expect(email.html).toContain('Want this fixed? Just reply.');
    expect(email.text).toContain('Want this fixed?');
    expect(email.html).toContain('Uptime &amp; availability');
  });
});

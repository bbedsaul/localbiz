import { readFile } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crawlSite } from '../src/checks/crawl.js';
import { runScan } from '../src/runner.js';

const FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'site');

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    void (async () => {
      const urlPath = new URL(req.url ?? '/', 'http://localhost').pathname;
      const file = urlPath === '/' ? 'index.html' : urlPath.slice(1);
      try {
        const body = await readFile(path.join(FIXTURE_DIR, file));
        res.writeHead(200, {
          'content-type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream',
        });
        res.end(body);
      } catch {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('not found');
      }
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe('crawlSite against a local fixture site', () => {
  it('collects pages, broken links, and hygiene signals', async () => {
    const crawl = await crawlSite(baseUrl);

    // /, /about.html, /services.html are HTML; /missing.html 404s.
    expect(crawl.pagesCrawled).toBe(3);

    expect(crawl.brokenLinks).toHaveLength(1);
    expect(crawl.brokenLinks[0]).toMatchObject({
      url: `${baseUrl}/missing.html`,
      foundOn: `${baseUrl}/`,
      status: 404,
    });

    // services.html has no <title>.
    expect(crawl.missingTitles).toEqual([`${baseUrl}/services.html`]);

    // index and about share a title.
    expect(crawl.duplicateTitles).toHaveLength(1);
    expect(crawl.duplicateTitles[0]?.pages).toHaveLength(2);

    // about.html has no meta description.
    expect(crawl.missingMetaDescriptions).toEqual([`${baseUrl}/about.html`]);

    // index and services share a meta description.
    expect(crawl.duplicateMetaDescriptions).toHaveLength(1);

    // team.jpg (no alt) + joe.jpg (empty alt), out of 3 images total.
    expect(crawl.imagesMissingAlt).toHaveLength(2);
    expect(crawl.totalImages).toBe(3);

    expect(crawl.hasSitemap).toBe(false);
    expect(crawl.hasRobotsTxt).toBe(true);
    expect(crawl.hasFavicon).toBe(true);
    expect(crawl.hasViewportMeta).toBe(true);
  });

  it('does not follow external or non-http links', async () => {
    const crawl = await crawlSite(baseUrl);
    const crawledUrls = [
      ...crawl.brokenLinks.map((l) => l.url),
      ...crawl.missingTitles,
      ...crawl.missingMetaDescriptions,
    ];
    expect(crawledUrls.every((u) => u.startsWith(baseUrl))).toBe(true);
  });
});

describe('runScan resilience', () => {
  it('produces a complete ScanResult even when the target is unreachable', async () => {
    // Nothing listens on port 1; checks must fail fast and gracefully.
    const result = await runScan({ url: 'http://127.0.0.1:1' });

    expect(result.checks.uptime.status).toBe('error');
    expect(result.checks.crawl.status).toBe('error');
    // IP target → no derivable business name and no keywords: both skip.
    expect(result.checks.napConsistency.status).toBe('skipped');
    expect(result.checks.localVisibility.status).toBe('skipped');
    expect(Object.keys(result.checks)).toHaveLength(9);
    for (const check of Object.values(result.checks)) {
      expect(['ok', 'error', 'skipped']).toContain(check.status);
    }
    expect(result.scores.grade).toBe('F');
    // The whole result must serialize cleanly — it is the report generator's input.
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});

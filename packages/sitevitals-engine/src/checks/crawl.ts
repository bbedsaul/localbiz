import * as cheerio from 'cheerio';
import type { BrokenLink, Check, CrawlRaw } from '../types.js';
import { DEFAULT_TIMEOUT_MS, fetchWithTimeout, normalizeUrl } from '../util/http.js';
import { errorMessage } from '../util/http.js';
import { runSafely } from '../util/run-safely.js';

const MAX_INTERNAL_PAGES = 50; // beyond the homepage
const CONCURRENCY = 5;

interface PageRecord {
  url: string;
  foundOn: string;
  status: number | null;
  failureReason: string | null;
  isHtml: boolean;
  title: string | null;
  metaDescription: string | null;
  imagesMissingAlt: string[];
  imageCount: number;
  internalLinks: string[];
  hasViewportMeta: boolean;
  hasFaviconLink: boolean;
}

function sameSite(a: URL, b: URL): boolean {
  const strip = (h: string): string => h.replace(/^www\./i, '');
  return strip(a.hostname) === strip(b.hostname);
}

/** Canonical form for dedup: drop hash, keep query, normalize trailing slash on bare paths. */
function canonical(url: URL): string {
  url.hash = '';
  return url.toString();
}

async function fetchPage(
  url: string,
  foundOn: string,
  origin: URL,
  allowPrivate: boolean,
): Promise<PageRecord> {
  const record: PageRecord = {
    url,
    foundOn,
    status: null,
    failureReason: null,
    isHtml: false,
    title: null,
    metaDescription: null,
    imagesMissingAlt: [],
    imageCount: 0,
    internalLinks: [],
    hasViewportMeta: false,
    hasFaviconLink: false,
  };

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {}, DEFAULT_TIMEOUT_MS, { allowPrivate });
  } catch (err) {
    record.failureReason = errorMessage(err);
    return record;
  }

  record.status = response.status;
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || !contentType.includes('text/html')) {
    await response.body?.cancel();
    return record;
  }

  let html: string;
  try {
    html = await response.text();
  } catch (err) {
    record.failureReason = errorMessage(err);
    return record;
  }

  record.isHtml = true;
  const $ = cheerio.load(html);

  record.title = $('head title').first().text().trim() || null;
  record.metaDescription = $('head meta[name="description"]').attr('content')?.trim() || null;
  record.hasViewportMeta = $('head meta[name="viewport"]').length > 0;
  record.hasFaviconLink = $('head link[rel~="icon"], head link[rel="shortcut icon"]').length > 0;

  $('img').each((_i, el) => {
    record.imageCount += 1;
    const alt = $(el).attr('alt');
    if (alt === undefined || alt.trim() === '') {
      record.imagesMissingAlt.push($(el).attr('src') ?? '(inline image)');
    }
  });

  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    let resolved: URL;
    try {
      resolved = new URL(href, url);
    } catch {
      return;
    }
    if (!/^https?:$/.test(resolved.protocol)) return;
    if (!sameSite(resolved, origin)) return;
    record.internalLinks.push(canonical(resolved));
  });

  return record;
}

async function urlExists(url: string, allowPrivate: boolean): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, {}, DEFAULT_TIMEOUT_MS, { allowPrivate });
    await response.body?.cancel();
    return response.ok;
  } catch {
    return false;
  }
}

export async function crawlSite(
  startUrl: string,
  opts: { allowPrivate?: boolean } = {},
): Promise<CrawlRaw> {
  const allowPrivate = opts.allowPrivate ?? false;
  const origin = new URL(normalizeUrl(startUrl));
  const homepage = canonical(new URL(origin.toString()));

  const visited = new Set<string>([homepage]);
  const queue: { url: string; foundOn: string }[] = [{ url: homepage, foundOn: '(start)' }];
  const pages: PageRecord[] = [];

  // Simple worker pool: each worker pulls from the shared queue until it is
  // drained and no other worker is mid-flight.
  let inFlight = 0;
  await new Promise<void>((resolve) => {
    const pump = (): void => {
      if (queue.length === 0 && inFlight === 0) {
        resolve();
        return;
      }
      while (inFlight < CONCURRENCY && queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        inFlight += 1;
        void fetchPage(next.url, next.foundOn, origin, allowPrivate).then((page) => {
          pages.push(page);
          for (const link of page.internalLinks) {
            if (visited.size >= MAX_INTERNAL_PAGES + 1) break;
            if (!visited.has(link)) {
              visited.add(link);
              queue.push({ url: link, foundOn: page.url });
            }
          }
          inFlight -= 1;
          pump();
        });
      }
    };
    pump();
  });

  const homePage = pages.find((p) => p.url === homepage);
  if (!homePage || !homePage.isHtml) {
    // Nothing to crawl: an unreachable or non-HTML homepage is a failed check,
    // not an empty-but-healthy site.
    const why = homePage?.failureReason ?? `HTTP ${homePage?.status ?? '?'} / not HTML`;
    throw new Error(`Could not crawl ${homepage}: ${why}`);
  }

  const htmlPages = pages.filter((p) => p.isHtml);

  const brokenLinks: BrokenLink[] = pages
    .filter((p) => p.failureReason !== null || (p.status !== null && p.status >= 400))
    .map((p) => ({
      url: p.url,
      foundOn: p.foundOn,
      status: p.status,
      reason: p.failureReason ?? `HTTP ${p.status}`,
    }));

  const groupBy = (extract: (p: PageRecord) => string | null): Map<string, string[]> => {
    const groups = new Map<string, string[]>();
    for (const page of htmlPages) {
      const value = extract(page);
      if (!value) continue;
      groups.set(value, [...(groups.get(value) ?? []), page.url]);
    }
    return groups;
  };

  const titleGroups = groupBy((p) => p.title);
  const descriptionGroups = groupBy((p) => p.metaDescription);

  const root = origin.origin;

  const [hasSitemap, hasRobotsTxt, hasFaviconFile] = await Promise.all([
    urlExists(`${root}/sitemap.xml`, allowPrivate),
    urlExists(`${root}/robots.txt`, allowPrivate),
    homePage.hasFaviconLink ? Promise.resolve(true) : urlExists(`${root}/favicon.ico`, allowPrivate),
  ]);

  return {
    pagesCrawled: htmlPages.length,
    brokenLinks,
    missingTitles: htmlPages.filter((p) => !p.title).map((p) => p.url),
    duplicateTitles: [...titleGroups.entries()]
      .filter(([, urls]) => urls.length > 1)
      .map(([title, urls]) => ({ title, pages: urls })),
    missingMetaDescriptions: htmlPages.filter((p) => !p.metaDescription).map((p) => p.url),
    duplicateMetaDescriptions: [...descriptionGroups.entries()]
      .filter(([, urls]) => urls.length > 1)
      .map(([description, urls]) => ({ description, pages: urls })),
    imagesMissingAlt: htmlPages.flatMap((p) =>
      p.imagesMissingAlt.map((src) => ({ page: p.url, src })),
    ),
    totalImages: htmlPages.reduce((sum, p) => sum + p.imageCount, 0),
    hasSitemap,
    hasRobotsTxt,
    hasFavicon: homePage.hasFaviconLink || hasFaviconFile,
    hasViewportMeta: homePage.hasViewportMeta,
  };
}

export const crawlCheck: Check<CrawlRaw> = {
  type: 'crawl',
  run: (target) => runSafely('crawl', () => crawlSite(target.url)),
};

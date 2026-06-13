import type { ScanResult } from '../types.js';

/**
 * Static business-impact ranking, per the product spec ordering:
 * downtime > SSL expiry > not ranking > NAP mismatch > slow LCP >
 * broken links > missing meta > missing alt text. Other findings slot
 * between those anchors.
 */
export const ISSUE_IMPACT = {
  siteDown: 100,
  blacklisted: 95,
  sslInvalid: 90,
  sslExpiringSoon: 85,
  domainExpiringSoon: 82,
  notRanking: 80,
  rankingLow: 74,
  missingListing: 72,
  napMismatch: 70,
  httpsNotEnforced: 62,
  slowLcp: 60,
  poorPerformance: 58,
  mixedContent: 55,
  brokenLinks: 50,
  slowResponse: 45,
  missingMeta: 40,
  noSitemap: 35,
  missingAlt: 30,
  noFavicon: 25,
} as const;

export type IssueId = keyof typeof ISSUE_IMPACT;

export interface ReportItem {
  id: string;
  impact: number;
  /** Short label ("Website was unreachable"). */
  title: string;
  /** Plain-English description carrying the real numbers from the scan. */
  detail: string;
  /** Why a business owner should care — feeds "whyItMatters" in the report. */
  why: string;
}

export interface Priorities {
  /** Top things going well, best first (max 3). */
  wins: ReportItem[];
  /** All detected issues, highest business impact first. */
  issues: ReportItem[];
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} seconds`;
}

/**
 * Pure function: derives ranked wins and issues from a ScanResult using the
 * static impact map. Every number in the output comes from the scan.
 */
export function prioritizeIssues(scan: ScanResult): Priorities {
  const issues: ReportItem[] = [];
  const wins: ReportItem[] = [];
  const { checks } = scan;

  const issue = (id: IssueId, title: string, detail: string, why: string): void => {
    issues.push({ id, impact: ISSUE_IMPACT[id], title, detail, why });
  };
  const win = (id: string, impact: number, title: string, detail: string): void => {
    wins.push({ id, impact, title, detail, why: '' });
  };

  // --- Uptime / availability -----------------------------------------------
  const up = checks.uptime.status === 'ok' ? checks.uptime.raw : null;
  if (checks.uptime.status === 'error' || (up && !up.up)) {
    issue(
      'siteDown',
      'Website was unreachable',
      up
        ? `When we checked, your website answered with an error (HTTP ${up.statusCode}) instead of loading.`
        : `When we checked, your website did not load at all (${checks.uptime.error ?? 'no response'}).`,
      'Every minute your site is down, customers who look for you find nothing — most will not try again.',
    );
  } else if (up) {
    win(
      'siteUp',
      90,
      'Your website is up and fast',
      `Your website loaded in ${seconds(up.responseTimeMs)} when we checked — customers are not kept waiting.`,
    );
    if (up.responseTimeMs > 3000) {
      wins.pop(); // not actually fast — keep the up/down signal out of wins
      issue(
        'slowResponse',
        'Website is slow to respond',
        `Your website took ${seconds(up.responseTimeMs)} to start loading.`,
        'Visitors give up on slow sites — a few extra seconds costs real customers.',
      );
    }
  }

  // --- Safe Browsing --------------------------------------------------------
  const sb = checks.safebrowsing.status === 'ok' ? checks.safebrowsing.raw : null;
  if (sb?.flagged) {
    issue(
      'blacklisted',
      'Google has flagged your website',
      `Google Safe Browsing currently flags your site (${sb.threats.join(', ')}). Browsers may show visitors a red warning page instead of your website.`,
      'A security flag scares customers away instantly and tanks your search ranking until it is fixed.',
    );
  } else if (sb) {
    win('safeBrowsing', 50, 'No security flags', 'Google Safe Browsing reports your site clean — no malware or phishing warnings.');
  }

  // --- SSL -------------------------------------------------------------------
  const ssl = checks.ssl.status === 'ok' ? checks.ssl.raw : null;
  if (ssl && !ssl.valid) {
    issue(
      'sslInvalid',
      'Security certificate problem',
      `Your site's security certificate is not valid${ssl.daysRemaining !== null && ssl.daysRemaining < 0 ? ` — it expired ${Math.abs(ssl.daysRemaining)} days ago` : ''}.`,
      'Browsers show "Not Secure" warnings for invalid certificates, and many visitors leave on the spot.',
    );
  } else if (ssl?.daysRemaining !== null && ssl !== null && ssl.daysRemaining! < 14) {
    issue(
      'sslExpiringSoon',
      'Security certificate expiring soon',
      `Your site's security certificate expires in ${ssl.daysRemaining} days.`,
      'If it lapses, every visitor sees a full-page security warning instead of your website.',
    );
  } else if (ssl?.valid) {
    win(
      'sslValid',
      70,
      'Security certificate is healthy',
      `Your site's security certificate is valid for another ${ssl.daysRemaining} days.`,
    );
  }

  // --- Domain expiry ----------------------------------------------------------
  const domain = checks.domain.status === 'ok' ? checks.domain.raw : null;
  if (domain?.daysRemaining !== null && domain !== undefined && domain !== null && domain.daysRemaining! < 30) {
    issue(
      'domainExpiringSoon',
      'Domain name expiring soon',
      `Your domain name ${domain.domain} expires in ${domain.daysRemaining} days${domain.registrar ? ` (registered with ${domain.registrar})` : ''}.`,
      'If the domain lapses, your website and email stop working — and someone else could buy the name.',
    );
  }

  // --- Local search visibility -------------------------------------------------
  const lv = checks.localVisibility.status === 'ok' ? checks.localVisibility.raw : null;
  if (lv && lv.rankings.length > 0) {
    const ranked = lv.rankings.filter((r) => r.position !== null);
    const unranked = lv.rankings.filter((r) => r.position === null);
    const best = ranked.map((r) => r.position as number).sort((a, b) => a - b)[0];

    if (unranked.length > 0) {
      const competitors = [...new Set(unranked.flatMap((r) => r.topCompetitors))].slice(0, 2);
      issue(
        'notRanking',
        'Not showing up in local search',
        `Your website is not in the top 50 Google results for ${unranked.length} of ${lv.rankings.length} searches we track (${unranked.map((r) => `"${r.keyword}"`).join(', ')}).${competitors.length ? ` Customers searching those terms find ${competitors.join(' and ')} instead.` : ''}`,
        'If you are invisible in local search, nearby customers are choosing competitors without ever seeing you.',
      );
    } else if (best !== undefined && best > 10) {
      issue(
        'rankingLow',
        'Buried on page 2 of Google',
        `Your best Google position is #${best} — past the first page for every search we track.`,
        'Few people ever click to page 2; first-page visibility is where the customers are.',
      );
    }
    if (best !== undefined && best <= 3) {
      const top = lv.rankings.find((r) => r.position === best);
      // Outranks the siteUp win (90): a top-3 Google spot is the rarer, more
      // compelling thing to lead the report with.
      win('rankingTop3', 92, 'Ranking near the top of Google', `You rank #${best} on Google for "${top?.keyword}".`);
    }
    if (lv.inMapPack) {
      win('mapPack', 80, "You're in the map results", 'Your business appears in the Google map pack — prime real estate for local searches.');
    }
  }

  // --- Listings / NAP ------------------------------------------------------------
  const nap = checks.napConsistency.status === 'ok' ? checks.napConsistency.raw : null;
  if (nap) {
    const queryable = nap.listings.filter((l) => !l.unavailableReason);
    const missing = queryable.filter((l) => !l.found);
    if (missing.length > 0) {
      issue(
        'missingListing',
        `Not listed on ${missing.map((l) => l.source).join(' or ')}`,
        `We could not find ${nap.businessName} on ${missing.map((l) => l.source).join(' or ')} (checked ${queryable.length} platforms, found ${nap.foundCount}).`,
        'Customers check these sites before calling — a missing listing means missed business and weaker local ranking.',
      );
    }
    for (const mismatch of nap.mismatches) {
      issue('napMismatch', `Your ${mismatch.field} doesn't match across listings`, mismatch.message, 'Inconsistent business info confuses customers and makes Google trust your listings less.');
    }
    if (nap.foundCount >= 2 && nap.mismatches.length === 0) {
      win(
        'listingsConsistent',
        78,
        'Your business listings match',
        `Your business details match across the ${nap.foundCount} listing sites we checked.`,
      );
    }
  }

  // --- HTTPS ------------------------------------------------------------------------
  const https = checks.httpsEnforced.status === 'ok' ? checks.httpsEnforced.raw : null;
  if (https) {
    if (https.httpsSupported && !https.httpRedirectsToHttps) {
      issue(
        'httpsNotEnforced',
        'Visitors can land on the insecure version',
        'Typing your address without "https" loads an insecure version of your site instead of redirecting to the secure one.',
        'Browsers mark the insecure version "Not Secure", and Google ranks unsecured pages lower.',
      );
    }
    if (https.mixedContentCount > 0) {
      issue(
        'mixedContent',
        'Insecure content on your homepage',
        `${https.mixedContentCount} item(s) on your homepage load over an insecure connection.`,
        'Browsers may block these items or warn visitors, making your site look broken or untrustworthy.',
      );
    }
    if (https.httpsSupported && https.httpRedirectsToHttps && https.mixedContentCount === 0) {
      win('httpsEnforced', 60, 'Connections are fully secure', 'Your site always uses a secure (https) connection — the padlock customers look for.');
    }
  }

  // --- Performance ----------------------------------------------------------------------
  const psi = checks.pagespeed.status === 'ok' ? checks.pagespeed.raw : null;
  const mobile = psi?.mobile ?? null;
  if (mobile?.lcpMs !== null && mobile !== null && mobile.lcpMs! > 4000) {
    issue(
      'slowLcp',
      'Slow to load on phones',
      `On a phone, the main content of your page takes ${seconds(mobile.lcpMs!)} to appear (Google recommends under 2.5 seconds).`,
      'Most local searches happen on phones — slow pages lose impatient customers before they see anything.',
    );
  } else if (mobile?.performanceScore !== null && mobile !== null && mobile.performanceScore! < 50) {
    issue(
      'poorPerformance',
      'Page speed needs work',
      `Your mobile page speed score is ${mobile.performanceScore} out of 100.`,
      'Slow pages frustrate visitors and rank lower on Google.',
    );
  } else if (mobile?.performanceScore !== null && mobile !== null && mobile.performanceScore! >= 80) {
    win('fastMobile', 65, 'Fast on phones', `Your mobile page speed score is ${mobile.performanceScore} out of 100 — better than most local business sites.`);
  }

  // --- Crawl hygiene -------------------------------------------------------------------------
  const crawl = checks.crawl.status === 'ok' ? checks.crawl.raw : null;
  if (crawl) {
    if (crawl.brokenLinks.length > 0) {
      issue(
        'brokenLinks',
        'Broken links on your site',
        `${crawl.brokenLinks.length} link(s) on your site lead to pages that don't load (for example ${crawl.brokenLinks[0]?.url}).`,
        'Dead ends frustrate visitors and signal neglect to search engines.',
      );
    } else if (crawl.pagesCrawled > 1) {
      win('noBrokenLinks', 55, 'No broken links', `We checked ${crawl.pagesCrawled} pages and every link worked.`);
    }

    const missingMeta = crawl.missingTitles.length + crawl.missingMetaDescriptions.length;
    if (missingMeta > 0) {
      issue(
        'missingMeta',
        'Pages missing titles or descriptions',
        `${crawl.missingTitles.length} page(s) are missing a title and ${crawl.missingMetaDescriptions.length} are missing a description — these are what show up in Google results.`,
        'Without them, Google writes your search listing for you, and it rarely sells your business well.',
      );
    }
    if (!crawl.hasSitemap) {
      issue('noSitemap', 'No sitemap for search engines', 'Your site has no sitemap.xml file, which helps Google find all your pages.', 'Pages Google cannot find cannot rank — a sitemap is a free visibility boost.');
    }
    if (crawl.imagesMissingAlt.length > 0) {
      issue(
        'missingAlt',
        'Images missing descriptions',
        `${crawl.imagesMissingAlt.length} of ${crawl.totalImages} images are missing alt text descriptions.`,
        'Alt text helps you show up in Google image results and makes your site accessible to more customers.',
      );
    }
    if (!crawl.hasFavicon) {
      issue('noFavicon', 'No browser icon', 'Your site has no favicon — the little icon shown in browser tabs and search results.', 'A small thing, but its absence makes a business look less established.');
    }
  }

  issues.sort((a, b) => b.impact - a.impact);
  wins.sort((a, b) => b.impact - a.impact);

  return { wins: wins.slice(0, 3), issues };
}

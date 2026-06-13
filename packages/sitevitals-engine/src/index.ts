export * from './types.js';
export * from './scoring.js';
export { runScan, ENGINE_VERSION } from './runner.js';
export {
  uptimeCheck,
  sslCheck,
  domainCheck,
  crawlCheck,
  crawlSite,
  pagespeedCheck,
  safebrowsingCheck,
  httpsEnforcedCheck,
  localVisibilityCheck,
  napConsistencyCheck,
} from './checks/index.js';
export { suggestKeywords } from './keywords.js';
export type { SerpProvider, SerpRank } from './providers/serp.js';
export { createSerpProvider } from './providers/serp.js';
export { DataForSeoProvider } from './providers/dataforseo.js';
export { SerpApiProvider } from './providers/serpapi.js';
export {
  compareListings,
  normalizePhone,
  normalizeAddress,
  nameFromDomain,
  namesMatch,
} from './util/nap.js';
export { diceSimilarity } from './util/similarity.js';
export { prioritizeIssues, ISSUE_IMPACT } from './report/prioritize.js';
export type { ReportItem, Priorities, IssueId } from './report/prioritize.js';
export {
  narrate,
  narrativeSchema,
  fallbackNarrative,
  numbersTrace,
  DEFAULT_NARRATION_MODEL,
} from './report/narrate.js';
export type {
  ReportNarrative,
  NarrationInput,
  NarrationResult,
  NarrateOptions,
} from './report/narrate.js';
export { computeTrend } from './report/trend.js';
export type { Trend } from './report/trend.js';
export { renderReportEmail } from './report/template.js';
export type { ReportEmailData, RenderedEmail } from './report/template.js';
export { createEmailProvider } from './delivery/email-provider.js';
export type { EmailProvider, EmailMessage } from './delivery/email-provider.js';
export { ResendProvider } from './delivery/resend.js';

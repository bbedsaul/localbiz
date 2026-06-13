import { ResendProvider } from './resend.js';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  /** Attribution tags (business id, period) for webhook matching. */
  tags?: Record<string, string>;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ id: string }>;
}

/**
 * Vendor-swappable factory (same pattern as the SERP provider). Returns null
 * when no provider is configured so callers can degrade gracefully.
 */
export function createEmailProvider(
  env: Record<string, string | undefined> = process.env,
): EmailProvider | null {
  return env.RESEND_API_KEY ? new ResendProvider(env.RESEND_API_KEY) : null;
}

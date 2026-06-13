import type { EmailMessage, EmailProvider } from './email-provider.js';

const ENDPOINT = 'https://api.resend.com/emails';
const TIMEOUT_MS = 15_000;

/** Resend tag values only allow ASCII letters, numbers, underscores, dashes. */
function sanitizeTagValue(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 256);
}

export class ResendProvider implements EmailProvider {
  readonly name = 'resend';

  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async send(message: EmailMessage): Promise<{ id: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await this.fetchFn(ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from:
            message.from ?? process.env.REPORT_FROM_EMAIL ?? 'SiteVitals <onboarding@resend.dev>',
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
          ...(message.tags
            ? {
                tags: Object.entries(message.tags).map(([name, value]) => ({
                  name: sanitizeTagValue(name),
                  value: sanitizeTagValue(value),
                })),
              }
            : {}),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Resend API responded ${response.status}: ${body.slice(0, 300)}`);
      }
      const data = (await response.json()) as { id?: string };
      if (!data.id) {
        throw new Error('Resend API returned no email id');
      }
      return { id: data.id };
    } finally {
      clearTimeout(timer);
    }
  }
}

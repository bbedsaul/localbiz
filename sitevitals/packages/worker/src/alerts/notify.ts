import type { EmailProvider } from '@sitevitals/engine';
import type { Logger } from '../logger.js';
import type { BusinessRow } from '../db/types.js';
import type { AlertEvaluation } from './rules.js';
import type { AlertNotifier } from './engine.js';

const ALERT_LABELS: Record<AlertEvaluation['type'], string> = {
  site_down: 'Website down',
  ssl_expiring: 'Security certificate expiring',
  domain_expiring: 'Domain name expiring',
  blacklisted: 'Google security flag',
};

export interface SmsProvider {
  readonly name: string;
  send(to: string, body: string): Promise<void>;
}

/** Twilio REST API via fetch — provider-shaped so the vendor is swappable. */
export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio';

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly from: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async send(to: string, body: string): Promise<void> {
    const response = await this.fetchFn(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          authorization:
            'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: this.from, Body: body }).toString(),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Twilio responded ${response.status}: ${detail.slice(0, 200)}`);
    }
  }
}

export function createSmsProvider(
  env: Record<string, string | undefined> = process.env,
): SmsProvider | null {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = env;
  return TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM
    ? new TwilioSmsProvider(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)
    : null;
}

export interface NotifierOptions {
  fromEmail?: string;
  /** Staging safety valve: route all alert email to this address instead of owners. */
  overrideTo?: string;
}

export class DefaultAlertNotifier implements AlertNotifier {
  constructor(
    private readonly email: EmailProvider | null,
    private readonly sms: SmsProvider | null,
    private readonly log: Logger,
    private readonly options: NotifierOptions = {},
  ) {}

  async notify(
    business: BusinessRow,
    evaluation: AlertEvaluation,
    kind: 'triggered' | 'resolved',
  ): Promise<string[]> {
    const channels: string[] = [];
    const label = ALERT_LABELS[evaluation.type];
    const subject =
      kind === 'triggered'
        ? `🔴 ${label}: ${business.name}`
        : `✅ Resolved — ${label.toLowerCase()}: ${business.name}`;
    const bodyText =
      kind === 'triggered'
        ? `${evaluation.message}\n\nWe'll keep checking and let you know the moment this clears.\n\n— SiteVitals`
        : `Good news: the earlier alert for ${business.name} has cleared.\n\nOriginal alert: ${evaluation.message}\n\n— SiteVitals`;

    const to = this.options.overrideTo ?? business.owner_email;
    if (this.email && to) {
      try {
        await this.email.send({
          to,
          subject,
          text: bodyText,
          html: `<p>${bodyText.replace(/\n/g, '<br/>')}</p>`,
          from: this.options.fromEmail,
          tags: { business_id: business.id, alert_type: evaluation.type },
        });
        channels.push('email');
      } catch (err) {
        this.log.error({ err, businessId: business.id }, 'alert email failed');
      }
    } else if (!to) {
      this.log.warn({ businessId: business.id }, 'no owner_email — alert email skipped');
    }

    // SMS: triggered alerts only, pro plan only, phone required.
    if (kind === 'triggered' && this.sms && business.plan === 'pro' && business.phone) {
      try {
        await this.sms.send(business.phone, `SiteVitals: ${subject}. ${evaluation.message}`);
        channels.push('sms');
      } catch (err) {
        this.log.error({ err, businessId: business.id }, 'alert SMS failed');
      }
    }

    return channels;
  }
}

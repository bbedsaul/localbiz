import { createHmac, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import type { Repo } from '../db/repo.js';
import type { Logger } from '../logger.js';

export interface ResendWebhookEvent {
  type: string;
  created_at?: string;
  data?: { email_id?: string };
}

/**
 * Resend signs webhooks with the Svix scheme: HMAC-SHA256 over
 * "{id}.{timestamp}.{payload}" using the base64 part of the whsec_ secret;
 * any matching v1 signature in the header validates.
 */
export function verifySvixSignature(
  secret: string,
  headers: Record<string, string | undefined>,
  payload: string,
): boolean {
  const id = headers['svix-id'];
  const timestamp = headers['svix-timestamp'];
  const signatures = headers['svix-signature'];
  if (!id || !timestamp || !signatures) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${payload}`).digest();

  return signatures.split(/\s+/).some((entry) => {
    const value = entry.startsWith('v1,') ? entry.slice(3) : entry;
    try {
      const candidate = Buffer.from(value, 'base64');
      return candidate.length === expected.length && timingSafeEqual(candidate, expected);
    } catch {
      return false;
    }
  });
}

/** Pure-ish event handler, exported for tests. Returns what it did. */
export async function handleResendEvent(
  repo: Pick<Repo, 'markReportEvent'>,
  event: ResendWebhookEvent,
  now: () => Date = () => new Date(),
): Promise<'opened' | 'clicked' | 'ignored'> {
  const emailId = event.data?.email_id;
  if (!emailId) return 'ignored';
  const at = event.created_at ? new Date(event.created_at) : now();

  if (event.type === 'email.opened') {
    await repo.markReportEvent(emailId, 'opened_at', at);
    return 'opened';
  }
  if (event.type === 'email.clicked') {
    await repo.markReportEvent(emailId, 'clicked_at', at);
    return 'clicked';
  }
  return 'ignored';
}

export interface HttpDeps {
  repo: Repo;
  log: Logger;
  webhookSecret?: string;
}

export function createHttpServer(deps: HttpDeps): http.Server {
  const { repo, log, webhookSecret } = deps;

  return http.createServer((req, res) => {
    const respond = (status: number, body: unknown): void => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (req.method === 'GET' && req.url === '/healthz') {
      respond(200, { ok: true, uptimeSeconds: Math.round(process.uptime()) });
      return;
    }

    if (req.method === 'POST' && req.url === '/webhooks/resend') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        void (async () => {
          const payload = Buffer.concat(chunks).toString('utf8');
          if (webhookSecret) {
            const headers = Object.fromEntries(
              Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
            );
            if (!verifySvixSignature(webhookSecret, headers, payload)) {
              log.warn('resend webhook rejected: bad signature');
              respond(401, { error: 'invalid signature' });
              return;
            }
          } else {
            log.warn('RESEND_WEBHOOK_SECRET not set — accepting webhook unverified');
          }
          try {
            const event = JSON.parse(payload) as ResendWebhookEvent;
            const action = await handleResendEvent(repo, event);
            log.info({ type: event.type, action }, 'resend webhook processed');
            respond(200, { ok: true, action });
          } catch (err) {
            log.error({ err }, 'resend webhook failed');
            respond(400, { error: 'bad payload' });
          }
        })();
      });
      return;
    }

    respond(404, { error: 'not found' });
  });
}

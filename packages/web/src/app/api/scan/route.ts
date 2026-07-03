import { NextRequest } from 'next/server';
import { runFastScan } from '@/lib/scan';
import { normalizeUrl } from '@/lib/format';
import { clientIpHash, consumeScanQuota, FREE_SCANS_PER_DAY } from '@/lib/rate-limit';

// Engine uses node:tls + cheerio — must run on the Node runtime, not Edge.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SSE_HEADERS = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
} as const;

/** One-shot SSE stream that emits a single `error` event then closes. */
function errorStream(message: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message })}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

/**
 * Server-Sent Events stream of the limited instant scan. Emits one `check`
 * event per completed check, then a final `done` event with the partial grade.
 * The scan runs in-process via sitevitals-engine, which enforces SSRF — so the
 * free scan does not depend on the worker being up.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) {
    return new Response('missing url', { status: 400 });
  }
  const url = normalizeUrl(raw);
  try {
    // Reject obviously invalid hosts before streaming.
    new URL(url);
  } catch {
    return new Response('invalid url', { status: 400 });
  }

  // Rate limit: 3 free scans per IP per day. Delivered as an SSE error event so
  // the client shows a friendly message (a non-200 would surface as a generic
  // EventSource failure).
  const { allowed } = await consumeScanQuota(clientIpHash(request));
  if (!allowed) {
    return errorStream(
      `You’ve used your ${FREE_SCANS_PER_DAY} free scans for today. Start a free trial for unlimited monitoring.`,
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        const done = await runFastScan(url, (e) => send('check', e));
        send('done', done);
      } catch (err) {
        send('error', { message: err instanceof Error ? err.message : 'scan failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

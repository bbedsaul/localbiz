import { NextRequest } from 'next/server';
import { runFastScan } from '@/lib/scan';
import { normalizeUrl } from '@/lib/format';

// Engine uses node:tls + cheerio — must run on the Node runtime, not Edge.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Server-Sent Events stream of the limited instant scan. Emits one `check`
 * event per completed check, then a final `done` event with the partial grade.
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

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}

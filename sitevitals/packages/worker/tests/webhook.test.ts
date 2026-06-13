import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { handleResendEvent, verifySvixSignature } from '../src/http/server.js';

describe('verifySvixSignature', () => {
  const secretBytes = Buffer.from('super-secret-signing-key');
  const secret = `whsec_${secretBytes.toString('base64')}`;
  const payload = '{"type":"email.opened","data":{"email_id":"em_123"}}';

  function sign(id: string, timestamp: string, body: string): string {
    return createHmac('sha256', secretBytes).update(`${id}.${timestamp}.${body}`).digest('base64');
  }

  it('accepts a valid v1 signature', () => {
    const headers = {
      'svix-id': 'msg_1',
      'svix-timestamp': '1750000000',
      'svix-signature': `v1,${sign('msg_1', '1750000000', payload)}`,
    };
    expect(verifySvixSignature(secret, headers, payload)).toBe(true);
  });

  it('accepts when any of several listed signatures matches', () => {
    const headers = {
      'svix-id': 'msg_1',
      'svix-timestamp': '1750000000',
      'svix-signature': `v1,${Buffer.from('garbage').toString('base64')} v1,${sign('msg_1', '1750000000', payload)}`,
    };
    expect(verifySvixSignature(secret, headers, payload)).toBe(true);
  });

  it('rejects tampered payloads and missing headers', () => {
    const headers = {
      'svix-id': 'msg_1',
      'svix-timestamp': '1750000000',
      'svix-signature': `v1,${sign('msg_1', '1750000000', payload)}`,
    };
    expect(verifySvixSignature(secret, headers, payload.replace('em_123', 'em_999'))).toBe(false);
    expect(verifySvixSignature(secret, { ...headers, 'svix-id': undefined }, payload)).toBe(false);
  });
});

describe('handleResendEvent', () => {
  function fakeRepo() {
    return { markReportEvent: vi.fn(async () => true) };
  }

  it('records opens against the right column', async () => {
    const repo = fakeRepo();
    const action = await handleResendEvent(repo, {
      type: 'email.opened',
      created_at: '2026-06-12T10:00:00Z',
      data: { email_id: 'em_123' },
    });
    expect(action).toBe('opened');
    expect(repo.markReportEvent).toHaveBeenCalledWith(
      'em_123',
      'opened_at',
      new Date('2026-06-12T10:00:00Z'),
    );
  });

  it('records clicks', async () => {
    const repo = fakeRepo();
    const action = await handleResendEvent(repo, {
      type: 'email.clicked',
      data: { email_id: 'em_123' },
    });
    expect(action).toBe('clicked');
    expect(repo.markReportEvent).toHaveBeenCalledWith('em_123', 'clicked_at', expect.any(Date));
  });

  it('ignores other event types and missing ids', async () => {
    const repo = fakeRepo();
    expect(await handleResendEvent(repo, { type: 'email.bounced', data: { email_id: 'x' } })).toBe('ignored');
    expect(await handleResendEvent(repo, { type: 'email.opened', data: {} })).toBe('ignored');
    expect(repo.markReportEvent).not.toHaveBeenCalled();
  });
});

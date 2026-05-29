import { describe, expect, it } from 'vitest';

import { extractCookie, readJson } from '../scripts/http.ts';

describe('script HTTP helpers', () => {
  it('extracts a named cookie from a set-cookie header', () => {
    expect(extractCookie('roj_session=abc123; Path=/; HttpOnly', 'roj_session')).toBe('roj_session=abc123');
    expect(() => extractCookie(undefined, 'roj_session')).toThrow('missing set-cookie header');
    expect(() => extractCookie('other=value; Path=/', 'roj_session')).toThrow('missing roj_session cookie');
  });

  it('reads successful JSON responses', async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      statusText: 'OK',
    });

    await expect(readJson<{ ok: boolean }>(response)).resolves.toEqual({ ok: true });
  });

  it('throws with response details for failed responses', async () => {
    const response = new Response('bad request', {
      status: 400,
      statusText: 'Bad Request',
    });

    await expect(readJson(response)).rejects.toThrow('HTTP 400 Bad Request: bad request');
  });
});

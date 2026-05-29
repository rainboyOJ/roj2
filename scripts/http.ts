export async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }
  return JSON.parse(text) as T;
}

export function extractCookie(setCookie: string | undefined, name: string): string {
  if (!setCookie) {
    throw new Error('missing set-cookie header');
  }

  const cookie = setCookie.split(';', 1)[0];
  if (!cookie.startsWith(`${name}=`)) {
    throw new Error(`missing ${name} cookie`);
  }
  return cookie;
}

import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = process.env.OJ_BASE_URL ?? 'http://127.0.0.1:3300';
const pollIntervalMs = Number(process.env.SMOKE_POLL_INTERVAL_MS ?? '500');
const pollTimeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? '120000');

type LoginResponse = {
  user: {
    id: string;
    username: string;
    role: string;
    approvalStatus: string;
  };
};

type CreateSubmissionResponse = {
  submissionId: string;
  submissionNo?: number | null;
  status: string;
  verdict: string;
};

type SubmissionResponse = {
  submissionNo?: number | null;
  status: string;
  verdict: string;
  score: number;
  judgeStatus?: string | null;
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }
  return JSON.parse(text) as T;
}

async function postJson<T>(
  path: string,
  body: Record<string, unknown>,
  cookie?: string,
): Promise<{ data: T; setCookie?: string }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });

  const setCookie = response.headers.get('set-cookie') ?? undefined;
  return {
    data: await readJson<T>(response),
    setCookie,
  };
}

async function getJson<T>(path: string, cookie?: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
  return readJson<T>(response);
}

function extractCookie(setCookie: string | undefined): string {
  if (!setCookie) {
    throw new Error('missing set-cookie header');
  }
  return setCookie.split(';', 1)[0];
}

async function waitForSubmission(
  submissionId: string,
  cookie: string,
): Promise<SubmissionResponse> {
  const deadline = Date.now() + pollTimeoutMs;
  while (Date.now() < deadline) {
    const submission = await getJson<SubmissionResponse>(`/api/submissions/${submissionId}`, cookie);
    if (submission.status === 'FINISHED' || submission.status === 'FAILED') {
      return submission;
    }
    await delay(pollIntervalMs);
  }

  throw new Error(`timed out waiting for submission ${submissionId}`);
}

async function login(username: string, password: string): Promise<{ cookie: string; user: LoginResponse['user'] }> {
  const { data, setCookie } = await postJson<LoginResponse>('/api/login', { username, password });
  return {
    cookie: extractCookie(setCookie),
    user: data.user,
  };
}

async function submitCode(
  cookie: string,
  pid: string,
  language: 'cpp' | 'python',
  sourceCode: string,
): Promise<CreateSubmissionResponse> {
  const { data } = await postJson<CreateSubmissionResponse>(
    '/api/submissions',
    { pid, language, sourceCode },
    cookie,
  );
  return data;
}

async function main() {
  console.log(`[smoke] base url: ${baseUrl}`);

  const { cookie, user } = await login('demo', 'demo123456');
  if (user.username !== 'demo') {
    throw new Error(`unexpected login user: ${user.username}`);
  }
  console.log('[smoke] logged in as demo');

  const cases: Array<{
    language: 'cpp' | 'python';
    code: string;
  }> = [
    {
      language: 'cpp',
      code: '#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}\n',
    },
    {
      language: 'python',
      code: 'a, b = map(int, input().split())\nprint(a + b)\n',
    },
  ];

  for (const testCase of cases) {
    const created = await submitCode(cookie, '1000', testCase.language, testCase.code);
    console.log(
      `[smoke] submitted ${testCase.language} -> ${created.submissionId} (${created.status}/${created.verdict})`,
    );

    const final = await waitForSubmission(created.submissionId, cookie);
    console.log(
      `[smoke] final ${testCase.language} -> status=${final.status} verdict=${final.verdict} score=${final.score}`,
    );

    if (final.status !== 'FINISHED') {
      throw new Error(`submission ${created.submissionId} did not finish`);
    }
    if (final.verdict !== 'AC') {
      throw new Error(`submission ${created.submissionId} expected AC, got ${final.verdict}`);
    }
  }

  console.log('[smoke] all demo submissions passed');
}

await main();

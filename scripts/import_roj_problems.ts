#!/usr/bin/env node
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type ProblemPayload = {
  pid: string;
  title: string;
  statementMarkdown: string;
  allowLanguages: Array<'cpp' | 'python'>;
  isVisible: boolean;
};

type AdminProblem = {
  id: string;
  pid: string;
};

const DEFAULT_OJ_URL = 'http://127.0.0.1:3000';
const DEFAULT_ROJ_ROOT = '/home/rainboy/mycode/problems/roj';
const DEFAULT_TESTDATA_ROOT = '/home/rainboy/roj_test_dir/judge_server_testData';
function ask(rl: ReturnType<typeof createInterface>, prompt: string, fallback = ''): Promise<string> {
  const suffix = fallback ? ` [${fallback}]` : '';
  return rl.question(`${prompt}${suffix}: `).then((value) => value.trim() || fallback);
}

function parsePidSelection(raw: string): string[] {
  const ids = new Set<number>();
  for (const part of raw.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean)) {
    const rangeMatch = part.match(/^(\d+)\s*[-~]\s*(\d+)$/);
    if (rangeMatch) {
      let start = Number(rangeMatch[1]);
      let end = Number(rangeMatch[2]);
      if (start > end) {
        [start, end] = [end, start];
      }
      for (let current = start; current <= end; current += 1) {
        ids.add(current);
      }
      continue;
    }

    if (/^\d+$/.test(part)) {
      ids.add(Number(part));
      continue;
    }

    throw new Error(`invalid problem id expression: ${part}`);
  }
  return [...ids].sort((a, b) => a - b).map(String);
}

function normalizeStatement(text: string): string {
  const content = text.replace(/^\uFEFF/, '').trim();
  if (!content) {
    throw new Error('statement markdown is empty');
  }
  return `${content}\n`;
}

function pickStatementFile(problemDir: string): string {
  for (const name of ['content.md', 'readme.md', 'statement.md']) {
    const fullPath = join(problemDir, name);
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      return fullPath;
    }
  }
  throw new Error(`statement file not found in ${problemDir}`);
}

function pickConfig(problemDir: string): Record<string, unknown> {
  const configPath = join(problemDir, 'config.json');
  if (!existsSync(configPath)) {
    throw new Error(`config.json not found in ${problemDir}`);
  }
  return JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
}

async function httpJson<T>(
  baseUrl: string,
  path: string,
  options: {
    method?: string;
    cookie?: string;
    json?: unknown;
  } = {},
): Promise<{ body: T; setCookie?: string }> {
  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.cookie) {
    headers.Cookie = options.cookie;
  }

  let body: string | undefined;
  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.json);
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed with HTTP ${response.status}: ${text}`);
  }

  const setCookie = response.headers.get('set-cookie') ?? undefined;
  return {
    body: text ? JSON.parse(text) as T : {} as T,
    setCookie,
  };
}

async function login(ojUrl: string, username: string, password: string): Promise<string> {
  const result = await httpJson<{ user: unknown }>(ojUrl, '/api/login', {
    method: 'POST',
    json: { username, password },
  });
  if (!result.setCookie) {
    throw new Error('login response did not include session cookie');
  }
  const cookieMatch = result.setCookie.match(/roj_session=[^;]+/);
  if (!cookieMatch) {
    throw new Error(`unexpected session cookie: ${result.setCookie}`);
  }
  return cookieMatch[0];
}

async function listAdminProblems(ojUrl: string, cookie: string): Promise<AdminProblem[]> {
  const result = await httpJson<{ problems: AdminProblem[] }>(ojUrl, '/api/admin/problems', {
    method: 'GET',
    cookie,
  });
  return result.body.problems ?? [];
}

async function createProblem(ojUrl: string, cookie: string, payload: ProblemPayload): Promise<AdminProblem> {
  const result = await httpJson<{ problemId: string; pid: string }>(ojUrl, '/api/admin/problems', {
    method: 'POST',
    cookie,
    json: payload,
  });
  return { id: result.body.problemId, pid: result.body.pid };
}

async function updateProblem(ojUrl: string, cookie: string, problemId: string, payload: ProblemPayload): Promise<void> {
  await httpJson(ojUrl, `/api/admin/problems/${problemId}`, {
    method: 'PUT',
    cookie,
    json: payload,
  });
}

async function copyTree(srcDir: string, dstDir: string): Promise<void> {
  mkdirSync(dstDir, { recursive: true });
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src = join(srcDir, entry.name);
    const dst = join(dstDir, entry.name);
    if (entry.isDirectory()) {
      await copyTree(src, dst);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const reader = createReadStream(src);
      const writer = createWriteStream(dst);
      reader.on('error', rejectPromise);
      writer.on('error', rejectPromise);
      writer.on('close', () => resolvePromise());
      reader.pipe(writer);
    });
  }
}

async function syncProblemData(problemDir: string, targetRoot: string, pid: string): Promise<void> {
  const dataDir = join(problemDir, 'data');
  const dataZip = join(problemDir, 'data.zip');
  const targetDir = join(targetRoot, pid, 'data');

  rmSync(targetDir, { recursive: true, force: true });

  if (existsSync(dataDir) && statSync(dataDir).isDirectory()) {
    await copyTree(dataDir, targetDir);
    return;
  }

  if (existsSync(dataZip) && statSync(dataZip).isFile()) {
    const tempDir = await mkdtemp(join(tmpdir(), `roj-import-${pid}-`));
    try {
      await execFileAsync('unzip', ['-q', dataZip, '-d', tempDir]);
      const extractedData = join(tempDir, 'data');
      if (!existsSync(extractedData) || !statSync(extractedData).isDirectory()) {
        throw new Error(`data.zip for ${pid} does not contain data/`);
      }
      await copyTree(extractedData, targetDir);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
    return;
  }

  throw new Error(`problem data not found in ${problemDir}`);
}

async function readProblemPayload(rojRoot: string, pid: string): Promise<ProblemPayload> {
  const problemDir = join(rojRoot, pid);
  if (!existsSync(problemDir) || !statSync(problemDir).isDirectory()) {
    throw new Error(`problem directory not found: ${problemDir}`);
  }

  const config = pickConfig(problemDir);
  const statementPath = pickStatementFile(problemDir);
  const statementMarkdown = normalizeStatement(await readFile(statementPath, 'utf-8'));
  const title = String(config.title ?? `ROJ ${pid}`);
  const allowLanguages = Array.isArray(config.allowLanguages)
    ? config.allowLanguages.filter((item): item is 'cpp' | 'python' => item === 'cpp' || item === 'python')
    : ['cpp', 'python'];

  return {
    pid,
    title,
    statementMarkdown,
    allowLanguages: allowLanguages.length > 0 ? allowLanguages : ['cpp', 'python'],
    isVisible: true,
  };
}

async function main(): Promise<number> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const ojUrl = await ask(rl, 'OJ URL', DEFAULT_OJ_URL);
    const adminUsername = await ask(rl, 'admin username');
    const adminPassword = await ask(rl, 'admin password');
    const rojRoot = resolve(await ask(rl, 'ROJ problem root', DEFAULT_ROJ_ROOT));
    const pidRaw = await ask(rl, 'problem ids, e.g. 1000 or 1000-1009');
    const testDataRoot = resolve(process.env.ROJ_JUDGE_TESTDATA_ROOT ?? DEFAULT_TESTDATA_ROOT);

    const pids = parsePidSelection(pidRaw);
    if (pids.length === 0) {
      throw new Error('no problems selected');
    }

    const cookie = await login(ojUrl, adminUsername, adminPassword);
    const existing = new Map((await listAdminProblems(ojUrl, cookie)).map((item) => [item.pid, item.id]));

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const pid of pids) {
      try {
        const payload = await readProblemPayload(rojRoot, pid);
        const problemDir = join(rojRoot, pid);
        const existingProblemId = existing.get(pid);
        if (existingProblemId) {
          await updateProblem(ojUrl, cookie, existingProblemId, payload);
          updated += 1;
          console.log(`updated problem: ${pid} ${payload.title}`);
        } else {
          const createdProblem = await createProblem(ojUrl, cookie, payload);
          existing.set(pid, createdProblem.id);
          created += 1;
          console.log(`created problem: ${pid} ${payload.title}`);
        }

        await syncProblemData(problemDir, testDataRoot, pid);
        console.log(`synced test data: ${pid}`);
      } catch (error) {
        failed += 1;
        console.error(`failed ${pid}: ${(error as Error).message}`);
      }
    }

    console.log(`done: created=${created} updated=${updated} failed=${failed}`);
    return failed === 0 ? 0 : 1;
  } finally {
    rl.close();
  }
}

await main().then((code) => {
  if (code !== 0) {
    process.exitCode = code;
  }
});

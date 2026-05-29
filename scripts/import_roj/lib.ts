import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type ProblemPayload = {
  pid: string;
  title: string;
  statementMarkdown: string;
  allowLanguages: Array<'cpp' | 'python'>;
  isVisible: boolean;
};

export type AdminProblem = {
  id: string;
  pid: string;
};

export function parsePidSelection(raw: string): string[] {
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

export function normalizeStatement(text: string): string {
  const content = text.replace(/^\uFEFF/, '').trim();
  if (!content) {
    throw new Error('statement markdown is empty');
  }
  return `${content}\n`;
}

export function pickStatementFile(problemDir: string): string {
  for (const name of ['content.md', 'readme.md', 'statement.md']) {
    const fullPath = join(problemDir, name);
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      return fullPath;
    }
  }
  throw new Error(`statement file not found in ${problemDir}`);
}

export function pickConfig(problemDir: string): Record<string, unknown> {
  const configPath = join(problemDir, 'config.json');
  if (!existsSync(configPath)) {
    throw new Error(`config.json not found in ${problemDir}`);
  }
  return JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
}

export function normalizeAllowLanguages(value: unknown): Array<'cpp' | 'python'> {
  const fallback: Array<'cpp' | 'python'> = ['cpp', 'python'];
  const languages = Array.isArray(value)
    ? value.filter((item): item is 'cpp' | 'python' => item === 'cpp' || item === 'python')
    : fallback;
  return languages.length > 0 ? languages : fallback;
}

export function extractSessionCookie(setCookie: string | undefined): string {
  if (!setCookie) {
    throw new Error('login response did not include session cookie');
  }
  const cookieMatch = setCookie.match(/roj_session=[^;]+/);
  if (!cookieMatch) {
    throw new Error(`unexpected session cookie: ${setCookie}`);
  }
  return cookieMatch[0];
}

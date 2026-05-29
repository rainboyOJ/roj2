import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AppLanguage } from '@roj/shared';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultProblemsRoot = path.join(packageRoot, 'default_problems');

export interface DefaultProblemSeed {
  pid: string;
  title: string;
  statementMarkdown: string;
  allowLanguages: AppLanguage[];
}

async function readDefaultProblemSeed(pid: string, rootDir = defaultProblemsRoot): Promise<DefaultProblemSeed> {
  const problemDir = path.join(rootDir, pid);
  const metadata = JSON.parse(
    await readFile(path.join(problemDir, 'metadata.json'), 'utf8'),
  ) as {
    title?: unknown;
    allowLanguages?: unknown;
  };
  const statementMarkdown = await readFile(path.join(problemDir, 'content.md'), 'utf8');
  const allowLanguages = Array.isArray(metadata.allowLanguages)
    ? metadata.allowLanguages.filter((language): language is AppLanguage => (
      language === 'cpp' || language === 'python'
    ))
    : [];

  return {
    pid,
    title: typeof metadata.title === 'string' ? metadata.title : pid,
    statementMarkdown,
    allowLanguages: allowLanguages.length > 0 ? allowLanguages : ['cpp', 'python'],
  };
}

export function isDefaultProblemDirectoryName(name: string) {
  return /^[0-9]+$/.test(name);
}

export async function readDefaultProblemSeeds(rootDir = defaultProblemsRoot): Promise<DefaultProblemSeed[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const pids = entries
    .filter((entry) => entry.isDirectory() && isDefaultProblemDirectoryName(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return Promise.all(pids.map((pid) => readDefaultProblemSeed(pid, rootDir)));
}

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  isDefaultProblemDirectoryName,
  normalizeListPageSize,
  parseEnabledLanguagesEnv,
  readDefaultProblemSeeds,
} from '../src/index.ts';

describe('default problem seeds', () => {
  it('accepts numeric directory names only', () => {
    expect(isDefaultProblemDirectoryName('1000')).toBe(true);
    expect(isDefaultProblemDirectoryName('0010')).toBe(true);
    expect(isDefaultProblemDirectoryName('abc')).toBe(false);
    expect(isDefaultProblemDirectoryName('1000-backup')).toBe(false);
  });

  it('reads all default problem directories in pid order', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'roj-default-problems-'));

    try {
      await mkdir(join(tempDir, '1001'), { recursive: true });
      await mkdir(join(tempDir, '1000'), { recursive: true });
      await mkdir(join(tempDir, 'draft'), { recursive: true });

      await writeFile(
        join(tempDir, '1001', 'metadata.json'),
        JSON.stringify({
          title: 'Second Problem',
          allowLanguages: ['python', 'javascript'],
        }),
      );
      await writeFile(join(tempDir, '1001', 'content.md'), '# Second\n');
      await writeFile(
        join(tempDir, '1000', 'metadata.json'),
        JSON.stringify({
          title: 'First Problem',
          allowLanguages: [],
        }),
      );
      await writeFile(join(tempDir, '1000', 'content.md'), '# First\n');

      const seeds = await readDefaultProblemSeeds(tempDir);

      expect(seeds).toEqual([
        {
          pid: '1000',
          title: 'First Problem',
          statementMarkdown: '# First\n',
          allowLanguages: ['cpp', 'python'],
        },
        {
          pid: '1001',
          title: 'Second Problem',
          statementMarkdown: '# Second\n',
          allowLanguages: ['python'],
        },
      ]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('enabled language defaults', () => {
  it('parses enabled languages from environment text', () => {
    expect(parseEnabledLanguagesEnv(undefined)).toEqual(['cpp', 'python']);
    expect(parseEnabledLanguagesEnv('python')).toEqual(['python']);
    expect(parseEnabledLanguagesEnv(' cpp, python,cpp ')).toEqual(['cpp', 'python']);
    expect(parseEnabledLanguagesEnv('java')).toEqual(['cpp', 'python']);
  });
});

describe('pagination settings defaults', () => {
  it('normalizes list page size to allowed values', () => {
    expect(normalizeListPageSize(20)).toBe(20);
    expect(normalizeListPageSize(50)).toBe(50);
    expect(normalizeListPageSize(100)).toBe(100);
    expect(normalizeListPageSize(500)).toBe(20);
    expect(normalizeListPageSize(undefined)).toBe(20);
  });
});

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  extractSessionCookie,
  normalizeAllowLanguages,
  normalizeStatement,
  parsePidSelection,
  pickConfig,
  pickStatementFile,
} from '../scripts/import_roj/lib.ts';

describe('parsePidSelection', () => {
  it('accepts single ids, comma lists, chinese comma lists, ranges and reverse ranges', () => {
    expect(parsePidSelection('1003,1001 1002，1005-1006 1008~1007')).toEqual([
      '1001',
      '1002',
      '1003',
      '1005',
      '1006',
      '1007',
      '1008',
    ]);
  });

  it('deduplicates selected ids', () => {
    expect(parsePidSelection('1000 1000 1000-1001')).toEqual(['1000', '1001']);
  });

  it('rejects invalid tokens', () => {
    expect(() => parsePidSelection('1000 abc')).toThrow('invalid problem id expression: abc');
  });
});

describe('statement and config helpers', () => {
  it('normalizes non-empty markdown text', () => {
    expect(normalizeStatement('\uFEFF\n# Title\n\n')).toBe('# Title\n');
    expect(() => normalizeStatement('  \n')).toThrow('statement markdown is empty');
  });

  it('picks statement and config files from a problem directory', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'roj-import-lib-'));
    try {
      await mkdir(join(tempDir, '1000'), { recursive: true });
      await writeFile(join(tempDir, '1000', 'readme.md'), '# Readme\n');
      await writeFile(join(tempDir, '1000', 'config.json'), JSON.stringify({ title: 'A + B' }));

      expect(pickStatementFile(join(tempDir, '1000'))).toBe(join(tempDir, '1000', 'readme.md'));
      expect(pickConfig(join(tempDir, '1000'))).toEqual({ title: 'A + B' });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('payload helpers', () => {
  it('normalizes supported languages', () => {
    expect(normalizeAllowLanguages(['cpp', 'java', 'python', 'cpp'])).toEqual(['cpp', 'python', 'cpp']);
    expect(normalizeAllowLanguages(['java'])).toEqual(['cpp', 'python']);
    expect(normalizeAllowLanguages(undefined)).toEqual(['cpp', 'python']);
  });

  it('extracts the roj session cookie', () => {
    expect(extractSessionCookie('roj_session=abc123; Path=/; HttpOnly')).toBe('roj_session=abc123');
    expect(() => extractSessionCookie(undefined)).toThrow('login response did not include session cookie');
    expect(() => extractSessionCookie('other=value')).toThrow('unexpected session cookie');
  });
});

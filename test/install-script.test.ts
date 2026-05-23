import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('install script', () => {
  it('clear removes OJ containers and images', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'roj-install-clear-'));
    const fakeDockerPath = join(tempDir, 'docker');
    const logPath = join(tempDir, 'docker.log');
    const scriptPath = join(process.cwd(), 'install.sh');

    await writeFile(
      fakeDockerPath,
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "${logPath}"
if [[ "$1" == "info" ]]; then
  exit 0
fi
if [[ "$1" == "rm" || "$1" == "rmi" ]]; then
  exit 0
fi
if [[ "$1" == "compose" && "$2" == "version" ]]; then
  exit 0
fi
exit 0
`,
      { mode: 0o755 },
    );

    try {
      await expect(
        execFileAsync(scriptPath, ['clear'], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            PATH: `${tempDir}:${process.env.PATH ?? ''}`,
          },
        }),
      ).resolves.toMatchObject({
        stderr: '',
      });

      const log = await readFile(logPath, 'utf8');
      expect(log).toContain('info');
      expect(log).toContain(
        'rm -f roj-api-server roj-judge-dispatcher roj-mongodb roj-judge-server',
      );
      expect(log).toContain('rmi roj2:local boxtest-judge-server:dev');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('dev script', () => {
  it('provides an executable one-click launcher', async () => {
    const scriptPath = join(process.cwd(), 'scripts', 'dev-up.sh');

    expect(existsSync(scriptPath)).toBe(true);
    expect(statSync(scriptPath).isFile()).toBe(true);

    await expect(access(scriptPath, constants.X_OK)).resolves.toBeUndefined();
  });

  it('makes dev-down idempotent when container removal is already in progress', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'roj-dev-down-'));
    const fakeDockerPath = join(tempDir, 'docker');
    const fakePgrepPath = join(tempDir, 'pgrep');
    const scriptPath = join(process.cwd(), 'scripts', 'dev-down.sh');

    await writeFile(
      fakeDockerPath,
      `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "ps" ]]; then
  echo "roj-demo-mongo"
  exit 0
fi
if [[ "$1" == "rm" ]]; then
  echo "Error response from daemon: removal of container roj-demo-mongo is already in progress" >&2
  exit 1
fi
exit 0
`,
      { mode: 0o755 },
    );

    await writeFile(
      fakePgrepPath,
      '#!/usr/bin/env bash\nexit 1\n',
      { mode: 0o755 },
    );

    try {
      await expect(
        execFileAsync(scriptPath, [], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            PATH: `${tempDir}:${process.env.PATH ?? ''}`,
          },
        }),
      ).resolves.toMatchObject({
        stderr: '',
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

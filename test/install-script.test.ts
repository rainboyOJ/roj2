import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
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
      expect(log).toContain(
        'rmi ghcr.io/rainboyoj/roj2:latest ghcr.io/rainboyoj/judge-server-cpp:latest',
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('prepares deploy files in an empty execution directory', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'roj-install-deploy-'));
    const binDir = join(tempDir, 'bin');
    const deployDir = join(tempDir, 'deploy');
    const judgeDir = join(tempDir, 'judge_server_cpp');
    const rojDir = join(tempDir, 'roj2');
    const fakeDockerPath = join(binDir, 'docker');
    const fakeGitPath = join(binDir, 'git');
    const scriptPath = join(process.cwd(), 'install.sh');

    await mkdir(binDir, { recursive: true });
    await mkdir(deployDir, { recursive: true });
    await mkdir(join(judgeDir, '.git'), { recursive: true });
    await mkdir(join(judgeDir, 'config'), { recursive: true });
    await mkdir(join(judgeDir, 'testData', '1000', 'data'), { recursive: true });
    await mkdir(rojDir, { recursive: true });
    await mkdir(join(rojDir, '.git'), { recursive: true });

    await writeFile(
      join(judgeDir, 'config', 'config.json'),
      JSON.stringify({
        server: { port: 8000 },
        testing: { test_data_path: '../testData' },
      }, null, 2),
    );
    await writeFile(join(judgeDir, 'Dockerfile'), 'FROM scratch\n');
    await writeFile(join(judgeDir, 'testData', '1000', 'data', 'problem1.in'), '1 2\n');
    await writeFile(join(judgeDir, 'testData', '1000', 'data', 'problem1.out'), '3\n');
    await writeFile(join(rojDir, 'Dockerfile'), 'FROM scratch\n');
    await writeFile(
      join(rojDir, 'docker-compose.yaml'),
      `services:
  api-server:
    image: \${IMAGE_NAME:-ghcr.io/rainboyoj/roj2:latest}
    ports:
      - "\${API_HOST_PORT:-3000}:3000"
  judge-server:
    image: \${JUDGE_SERVER_IMAGE_NAME:-ghcr.io/rainboyoj/judge-server-cpp:latest}
    volumes:
      - type: bind
        source: \${JUDGE_SERVER_CONFIG_PATH:-./judge_server_config.json}
        target: /opt/boxtest/config/config.json
        read_only: true
        bind:
          create_host_path: false
      - type: bind
        source: \${JUDGE_SERVER_TESTDATA_DIR:-./judge_server_testData}
        target: /opt/boxtest/testData
        read_only: true
        bind:
          create_host_path: false
`,
    );
    await writeFile(
      join(rojDir, '.env.example'),
      [
        'IMAGE_NAME=ghcr.io/rainboyoj/roj2:latest',
        'JUDGE_SERVER_IMAGE_NAME=ghcr.io/rainboyoj/judge-server-cpp:latest',
        'API_HOST_PORT=3000',
        '',
      ].join('\n'),
    );

    await writeFile(
      fakeDockerPath,
      `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "info" ]]; then
  exit 0
fi
if [[ "$1" == "compose" && "$2" == "version" ]]; then
  exit 0
fi
if [[ "$1" == "pull" ]]; then
  exit 0
fi
if [[ "$1" == "compose" && "$2" == "up" ]]; then
  exit 0
fi
exit 0
`,
      { mode: 0o755 },
    );
    await writeFile(
      fakeGitPath,
      `#!/usr/bin/env bash
set -euo pipefail
exit 0
`,
      { mode: 0o755 },
    );

    try {
      await expect(
        execFileAsync(scriptPath, [], {
          cwd: deployDir,
          env: {
            ...process.env,
            PATH: `${binDir}:${process.env.PATH ?? ''}`,
            JUDGE_SERVER_DIR: judgeDir,
            ROJ_DIR: rojDir,
            GITHUB_PROXY: '',
          },
        }),
      ).resolves.toMatchObject({
        stderr: '',
      });

      const envFile = await readFile(join(deployDir, '.env'), 'utf8');
      const configFile = await readFile(join(deployDir, 'judge_server_config.json'), 'utf8');
      const composeFile = await readFile(join(deployDir, 'docker-compose.yaml'), 'utf8');

      expect(envFile).toContain('IMAGE_NAME=ghcr.io/rainboyoj/roj2:latest');
      expect(envFile).toContain(
        'JUDGE_SERVER_IMAGE_NAME=ghcr.io/rainboyoj/judge-server-cpp:latest',
      );
      expect(envFile).toContain(`JUDGE_SERVER_CONFIG_PATH=${join(deployDir, 'judge_server_config.json')}`);
      expect(envFile).toContain('API_HOST_PORT=3000');
      expect(configFile).toContain('"test_data_path": "/opt/boxtest/testData"');
      expect(composeFile).toContain('image: ${IMAGE_NAME:-ghcr.io/rainboyoj/roj2:latest}');
      expect(composeFile).toContain(
        'image: ${JUDGE_SERVER_IMAGE_NAME:-ghcr.io/rainboyoj/judge-server-cpp:latest}',
      );
      expect(composeFile).toContain('${API_HOST_PORT:-3000}:3000');
      const testDataStat = await stat(join(deployDir, 'judge_server_testData'));
      expect(testDataStat.isDirectory()).toBe(true);
      const defaultProblemInput = await readFile(
        join(deployDir, 'judge_server_testData', '1000', 'data', 'problem1.in'),
        'utf8',
      );
      expect(defaultProblemInput).toBe('1 2\n');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

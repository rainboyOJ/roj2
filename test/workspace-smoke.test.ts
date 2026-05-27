import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('workspace smoke', () => {
  it('loads test runner', () => {
    expect(true).toBe(true);
  });

  it('pulls judge_server image in GitHub smoke test instead of building it here', async () => {
    const workflow = await readFile(
      join(process.cwd(), '.github', 'workflows', 'github-smoke-test.yml'),
      'utf8',
    );

    expect(workflow).toContain('CI_JUDGE_SERVER_IMAGE_NAME=ghcr.io/rainboyoj/judge-server-cpp:latest');
    expect(workflow).toContain('docker pull "$CI_JUDGE_SERVER_IMAGE_NAME"');
    expect(workflow).not.toContain('Build judge_server image');
    expect(workflow).not.toContain('-t judge_server_cpp:ci');
    expect(workflow).toContain('JUDGE_SERVER_IMAGE_NAME: ${{ env.CI_JUDGE_SERVER_IMAGE_NAME }}');
  });
});

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('workspace smoke', () => {
  it('loads test runner', () => {
    expect(true).toBe(true);
  });

  it('keeps latest and full sha tags in Docker image workflow', async () => {
    const workflow = await readFile(
      join(process.cwd(), '.github', 'workflows', 'docker-ghcr.yml'),
      'utf8',
    );

    expect(workflow).toContain('type=sha,prefix=sha-,format=long');
    expect(workflow).toContain('type=raw,value=latest,enable={{is_default_branch}}');
  });

  it('pulls application and judge_server images in GitHub smoke test', async () => {
    const workflow = await readFile(
      join(process.cwd(), '.github', 'workflows', 'github-smoke-test.yml'),
      'utf8',
    );

    expect(workflow).toContain('workflow_run:');
    expect(workflow).toContain('- Build Docker Image');
    expect(workflow).toContain(':sha-${image_sha}');
    expect(workflow).toContain('docker pull "$CI_IMAGE_NAME"');
    expect(workflow).toContain('CI_JUDGE_SERVER_IMAGE_NAME=ghcr.io/rainboyoj/judge-server-cpp:latest');
    expect(workflow).toContain('docker pull "$CI_JUDGE_SERVER_IMAGE_NAME"');
    expect(workflow).not.toContain('Build application image');
    expect(workflow).not.toContain('Build judge_server image');
    expect(workflow).not.toContain('-t "$CI_IMAGE_NAME"');
    expect(workflow).not.toContain('-t judge_server_cpp:ci');
    expect(workflow).toContain('JUDGE_SERVER_IMAGE_NAME: ${{ env.CI_JUDGE_SERVER_IMAGE_NAME }}');
  });

  it('does not overwrite enabled languages during seed', async () => {
    const dbSource = await readFile(
      join(process.cwd(), 'packages', 'db', 'src', 'index.ts'),
      'utf8',
    );

    expect(dbSource).toContain('parseEnabledLanguagesEnv(process.env.ROJ_ENABLED_LANGUAGES)');
    expect(dbSource).toContain('$setOnInsert:');
    expect(dbSource).not.toContain("$set: {\n          enabledLanguages: ['cpp', 'python']");
  });
});

import { afterEach, describe, expect, it } from 'vitest';

import { assetUrl, getAssetCacheControl } from '../src/http/assets.ts';

const originalNodeEnv = process.env.NODE_ENV;
const originalAssetVersion = process.env.ROJ_ASSET_VERSION;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalAssetVersion === undefined) {
    delete process.env.ROJ_ASSET_VERSION;
  } else {
    process.env.ROJ_ASSET_VERSION = originalAssetVersion;
  }
});

describe('asset helpers', () => {
  it('uses no-store cache control in test and development modes', () => {
    process.env.NODE_ENV = 'test';
    expect(getAssetCacheControl()).toBe('no-store');

    process.env.NODE_ENV = 'development';
    expect(getAssetCacheControl()).toBe('no-store');
  });

  it('adds a version query string outside development modes', () => {
    process.env.NODE_ENV = 'production';
    process.env.ROJ_ASSET_VERSION = '2026.05';

    expect(getAssetCacheControl()).toBe('public, max-age=31536000, immutable');
    expect(assetUrl('/assets/login.js')).toBe('/assets/login.js?v=2026.05');
    expect(assetUrl('/assets/login.js?lang=zh')).toBe('/assets/login.js?lang=zh&v=2026.05');
  });

  it('keeps asset paths unchanged while developing', () => {
    process.env.NODE_ENV = 'test';

    expect(assetUrl('/assets/login.js')).toBe('/assets/login.js');
  });
});

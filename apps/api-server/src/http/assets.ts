const DEFAULT_ASSET_VERSION = '0.1.0';

export function isDevelopmentAssetMode() {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}

export function getAssetCacheControl() {
  if (isDevelopmentAssetMode()) {
    return 'no-store';
  }
  return 'public, max-age=31536000, immutable';
}

export function getAssetVersion() {
  return process.env.ROJ_ASSET_VERSION || DEFAULT_ASSET_VERSION;
}

export function assetUrl(pathname: string) {
  if (isDevelopmentAssetMode()) {
    return pathname;
  }

  const separator = pathname.includes('?') ? '&' : '?';
  return `${pathname}${separator}v=${encodeURIComponent(getAssetVersion())}`;
}

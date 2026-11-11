import { compareVersions, fetchReleaseCatalog, selectPlatformRelease } from '../../electron/releaseCatalog.js';

export type UpdateInfo = {
  current: string;
  latestTag?: string;
  releaseUrl?: string;
  windowsExeUrl?: string;
  androidApkUrl?: string;
  windowsNewer?: boolean;
  androidNewer?: boolean;
  windowsVersion?: string;
  androidVersion?: string;
  isNewer: boolean;
  error?: string;
};

export async function checkForUpdates(currentVersion: string, platform: 'android' | 'windows' | 'web' = 'web'): Promise<UpdateInfo> {
  try {
    const releases = await fetchReleaseCatalog();
    const windows = selectPlatformRelease(releases, 'windows');
    const android = selectPlatformRelease(releases, 'android');
    const selected = platform === 'android' ? android : platform === 'windows' ? windows : (
      !windows || (android && compareVersions(android.version, windows.version) > 0) ? android : windows
    );
    if (!selected) throw new Error('No downloadable update is available for this platform yet.');
    return {
      current: currentVersion, latestTag: selected.release.tag_name, releaseUrl: selected.release.html_url,
      windowsExeUrl: windows?.asset.browser_download_url, androidApkUrl: android?.asset.browser_download_url,
      windowsVersion: windows?.version, androidVersion: android?.version,
      windowsNewer: Boolean(windows && compareVersions(windows.version, currentVersion) > 0),
      androidNewer: Boolean(android && compareVersions(android.version, currentVersion) > 0),
      isNewer: compareVersions(selected.version, currentVersion) > 0,
    };
  } catch (error) {
    return { current: currentVersion, isNewer: false, error: (error as Error).message };
  }
}

export type UpdateInfo = {
  current: string;
  latestTag?: string;
  releaseUrl?: string;
  windowsExeUrl?: string;
  androidApkUrl?: string;
  isNewer: boolean;
  error?: string;
};

const normalize = (v: string) => v.replace(/^v/, '').split('-')[0];

const cmp = (a: string, b: string) => {
  const as = normalize(a).split('.').map(n => parseInt(n, 10) || 0);
  const bs = normalize(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(as.length, bs.length); i++) {
    const ai = as[i] || 0; const bi = bs[i] || 0;
    if (ai > bi) return 1; if (ai < bi) return -1;
  }
  return 0;
};

export async function checkForUpdates(currentVersion: string): Promise<UpdateInfo> {
  try {
    const res = await fetch('https://api.github.com/repos/JelanieStarks/Couples-To-do-list-SPA/releases/latest', {
      headers: { 'Accept': 'application/vnd.github+json' },
    });
    if (!res.ok) {
      return { current: currentVersion, isNewer: false, error: `GitHub API error: ${res.status}` };
    }
    const data = await res.json();
    const latestTag: string | undefined = data?.tag_name;
    const releaseUrl: string | undefined = data?.html_url;
    const assets: any[] = Array.isArray(data?.assets) ? data.assets : [];
    const windowsExe = assets.find(a => typeof a?.browser_download_url === 'string' && /\.exe$/i.test(a.browser_download_url));
    const androidApk = assets.find(a => typeof a?.browser_download_url === 'string' && /\.apk$/i.test(a.browser_download_url));

    const isNewer = latestTag ? cmp(latestTag, currentVersion) > 0 : false;
    return {
      current: currentVersion,
      latestTag,
      releaseUrl,
      windowsExeUrl: windowsExe?.browser_download_url,
      androidApkUrl: androidApk?.browser_download_url,
      isNewer,
    };
  } catch (err: any) {
    return { current: currentVersion, isNewer: false, error: err?.message || 'Unknown error' };
  }
}

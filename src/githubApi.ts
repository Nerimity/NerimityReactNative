const owner = 'Nerimity';
const repo = 'NerimityReactNative';

export interface Release {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  assets?: {
    name: string;
    browser_download_url: string;
  }[];
  mainAssetUrl?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url + `?rnd=${Math.random()}`);
  const json = await res.json();
  return json;
}

function getReleases() {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases`;
  return fetchJson<Release[]>(url);
}

function getRelease(releaseId: string) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/${releaseId}`;
  return fetchJson<Release>(url);
}

export async function getLatestRelease() {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  const json = await fetchJson<Release>(url);
  json.mainAssetUrl = json.assets?.find(a =>
    a.name.endsWith('.apk'),
  )?.browser_download_url;
  return json;
}

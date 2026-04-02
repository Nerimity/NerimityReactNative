import { URL } from 'react-native-url-polyfill';

import UrlPattern from '@bicycle-codes/url-pattern';

const serverChannelMatcher = new UrlPattern(
  '/app/servers/:serverId/:channelId',
);

const dmChannelMatcher = new UrlPattern('/app/inbox/:channelId');

export function serverChannelMatch(url: string) {
  try {
    const path = new URL(url).pathname;
    return serverChannelMatcher.match(path) as {
      serverId: string;
      channelId: string;
    } | null;
  } catch {
    return null;
  }
}

export function dmChannelMatch(url: string) {
  try {
    const path = new URL(url).pathname;
    return dmChannelMatcher.match(path) as { channelId: string } | null;
  } catch {
    return null;
  }
}

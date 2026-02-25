import notifee from '@notifee/react-native';
import {NativeModules} from 'react-native';
import env from './env';
import {getUserId} from './EncryptedStore';
import {dmChannelMatch, serverChannelMatch} from './UrlPatternMatchers';
import {currentUrl} from './components/CustomWebView';

const {EmojiNotificationModule} = NativeModules;

export enum MessageType {
  CONTENT = 0,
  JOIN_SERVER = 1,
  LEAVE_SERVER = 2,
  KICK_USER = 3,
  BAN_USER = 4,
  STARTED_CALL = 5,
}

const ANDROID_CHANNELS = {
  dmMessages: 'dm-messages',
  serverMessages: 'server-messages',
};

export const registerNotificationChannels = async () => {
  // Request permissions (required for iOS)
  await notifee.requestPermission();

  // Create a channel (required for Android)
  await notifee.createChannel({
    id: ANDROID_CHANNELS.dmMessages,
    name: 'DM Messages',
  });
  await notifee.createChannel({
    id: ANDROID_CHANNELS.serverMessages,
    name: 'Server Messages',
  });
};

interface NotificationData {
  cUserId: string;
  channelId: string;

  content: string;
  type: string;

  cName: string;
}

interface ServerNotificationData extends NotificationData {
  serverId: string;
  channelName: string;
  serverName: string;
  sAvatar?: string;
  sHexColor: string;
}
interface DMNotificationData extends NotificationData {
  uAvatar?: string;
  uHexColor: string;
}

export async function handlePushNotification(
  data: ServerNotificationData & DMNotificationData,
  isBackground: boolean,
) {
  if (!isBackground) {
    const {channelId} =
      dmChannelMatch(currentUrl) || serverChannelMatch(currentUrl) || {};
    if (channelId && data.channelId === channelId) {
      return;
    }
  }

  if (data.serverId) {
    showServerPushNotification(data);
  }
  if (!data.serverId) {
    showDMNotificationData(data);
  }
}

export async function showServerPushNotification(data: ServerNotificationData) {
  const selfUserId = await getUserId();

  if (selfUserId === data.cUserId) {
    return;
  }

  const creatorName = sanitize(data.cName);
  let content = data.content;

  // lets assume its an image message
  if (!data.content) {
    content = 'sent an image.';
  }

  const type = parseInt(data.type);

  if (type === MessageType.JOIN_SERVER) {
    content = 'has joined the server.';
  }
  if (type === MessageType.LEAVE_SERVER) {
    content = 'has left the server.';
  }
  if (type === MessageType.BAN_USER) {
    content = 'has been banned.';
  }
  if (type === MessageType.KICK_USER) {
    content = 'has been kicked.';
  }
  if (type === MessageType.STARTED_CALL) {
    content = 'has started a call.';
  }

  let emojis: {placeholder: string; url: string}[] = [];
  if (type === MessageType.CONTENT && data.content) {
    const result = replaceCustomEmojisWithPlaceholders(data.content);
    content = formatMarkup(sanitize(result.body));
    emojis = result.emojis;
  }

  const bodyText = `<b>${creatorName}</b>: ${content}`;

  EmojiNotificationModule.displayNotification({
    id: data.channelId,
    title: `<b>${sanitize(data.serverName)} | #${sanitize(data.channelName)}</b>`,
    body: bodyText,
    emojis,
    channelId: ANDROID_CHANNELS.serverMessages,
    subText: sanitize(data.serverName),
    largeIcon: data.sAvatar
      ? `${env.NERIMITY_CDN}${data.sAvatar}`
      : null,
    circularLargeIcon: true,
    fallbackAvatarLetter: data.serverName?.charAt(0)?.toUpperCase() || '?',
    fallbackAvatarColor: data.sHexColor || '#7c7c7c',
    serverId: data.serverId,
  });
}

export async function showDMNotificationData(data: DMNotificationData) {
  const selfUserId = await getUserId();

  if (selfUserId === data.cUserId) {
    return;
  }

  let newLine = sanitize(data.content);

  // lets assume its an image message
  if (!data.content) {
    newLine = 'sent an image.';
  }

  const type = parseInt(data.type);
  if (type === MessageType.STARTED_CALL) {
    newLine = 'has started a call.';
  }

  let emojis: {placeholder: string; url: string}[] = [];
  if (type === MessageType.CONTENT && data.content) {
    const result = replaceCustomEmojisWithPlaceholders(data.content);
    newLine = formatMarkup(sanitize(result.body));
    emojis = result.emojis;
  }

  EmojiNotificationModule.displayNotification({
    id: data.channelId,
    title: `<b>${sanitize(data.cName)}</b>`,
    body: `<b>${sanitize(data.cName)}</b>: ${newLine}`,
    emojis,
    channelId: ANDROID_CHANNELS.dmMessages,
    subText: 'Direct',
    largeIcon: data.uAvatar
      ? `${env.NERIMITY_CDN}${data.uAvatar}`
      : null,
    circularLargeIcon: true,
    fallbackAvatarLetter: data.cName?.charAt(0)?.toUpperCase() || '?',
    fallbackAvatarColor: data.uHexColor || '#7c7c7c',
    userId: data.cUserId,
  });
}

// notifee.onBackgroundEvent(async ({ type, detail, headless }) => {
//   if (type === EventType.DISMISSED) {
//     // Update remote API
//   }
// });

function sanitize(string?: string) {
  if (!string?.trim()) {
    return '';
  }
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  } as const;
  const reg = /[&<>]/g;
  return string.replace(reg, match => map[match as keyof typeof map]);
}

function formatMarkup(text: string): string {
  // headers: # to ###### => bold
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>');
  // spoiler: ||text|| => [spoiler]
  text = text.replace(/\|\|(.+?)\|\|/g, '[spoiler]');
  // bold+italic: ***text*** or ___text___
  text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<b><i>$1</i></b>');
  text = text.replace(/___(.*?)___/g, '<b><i>$1</i></b>');
  // bold: **text**
  text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  // ttalic: *text* or _text_
  text = text.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  text = text.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<i>$1</i>');
  // strikethrough: ~~text~~
  text = text.replace(/~~(.*?)~~/g, '<s>$1</s>');
  // link: [text](url) => text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // checkbox: -[ ] or -[x]
  text = text.replace(/-\[ \]/g, '☐');
  text = text.replace(/-\[x\]/g, '☑');
  // timestamp: [tr:1234567] => [timestamp]
  text = text.replace(/\[tr:\d+\]/g, '[timestamp]');
  // color: [#hex]text => text
  text = text.replace(/\[#[0-9a-fA-F]{3,8}\]/g, '');
  return text;
}

export function getPendingNotificationClick(): Promise<{
  channelId: string;
  serverId?: string;
  userId?: string;
} | null> {
  if (!EmojiNotificationModule?.getPendingNotificationClick) {
    return Promise.resolve(null);
  }
  return EmojiNotificationModule.getPendingNotificationClick();
}

const CUSTOM_EMOJI_REGEX = /\[(?:w?a)?ce:(\d+):([^\]]+)\]/g;

function getCustomEmojiUrl(emojiId: string, type: string): string {
  const ext = type === 'ace' ? 'gif' : 'webp';
  return `${env.NERIMITY_CDN}emojis/${emojiId}.${ext}`;
}

function extractAllCustomEmojis(
  content: string,
): {id: string; name: string; type: string}[] {
  const results: {id: string; name: string; type: string}[] = [];
  const regex = /\[((?:w?a)?ce):(\d+):([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    results.push({id: match[2], name: match[3], type: match[1]});
  }
  return results;
}

function replaceCustomEmojisWithPlaceholders(content: string): {
  body: string;
  emojis: {placeholder: string; url: string}[];
} {
  const emojis: {placeholder: string; url: string}[] = [];
  const seen = new Set<string>();
  const allEmojis = extractAllCustomEmojis(content);

  for (const emoji of allEmojis) {
    const placeholder = `:${emoji.name}:`;
    if (!seen.has(emoji.id)) {
      seen.add(emoji.id);
      emojis.push({placeholder, url: getCustomEmojiUrl(emoji.id, emoji.type)});
    }
  }

  const body = content.replace(CUSTOM_EMOJI_REGEX, ':$2:');
  return {body, emojis};
}

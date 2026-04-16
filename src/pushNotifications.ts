import notifee, {
  AndroidInboxStyle,
  AndroidStyle,
  AndroidVisibility,
} from '@notifee/react-native';
import env from './env';
import { getUserId } from './EncryptedStore';
import { dmChannelMatch, serverChannelMatch } from './UrlPatternMatchers';
import { currentUrl } from './components/CustomWebView';

export enum MessageType {
  CONTENT = 0,
  JOIN_SERVER = 1,
  LEAVE_SERVER = 2,
  KICK_USER = 3,
  BAN_USER = 4,
  STARTED_CALL = 5,
  BUMP_SERVER = 6,
  PINNED_MESSAGE = 7,
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
    const { channelId } =
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

function getNotificationText(type: number) {
  if (type === MessageType.JOIN_SERVER) {
    return 'has joined the server.';
  }
  if (type === MessageType.LEAVE_SERVER) {
    return 'has left the server.';
  }
  if (type === MessageType.BAN_USER) {
    return 'has been banned.';
  }
  if (type === MessageType.KICK_USER) {
    return 'has been kicked.';
  }
  if (type === MessageType.STARTED_CALL) {
    return 'has started a call.';
  }
  if (type === MessageType.BUMP_SERVER) {
    return 'has bumped the server.';
  }
  if (type === MessageType.PINNED_MESSAGE) {
    return 'has pinned a message.';
  }
}
export async function showServerPushNotification(data: ServerNotificationData) {
  const existingNotification = await notifee
    .getDisplayedNotifications()
    .then(res => res.find(n => n.notification.id === data.channelId));

  const selfUserId =
    existingNotification?.notification?.data?.selfUserId || (await getUserId());

  if (selfUserId === data.cUserId) {
    return;
  }

  const existingLines =
    (existingNotification?.notification?.android?.style as AndroidInboxStyle)
      ?.lines || [];

  const creatorName = sanitize(data.cName);

  const username = `<b>${creatorName}:</b>`;
  let content = data.content;

  // lets assume its an image message
  if (!data.content) {
    content = 'sent an image.';
  }

  const type = parseInt(data.type);

  const typeText = getNotificationText(type);
  if (typeText) {
    content = typeText;
  }

  let newLines = [username, content];

  // Display a notification
  await notifee.displayNotification({
    id: data.channelId,
    title: `<b>${sanitize(data.serverName)} #${sanitize(data.channelName)}</b>`,
    body: newLines.join(' '),
    data: {
      selfUserId: selfUserId!,
      channelId: data.channelId,
      serverId: data.serverId,
      userId: data.cUserId,
    },
    android: {
      smallIcon: 'ic_stat_notify',
      pressAction: {
        id: 'default',
      },
      groupId: data.channelId,
      visibility: AndroidVisibility.PUBLIC,
      circularLargeIcon: true,
      channelId: ANDROID_CHANNELS.serverMessages,
      ...(data.sAvatar
        ? { largeIcon: `${env.NERIMITY_CDN}${data.sAvatar}` }
        : undefined),
      style: {
        type: AndroidStyle.INBOX,
        title: `<b>${sanitize(data.serverName)} #${sanitize(
          data.channelName,
        )}</b>`,
        lines: [...existingLines, ...newLines].slice(-5),
      },
    },
  });
}

export async function showDMNotificationData(data: DMNotificationData) {
  const existingNotification = await notifee
    .getDisplayedNotifications()
    .then(res => res.find(n => n.notification.id === data.channelId));

  const selfUserId =
    existingNotification?.notification?.data?.selfUserId || (await getUserId());

  if (selfUserId === data.cUserId) {
    return;
  }

  const existingLines =
    (existingNotification?.notification?.android?.style as AndroidInboxStyle)
      ?.lines || [];

  let newLine = sanitize(data.content);

  // lets assume its an image message
  if (!data.content) {
    newLine = 'sent an image.';
  }

  const type = parseInt(data.type);
  const typeText = getNotificationText(type);
  if (typeText) {
    newLine = typeText;
  }

  // Display a notification
  await notifee.displayNotification({
    id: data.channelId,
    title: `<b>@${sanitize(data.cName)}</b>`,
    body: newLine,
    data: {
      selfUserId: selfUserId!,
      channelId: data.channelId,
      userId: data.cUserId,
    },
    android: {
      smallIcon: 'ic_stat_notify',
      pressAction: {
        id: 'default',
      },
      groupId: data.channelId,
      visibility: AndroidVisibility.PUBLIC,
      circularLargeIcon: true,
      channelId: ANDROID_CHANNELS.dmMessages,
      ...(data.uAvatar
        ? { largeIcon: `${env.NERIMITY_CDN}${data.uAvatar}` }
        : undefined),
      style: {
        type: AndroidStyle.INBOX,
        title: `<b>@${sanitize(data.cName)}</b>`,
        lines: [...existingLines, newLine].slice(-5),
      },
    },
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
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  } as const;
  const reg = /[&<>"'/]/gi;
  return string.replace(reg, match => map[match as keyof typeof map]);
}

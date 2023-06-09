import notifee, {
  AndroidInboxStyle,
  AndroidStyle,
  AndroidVisibility,
} from '@notifee/react-native';
import env from './env';
import {getUserId} from './EncryptedStore';
import {MessageType} from '../store/RawData';

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
) {
  if (data.serverId) {
    showServerPushNotification(data);
  }
  if (!data.serverId) {
    showDMNotificationData(data);
  }
}

export async function showServerPushNotification(data: ServerNotificationData) {
  // Request permissions (required for iOS)
  await notifee.requestPermission();

  // Create a channel (required for Android)
  const channelId = await notifee.createChannel({
    id: 'server-messages',
    name: 'Server Messages',
  });

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
    },
    android: {
      pressAction: {
        id: 'default',
      },
      groupId: Math.random().toString(),
      visibility: AndroidVisibility.PUBLIC,
      circularLargeIcon: true,
      channelId,
      ...(data.sAvatar
        ? {largeIcon: `${env.NERIMITY_CDN}${data.sAvatar}`}
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
  // Request permissions (required for iOS)
  await notifee.requestPermission();

  // Create a channel (required for Android)
  const channelId = await notifee.createChannel({
    id: 'dm-messages',
    name: 'DM Messages',
  });

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

  // Display a notification
  await notifee.displayNotification({
    id: data.channelId,
    title: `<b>@${sanitize(data.cName)}</b>`,
    body: newLine,
    data: {
      selfUserId: selfUserId!,
      channelId: data.channelId,
    },
    android: {
      pressAction: {
        id: 'default',
      },
      groupId: Math.random().toString(),
      visibility: AndroidVisibility.PUBLIC,
      circularLargeIcon: true,
      channelId,
      ...(data.uAvatar
        ? {largeIcon: `${env.NERIMITY_CDN}${data.uAvatar}`}
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
  };
  const reg = /[&<>"'/]/gi;
  return string.replace(reg, match => map[match]);
}

import notifee, {
  AndroidInboxStyle,
  AndroidStyle,
  AndroidVisibility,
} from '@notifee/react-native';
import env from './env';
import {getUserId} from './EncryptedStore';

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

  const newLine = `${data.cName}: ${data.content}`;

  // Display a notification
  await notifee.displayNotification({
    id: data.channelId,
    title: `${data.serverName} #${data.channelName}`,
    body: newLine,
    data: {
      selfUserId: selfUserId!,
    },
    android: {
      groupId: Math.random().toString(),
      visibility: AndroidVisibility.PUBLIC,
      circularLargeIcon: true,
      channelId,
      ...(data.sAvatar
        ? {largeIcon: `${env.NERIMITY_CDN}${data.sAvatar}`}
        : undefined),
      style: {
        type: AndroidStyle.INBOX,
        title: `${data.serverName} #${data.channelName}`,
        lines: [...existingLines, newLine].slice(-5),
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

  const newLine = data.content;

  // Display a notification
  await notifee.displayNotification({
    id: data.channelId,
    title: `@${data.cName}`,
    body: newLine,
    data: {
      selfUserId: selfUserId!,
    },
    android: {
      groupId: Math.random().toString(),
      visibility: AndroidVisibility.PUBLIC,
      circularLargeIcon: true,
      channelId,
      ...(data.uAvatar
        ? {largeIcon: `${env.NERIMITY_CDN}${data.uAvatar}`}
        : undefined),
      style: {
        type: AndroidStyle.INBOX,
        title: `@${data.cName}`,
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

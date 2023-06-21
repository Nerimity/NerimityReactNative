import notifee, {
  AndroidBadgeIconType,
  AndroidStyle,
} from '@notifee/react-native';
import env from './env';

interface NotificationData {
  cUserId: string;
  channelId: string;

  content: string;
  type: string;

  cName: string;
  cAvatar?: string;
  cHexColor: string;
}

interface ServerNotificationData extends NotificationData {
  serverId: string;
  channelName: string;
  serverName: string;
}

export async function showServerPushNotification(data: ServerNotificationData) {
  // Request permissions (required for iOS)
  await notifee.requestPermission();

  // Create a channel (required for Android)
  const channelId = await notifee.createChannel({
    id: 'server-messages',
    name: 'Server Messages',
  });

  // Display a notification
  const notificationId = await notifee.displayNotification({
    title: `${data.serverName} #${data.channelName}`,
    body: 'Main body content of the notification',
    subtitle: 'test',
    android: {
      circularLargeIcon: true,

      channelId,
      style: {
        type: AndroidStyle.INBOX,
        title: `${data.serverName} #${data.channelName}`,
        lines: [`${data.cName}: ${data.content}`],
      },
    },
  });
}

// notifee.onBackgroundEvent(async ({ type, detail, headless }) => {
//   if (type === EventType.DISMISSED) {
//     // Update remote API
//   }
// });

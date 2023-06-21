import notifee, {AndroidStyle, AndroidVisibility} from '@notifee/react-native';

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

  const existingNotification = await notifee
    .getDisplayedNotifications()
    .then(res => res.find(n => n.notification.id === data.channelId));

  const existingLines =
    existingNotification?.notification?.android?.style?.lines || [];

  // Display a notification
  await notifee.displayNotification({
    id: data.channelId,
    title: `${data.serverName} #${data.channelName}`,
    android: {
      groupId: Math.random().toString(),
      visibility: AndroidVisibility.PUBLIC,
      circularLargeIcon: true,
      channelId,
      style: {
        type: AndroidStyle.INBOX,
        title: `${data.serverName} #${data.channelName}`,
        lines: [...existingLines, `${data.cName}: ${data.content}`],
      },
    },
  });
}

// notifee.onBackgroundEvent(async ({ type, detail, headless }) => {
//   if (type === EventType.DISMISSED) {
//     // Update remote API
//   }
// });

import React, { JSX, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  View,
} from 'react-native';
import Show from './src/components/ui/Show';
import {
  CustomWebView,
  CustomWebViewRef,
} from './src/components/CustomWebView';
import { CustomVideo, CustomVideoRef } from './src/components/ui/CustomVideo';
import TrackPlayer from 'react-native-track-player';

import {
  handlePushNotification,
  registerNotificationChannels,
} from './src/pushNotifications';

import {
  setBackgroundMessageHandler,
  onMessage,
  FirebaseMessagingTypes,
  getMessaging,
} from '@react-native-firebase/messaging';
import notifee, { EventType, Notification } from '@notifee/react-native';
import { getLatestRelease, Release } from './src/githubApi';
import env from './src/env';
import { openDMChannelRequest } from './src/services/UserService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CallUI } from './src/components/CallUI';
import { SocketProvider } from './src/SocketProvider';
import { CallProvider } from './src/CallProvider';
import { WebViewProvider } from './src/WebViewProvider';
import { UserStoreProvider } from './src/UserStoreProvider';

TrackPlayer.setupPlayer();

async function onMessageReceived(
  message: FirebaseMessagingTypes.RemoteMessage,
  isBackground: boolean,
) {
  handlePushNotification(message.data as any, isBackground);
}

onMessage(getMessaging(), e => onMessageReceived(e, false));
setBackgroundMessageHandler(getMessaging(), e => onMessageReceived(e, true));

let backgroundClickedNotification: Notification | undefined;
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification } = detail;
  if (type === EventType.PRESS) {
    backgroundClickedNotification = notification;
  }
});

function App(): JSX.Element {
  const videoRef = useRef<CustomVideoRef | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const webViewRef = useRef<CustomWebViewRef | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const runIfAuthenticated = useWaitFor(authenticated);
  const [behaviour, setBehaviour] = useState<'padding' | undefined>('padding');

  useUpdateChecker();

  useEffect(() => {
    registerNotificationChannels();
  }, []);

  const handleNotificationClick = useCallback(
    async (notification: any) => {
      const serverId = notification?.data?.serverId;
      const channelId = notification?.data?.channelId;
      const userId = notification?.data?.userId;

      if (!authenticated && serverId) {
        setUrl(`https://nerimity.com/app/servers/${serverId}/${channelId}`);
        return;
      }
      if (!authenticated && !serverId) {
        openDMChannelRequest(userId).then(() => {
          setUrl(`https://nerimity.com/app/inbox/${channelId}`);
        });
        return;
      }

      runIfAuthenticated(() => {
        webViewRef.current?.emit('openChannel', {
          serverId,
          channelId,
          userId,
        });
      });
    },
    [runIfAuthenticated, authenticated],
  );

  useEffect(() => {
    notifee.getInitialNotification().then(initN => {
      if (!initN?.notification) {
        return;
      }
      handleNotificationClick(initN.notification);
    });

    const disposeForegroundEvent = notifee.onForegroundEvent(
      ({ type, detail }) => {
        if (type === EventType.PRESS) {
          handleNotificationClick(detail.notification);
        }
      },
    );

    const event = AppState.addEventListener('focus', () => {
      if (backgroundClickedNotification) {
        handleNotificationClick(backgroundClickedNotification);
      }
      backgroundClickedNotification = undefined;
    });

    return () => {
      disposeForegroundEvent();
      event.remove();
    };
  }, [handleNotificationClick]);

  const onAndroidBackPress = useCallback(() => {
    console.log('close 2');
    if (videoUrl) {
      console.log('close 1');
      videoRef.current?.stopVideo();
      return true;
    }
    return webViewRef.current?.goBack() || false;
  }, [videoUrl]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const sub = BackHandler.addEventListener(
        'hardwareBackPress',
        onAndroidBackPress,
      );
      return () => {
        sub.remove();
      };
    }
  }, [onAndroidBackPress]);

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', () => {
      setBehaviour('padding');
    });
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setBehaviour(undefined);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return (
    <UserStoreProvider>
      <WebViewProvider>
        <SocketProvider>
          <CallProvider>
            <View style={{ flex: 1, backgroundColor: 'black' }}>
              <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                  style={{ flex: 1 }}
                  behavior={Platform.OS === 'android' ? behaviour : undefined}
                >
                  <CallUI />
                  <CustomWebView
                    onAuthenticated={() => setAuthenticated(true)}
                    ref={webViewRef}
                    // url={url || 'http://192.168.1.53:3000/login'}
                    url={url || 'https://nerimity.com/login'}
                    onVideoClick={setVideoUrl}
                  />
                  <Show when={videoUrl}>
                    <CustomVideo
                      ref={videoRef}
                      videoUrl={videoUrl!}
                      onVideoEnd={() => {
                        setVideoUrl(null);
                      }}
                    />
                  </Show>
                </KeyboardAvoidingView>
              </SafeAreaView>
            </View>
          </CallProvider>
        </SocketProvider>
      </WebViewProvider>
    </UserStoreProvider>
  );
}

function useUpdateChecker() {
  const updateAlert = useCallback((release: Release) => {
    const onUpdateNow = () =>
      release.mainAssetUrl && Linking.openURL(release.mainAssetUrl);
    const onViewChangelog = () => {
      updateAlert(release);
      Linking.openURL(release.html_url);
    };

    Alert.alert(
      'Update Available',
      `Current: ${env.APP_VERSION}\nLatest: ${release.tag_name}`,
      [
        { text: 'Later' },
        {
          text: 'View Changelog',
          onPress: onViewChangelog,
        },
        {
          isPreferred: true,
          text: 'Update Now',
          onPress: onUpdateNow,
        },
      ],
    );
  }, []);

  const checkForUpdates = useCallback(async () => {
    console.log('Checking for updates...');

    const latestRelease = await getLatestRelease();
    if (latestRelease.tag_name !== env.APP_VERSION) {
      updateAlert(latestRelease);
    }
  }, [updateAlert]);

  useEffect(() => {
    if (env.DEV_MODE) {
      return;
    }

    checkForUpdates();
  }, [checkForUpdates]);
}

export default App;

const useWaitFor = (waitFor: boolean) => {
  const [cbRef, setCbRef] = useState<(() => void) | undefined>();

  useEffect(() => {
    if (waitFor && cbRef) {
      cbRef?.();
      setCbRef(undefined);
    }
  }, [waitFor, cbRef]);

  const run = useCallback((cb: () => void) => {
    setCbRef(() => cb);
  }, []);

  return run;
};

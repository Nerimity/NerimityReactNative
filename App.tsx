import React, {useCallback, useEffect, useRef, useState} from 'react';
import {BackHandler, Platform} from 'react-native';
import Show from './src/components/ui/Show';
import {CustomWebView, CustomWebViewRef} from './src/components/CustomWebView';
import {CustomVideo, CustomVideoRef} from './src/components/ui/CustomVideo';
import TrackPlayer from 'react-native-track-player';

import {handlePushNotification} from './src/pushNotifications';

import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, {EventType, Notification} from '@notifee/react-native';

TrackPlayer.setupPlayer();

async function onMessageReceived(
  message: FirebaseMessagingTypes.RemoteMessage,
) {
  handlePushNotification(message.data as any);
}

messaging().onMessage(onMessageReceived);
messaging().setBackgroundMessageHandler(onMessageReceived);

let backgroundClickedNotification: Notification | undefined;
notifee.onBackgroundEvent(async ({type, detail}) => {
  const {notification} = detail;
  if (type === EventType.PRESS) {
    backgroundClickedNotification = notification;
  }
});

function App(): JSX.Element {
  const videoRef = useRef<CustomVideoRef | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const webViewRef = useRef<CustomWebViewRef | null>(null);

  const onAndroidBackPress = useCallback(() => {
    if (videoUrl) {
      videoRef.current?.stopVideo();
      return true;
    }
    return webViewRef.current?.goBack() || false;
  }, [videoUrl]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', onAndroidBackPress);
      return () => {
        BackHandler.removeEventListener(
          'hardwareBackPress',
          onAndroidBackPress,
        );
      };
    }
  }, [onAndroidBackPress]);

  return (
    <>
      <CustomWebView ref={webViewRef} onVideoClick={setVideoUrl} />
      <Show when={videoUrl}>
        <CustomVideo
          ref={videoRef}
          videoUrl={videoUrl!}
          onVideoEnd={() => setVideoUrl(null)}
        />
      </Show>
    </>
  );
}

export default App;

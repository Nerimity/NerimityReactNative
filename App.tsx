import React, {useCallback, useEffect, useRef, useState} from 'react';
import {BackHandler, Platform} from 'react-native';
import Show from './src/components/ui/Show';
import {CustomWebView, CustomWebViewRef} from './src/components/CustomWebView';
import {CustomVideo, CustomVideoRef} from './src/components/ui/CustomVideo';
import TrackPlayer from 'react-native-track-player';

TrackPlayer.setupPlayer();

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

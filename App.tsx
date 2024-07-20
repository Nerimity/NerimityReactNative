import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {BackHandler, Platform} from 'react-native';
import WebView from 'react-native-webview';
import Video, {VideoRef} from 'react-native-video';
import Show from './src/components/ui/Show';

function App(): JSX.Element {
  const videoRef = useRef<VideoRef | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const webViewRef = useRef<CustomWebViewRef | null>(null);

  const closeVideo = () => {
    videoRef.current?.setFullScreen(false);
    setVideoUrl(null);
  };

  const onAndroidBackPress = useCallback(() => {
    if (videoUrl) {
      closeVideo();
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
      <CustomWebView ref={webViewRef} />
      <Show when={videoUrl}>
        <Video
          ref={videoRef}
          source={{uri: videoUrl!}}
          controls
          fullscreen
          playInBackground={false}
          style={{
            backgroundColor: 'black',
            position: 'absolute',
            zIndex: 1111,
            width: '100%',
            height: '100%',
          }}
          onEnd={closeVideo}
        />
      </Show>
    </>
  );
}

interface CustomWebViewRef {
  goBack: () => boolean;
}

const CustomWebView = forwardRef<CustomWebViewRef>((props, ref) => {
  const webViewRef = useRef<WebView | null>(null);

  const [webViewCanGoBack, setWebViewCanGoBack] = useState(false);

  useImperativeHandle(ref, () => ({
    goBack: () => {
      if (!webViewCanGoBack) {
        return false;
      }
      webViewRef.current?.goBack();
      return true;
    },
  }));

  useEffect(() => {
    console.log('can go back', webViewCanGoBack);
  }, [webViewCanGoBack]);

  const inject = `
    (() => {
    
      const post = (event, payload) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({event, payload}));
      };
    
      const playVideo = (url) => {
        post('playVideo', {url});
      };
    
    
      window.reactNative = {
        isReactNative: true,
        playVideo
      };
    
    })();

    true; // note: this is required, or you'll sometimes get silent failures
  `;

  return (
    <WebView
      ref={webViewRef}
      mediaPlaybackRequiresUserAction={false}
      injectedJavaScriptBeforeContentLoaded={inject}
      bounces={false}
      overScrollMode="never"
      setBuiltInZoomControls={false}
      textInteractionEnabled={false}
      webviewDebuggingEnabled
      style={{width: '100%', height: '100%'}}
      source={{uri: 'http://nerimity.com/app'}}
      onLoadProgress={({nativeEvent}) => {
        setWebViewCanGoBack(nativeEvent.canGoBack);
      }}
      onMessage={evt => {
        try {
          const {event, payload} = JSON.parse(evt.nativeEvent.data);
          if (event === 'playVideo') {
            const {url} = payload;
            // setVideoUrl(url);
          }
        } catch (e) {
          console.log(e);
        }
      }}
    />
  );
});

export default App;

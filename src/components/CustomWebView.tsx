import React, {createRef} from 'react';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {StyleSheet} from 'react-native';
import WebView, {WebViewMessageEvent} from 'react-native-webview';

import TrackPlayer, {
  Event,
  State,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import {getPlaybackState} from 'react-native-track-player/lib/src/trackPlayer';

export interface CustomWebViewRef {
  goBack: () => boolean;
}

export interface CustomWebViewProps {
  onVideoClick: (url: string) => void;
}

export const CustomWebView = forwardRef<CustomWebViewRef, CustomWebViewProps>(
  (props, ref) => {
    const webViewRef = useRef<WebView | null>(null);

    const [webViewCanGoBack, setWebViewCanGoBack] = useState(false);

    const localRefs = () => ({
      goBack: () => {
        if (!webViewCanGoBack) {
          return false;
        }
        webViewRef.current?.goBack();
        return true;
      },
      emit: (event: string, payload: any) => {
        console.log('Emitting', event);
        webViewRef.current?.injectJavaScript(`
          window.reactNative.emit('${event}', ${JSON.stringify(payload)});
          true;
        `);
      },
    });

    useImperativeHandle(ref, localRefs);

    const inject = `
      (() => {

        const listeners = {};

        const on = (event, callback) =>  {
          if (!listeners[event]) {
            listeners[event] = [];
          }
          listeners[event].push(callback);
        }
          
        const off = (event, callback) =>  {
          if (!listeners[event]) {
            return;
          }
          const index = listeners[event].indexOf(callback);
          if (index === -1) {
            return;
          }
          listeners[event].splice(index, 1);
        }
        const emit = (event, payload) => {
          if (!listeners[event]) {
            return;
          }
          listeners[event].forEach(listener => listener(payload));
        }
      
        const post = (event, payload) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({event, payload}));
        };

        const logout = () => {
          post('logout');
        }
        const token = (token) => {
          post('token', token);
        }

      
        const playVideo = (url) => {
          post('playVideo', {url});
        };
      
        const playAudio = (url) => {
          post('playAudio', {url});
        }
        
        const pauseAudio = () => {
          post('pauseAudio');
        }

        const seekAudio = (progress) => {
          post('seekAudio', progress);
        }
      
        window.reactNative = {
          isReactNative: true,
          playVideo,
          playAudio,
          pauseAudio,
          seekAudio,
          on,
          off,
          emit,
        };


      
      })();

      true; // note: this is required, or you'll sometimes get silent failures

    `;

    useTrackPlayerEvents([Event.PlaybackState], async event => {
      if (event.state === State.Playing) {
        const progress = await TrackPlayer.getProgress();
        const track = await TrackPlayer.getActiveTrack();
        localRefs().emit('audioLoaded', {
          url: track?.url,
          duration: progress.duration,
          position: progress.position,
        });
      }
    });

    const onMessage = async (evt: WebViewMessageEvent) => {
      const {event, payload} = JSON.parse(evt.nativeEvent.data);
      if (event === 'playVideo') {
        const {url} = payload;
        props.onVideoClick(url);
      }
      if (event === 'playAudio') {
        const {url} = payload;
        if (!url) {
          TrackPlayer.play();
          return;
        }
        localRefs().emit('audioLoading', {url});
        await TrackPlayer.reset();
        await TrackPlayer.setPlayWhenReady(true);
        TrackPlayer.add({url});
      }
      if (event === 'seekAudio') {
        const progress = payload;
        await TrackPlayer.seekTo(progress);
        await TrackPlayer.play();
      }
      if (event === 'pauseAudio') {
        TrackPlayer.pause();
      }
    };

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
        style={styles.container}
        source={{uri: 'http://192.168.1.128:3000/login'}}
        onLoadProgress={({nativeEvent}) => {
          setWebViewCanGoBack(nativeEvent.canGoBack);
        }}
        onMessage={onMessage}
      />
    );
  },
);
const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
});

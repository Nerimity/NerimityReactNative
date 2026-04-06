import React, { useEffect } from 'react';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import EncryptedStorage from 'react-native-encrypted-storage';
import {
  getMessaging,
  getToken,
  registerDeviceForRemoteMessages,
  unregisterDeviceForRemoteMessages,
} from '@react-native-firebase/messaging';

import TrackPlayer, {
  Event,
  State,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import { storeUserId, storeUserToken } from '../EncryptedStore';
import { AppState } from 'react-native';
import env from '../env';
import { io } from 'socket.io-client';
import { useSocket } from '../SocketProvider';
import { decompressObject } from '../zstd';
import { useCall } from '../CallProvider';
import { useWebView } from '../WebViewProvider';
import { User, useUserStore } from '../UserStoreProvider';

export interface CustomWebViewRef {
  goBack: () => boolean;
  emit(event: string, payload: any): void;
}

export interface CustomWebViewProps {
  url?: string | null;
  onVideoClick: (url: string) => void;
  onAuthenticated: (userId: string) => void;
}

export let currentUrl = '';

export const CustomWebView = forwardRef<CustomWebViewRef, CustomWebViewProps>(
  (props, ref) => {
    const { setCurrentUrl } = useWebView();
    const webViewRef = useRef<WebView | null>(null);
    const { setVoiceUsers } = useCall();
    const { socket, setSocket } = useSocket();
    const { setUsers } = useUserStore();

    const [webViewCanGoBack, setWebViewCanGoBack] = useState(false);

    useEffect(() => {
      const dispose = AppState.addEventListener('change', state => {
        const event = state === 'active' ? 'focus' : 'blur';
        webViewRef.current?.injectJavaScript(`  
          window.dispatchEvent(new Event('${event}'));
          true;
        `);

        if (state === 'active') {
          socket?.connect();
        }
      });

      return () => {
        dispose.remove();
      };
    }, [socket]);

    const onWebViewReady = () => {
      webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new Event('focus'));
      true;
    `);
    };

    const localRefs = () =>
      ({
        goBack: () => {
          if (!webViewCanGoBack) {
            return false;
          }
          webViewRef.current?.goBack();
          return true;
        },
        emit: (event: string, payload: any) => {
          webViewRef.current?.injectJavaScript(`
          window.reactNative.emit('${event}', ${JSON.stringify(payload)});
          true;
        `);
        },
      } satisfies CustomWebViewRef);

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
        const authenticated = (userId) => {
          post('authenticated', {userId, userToken: localStorage.getItem("userToken")});
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
          post,
          isReactNative: true,
          version: "${env.APP_VERSION || 'dev'}",
          playVideo,
          playAudio,
          pauseAudio,
          seekAudio,
          authenticated,
          logout,
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
      const { event, payload } = JSON.parse(evt.nativeEvent.data);

      if (event === 'sio_connect') {
        const { url } = payload;
        socket?.disconnect();
        socket?.removeAllListeners();
        let newSocket = io(url, {
          transports: ['websocket'],
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
          console.log('connected');
          localRefs().emit('sio_event', {
            event: 'connect',
            payload: { id: newSocket.id },
          });
        });
        newSocket.on('disconnect', (reason, description) => {
          if (AppState.currentState !== 'active') {
            newSocket.disconnect();
          }
          console.log('disconnected', reason, description);
          localRefs().emit('sio_event', {
            event: 'disconnect',
            payload: { reason, description },
          });
        });
        newSocket.io.on('reconnect_attempt', attempt => {
          console.log('reconnect_attempt', attempt);
          localRefs().emit('sio_event', {
            event: 'reconnect_attempt',
            payload: { attempt },
          });
        });

        newSocket.onAny((...args) => {
          const [sEvent, sPayload] = args;
          let decompressed: any = null;
          // console.log('socket event', sEvent);

          if (sPayload instanceof ArrayBuffer) {
            decompressed = decompressObject<any>(new Uint8Array(sPayload));
            localRefs().emit('sio_event', {
              event: sEvent, //
              payload: decompressed,
            });
            setVoiceUsers(decompressed.voiceChannelUsers);
          } else {
            localRefs().emit('sio_event', { event: sEvent, payload: sPayload });
          }
          if (sEvent === 'user:authenticated') {
            const pld = decompressed || sPayload;
            setVoiceUsers(pld.voiceChannelUsers);
            let users: Record<string, User> = {};
            pld.serverMembers.forEach((sm: { user: User }) => {
              users[sm.user.id] = sm.user;
            });
            pld.inbox.forEach((inbox: { recipient: User }) => {
              users[inbox.recipient.id] = inbox.recipient;
            });
            pld.friends.forEach((f: { recipient: User }) => {
              users[f.recipient.id] = f.recipient;
            });
            users[pld.user.id] = pld.user;
            setUsers(users);
          }
        });
      }
      if (event === 'sio_emit') {
        const { event: socketEvent, payload: socketPayload } = payload;
        // console.log('emitting', socketEvent);
        socket?.emit(socketEvent, socketPayload);
      }

      if (event === 'playVideo') {
        const { url } = payload;
        props.onVideoClick(url);
      }
      if (event === 'playAudio') {
        const { url } = payload;
        if (!url) {
          TrackPlayer.play();
          return;
        }
        localRefs().emit('audioLoading', { url });
        await TrackPlayer.reset();
        await TrackPlayer.setPlayWhenReady(true);
        TrackPlayer.add({ url });
      }
      if (event === 'seekAudio') {
        const progress = payload;
        await TrackPlayer.seekTo(progress);
        await TrackPlayer.play();
      }
      if (event === 'pauseAudio') {
        TrackPlayer.pause();
      }
      if (event === 'logout') {
        console.log('logged out');
        socket?.removeAllListeners();
        socket?.disconnect();
        await EncryptedStorage.clear();
        await unregisterDeviceForRemoteMessages(getMessaging());
      }
      if (event === 'authenticated') {
        props.onAuthenticated(payload);
        const { userId, userToken } = payload;
        console.log('authenticated', userId);
        await storeUserId(userId);
        await storeUserToken(userToken);

        await registerDeviceForRemoteMessages(getMessaging());
        const token = await getToken(getMessaging());
        localRefs().emit('registerFCM', { token });
      }
    };

    return (
      <WebView
        ref={webViewRef}
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScriptBeforeContentLoaded={inject}
        bounces={false}
        overScrollMode="never"
        allowsFullscreenVideo={true}
        setBuiltInZoomControls={false}
        textInteractionEnabled={false}
        webviewDebuggingEnabled
        textZoom={100}
        style={styles.container}
        source={{ uri: props.url || 'https://nerimity.com/login' }}
        onLoadProgress={({ nativeEvent }) => {
          setWebViewCanGoBack(nativeEvent.canGoBack);
        }}
        onLoadEnd={onWebViewReady}
        onNavigationStateChange={state => {
          currentUrl = state.url;
          setCurrentUrl(currentUrl);
          console.log(state.url);
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
    backgroundColor: '#131416',
  },
});

import {
  createContext,
  JSX,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSocket, useSocketListener } from './SocketProvider';
import { getUserId, getUserToken } from './EncryptedStore';
import SimplePeer from './SimplePeer';
import inCallManager from 'react-native-incall-manager';
import { setCallAudioState } from './callAudio';
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';
import notifee, {
  AndroidCategory,
  AndroidImportance,
} from '@notifee/react-native';

// https://stackoverflow.com/questions/63432839/how-to-prevent-socket-io-from-disconnecting-when-react-native-app-is-in-backgrou
import BackgroundTimer, { IntervalId } from 'react-native-background-timer';
import {
  AppState,
  AppStateStatus,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

type CallContextValue = {
  joinCall: (channelId: string) => Promise<void>;
  endCall: () => void;
  setVoiceUsers: (users: VoiceUser[]) => void;
  cycleAudioRoute: () => Promise<void>;
  audioDevice: string;
  toggleMic: () => void;
  isMicMuted: boolean;
  toggleStreamAudio: (url: string) => void;
  shareScreen: () => Promise<void>;
  stopScreenShare: () => void;
  isScreenSharing: boolean;
  screenStreamUrl: string | null;
  voiceUsers: VoiceUser[];
  joinedChannelId: string | null;
};

interface UserJoinPayload {
  channelId: string;
  serverId: null | string;
  userId: string;
}

interface SignalPayload {
  signal: any;
  fromUserId: string;
  channelId: string;
}

const CallContext = createContext<CallContextValue | null>(null);

export interface VideoStreamInfo {
  url: string;
  label: string;
  audioTrack?: any;
  muted?: boolean;
}

export interface VoiceUser {
  userId: string;
  channelId: string;
  serverId: null | string;
  peer?: any;
  connected?: boolean;
  videoStreams?: VideoStreamInfo[];
}

export const CallProvider = (props: { children: JSX.Element }) => {
  const [joinedChannelId, setJoinedChannelId] = useState<string | null>(null);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const peersRef = useRef<Map<string, any>>(new Map());

  const appState = useRef(AppState.currentState);
  const interval = useRef<IntervalId>(0);

  const { socket } = useSocket();

  const peerKey = (channelId: string, userId: string) =>
    `${channelId}:${userId}`;

  const micStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStreamUrl, setScreenStreamUrl] = useState<string | null>(null);
  // Updated by the InCallManager "onAudioDeviceChanged" event.
  const audioDeviceRef = useRef<string>('');
  const audioDevicesRef = useRef<string[]>([]);
  const [audioDevice, setAudioDevice] = useState<string>('');

  const startCallNotification = async () => {
    const channelId = await notifee.createChannel({
      id: 'voice_call',
      name: 'Voice Call',
      importance: AndroidImportance.HIGH,
    });
    await notifee.displayNotification({
      title: 'Voice call in progress',
      body: 'Tap to return to the call',
      android: {
        channelId,
        asForegroundService: true,
        ongoing: true,
        onlyAlertOnce: true,
        localOnly: true,
        category: AndroidCategory.CALL,
        pressAction: { id: 'default' },
      },
    });
  };

  const stopCallNotification = async () => {
    await notifee.stopForegroundService();
  };

  const _handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      const isInCall = !!joinedChannelId;

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        BackgroundTimer.clearInterval(interval.current);
      } else if (isInCall) {
        console.log('app goes to background while in call');
        const i = BackgroundTimer.setInterval(() => {
          console.log('connection status ', socket?.connected);
          socket?.emit('online');
        }, 5000);
        interval.current = i;
      }

      appState.current = nextAppState;
      console.log('AppState', appState.current);
    },
    [socket, joinedChannelId],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      _handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [_handleAppStateChange]);

  // The proximity sensor should only blank the screen in earpiece/call mode.
  // Speakerphone and any headset (Bluetooth or wired) keep the screen on.
  const updateProximitySensor = useCallback(() => {
    const device = audioDeviceRef.current;
    if (
      !joinedChannelId ||
      device === 'SPEAKER_PHONE' ||
      device === 'BLUETOOTH' ||
      device === 'WIRED_HEADSET'
    ) {
      inCallManager.stopProximitySensor();
    } else {
      inCallManager.startProximitySensor();
    }
  }, [joinedChannelId]);

  useEffect(() => {
    if (!NativeModules.InCallManager) return;
    const emitter = new NativeEventEmitter(NativeModules.InCallManager);
    const subscription = emitter.addListener(
      'onAudioDeviceChanged',
      (event: {
        selectedAudioDevice?: string;
        availableAudioDeviceList?: string | string[];
      }) => {
        audioDeviceRef.current = event?.selectedAudioDevice || '';
        setAudioDevice(audioDeviceRef.current);
        setCallAudioState(true, audioDeviceRef.current);

        const raw = event?.availableAudioDeviceList;
        let available: string[] = [];
        if (Array.isArray(raw)) {
          available = raw;
        } else if (typeof raw === 'string') {
          try {
            available = JSON.parse(raw);
          } catch (error) {
            available = [];
          }
        }
        audioDevicesRef.current = available.filter(
          device => device && device !== 'NONE',
        );
        updateProximitySensor();
      },
    );
    return () => subscription.remove();
  }, [updateProximitySensor]);

  // Cycles through the outputs Android reports for the current call, so the
  // user can pick Bluetooth / wired headset / speaker / earpiece without
  // having to know what each one means.
  const cycleAudioRoute = useCallback(async () => {
    const available = audioDevicesRef.current;
    const current = audioDeviceRef.current;

    if (!available.length || !current) {
      const speakerOn = current === 'SPEAKER_PHONE';
      inCallManager.setForceSpeakerphoneOn(
        (speakerOn ? undefined : true) as any,
      );
      return;
    }

    const index = available.indexOf(current);
    const next = available[(index + 1) % available.length];
    try {
      await inCallManager.chooseAudioRoute(next);
      audioDeviceRef.current = next;
      setAudioDevice(next);
      setCallAudioState(true, next);
    } catch (error) {
      console.warn('Could not change audio output:', error);
    }
  }, []);

  const toggleMic = () => {
    const next = !isMicMuted;
    setIsMicMuted(next);
    // Mute at the system level and also disable the WebRTC audio track so no
    // sound is sent to the other participants.
    inCallManager.setMicrophoneMute(next);
    micStreamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = !next;
    });
  };

  const stopScreenShare = useCallback(() => {
    const stream = screenStreamRef.current;
    if (!stream) return;

    peersRef.current.forEach(peer => {
      try {
        peer.removeStream(stream);
      } catch (error) {
        console.warn('Could not remove screen stream from peer:', error);
      }
    });
    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (error) {
        console.warn('Could not stop screen track:', error);
      }
    });

    screenStreamRef.current = null;
    setIsScreenSharing(false);
    setScreenStreamUrl(null);
  }, []);

  const shareScreen = useCallback(async () => {
    if (!joinedChannelId) {
      console.warn('Join a voice channel before sharing the screen.');
      return;
    }
    if (Platform.OS !== 'android') {
      console.warn('Screen sharing is only supported on Android.');
      return;
    }
    if (screenStreamRef.current) return;

    try {
      // react-native-webrtc opens the Android MediaProjection consent dialog
      // and returns a MediaStream containing the captured screen video track.
      const stream = await mediaDevices.getDisplayMedia();
      if (!stream.getVideoTracks().length) {
        console.warn('Screen share returned no video track.');
        return;
      }

      screenStreamRef.current = stream;
      setScreenStreamUrl(stream.toURL());
      setIsScreenSharing(true);

      peersRef.current.forEach(peer => {
        try {
          peer.addStream(stream);
        } catch (error) {
          console.warn('Could not add screen stream to peer:', error);
        }
      });

      const videoTrack = stream.getVideoTracks()[0];
      // The system stops capture from the notification/tile or when the
      // projection is revoked, so mirror that into our state.
      (videoTrack as any).onended = () => stopScreenShare();
      console.log('Screen share started');
    } catch (error) {
      // A cancelled consent dialog lands here; leave the UI untouched.
      console.warn('Screen share cancelled or failed:', error);
    }
  }, [joinedChannelId, stopScreenShare]);

  const setVoiceChannelUser = (
    channelId: string,
    userId: string,
    voiceUser: VoiceUser,
  ) => {
    setVoiceUsers(prev => {
      const exists = prev.some(
        u => u.userId === userId && u.channelId === channelId,
      );
      if (exists) {
        return prev.map(u =>
          u.userId === userId && u.channelId === channelId ? voiceUser : u,
        );
      }
      return [...prev, voiceUser];
    });
  };

  // Update only the native fields of a participant, without dropping the peer
  // or the connection state that may have been set by another callback.
  const patchVoiceUser = (
    channelId: string,
    userId: string,
    patch: Partial<VoiceUser>,
  ) => {
    setVoiceUsers(prev =>
      prev.map(u =>
        u.userId === userId && u.channelId === channelId ? { ...u, ...patch } : u,
      ),
    );
  };

  // The server can resend the voice participant list at any time. Keep the
  // native peer/video state attached to the users that are still in the call.
  const setVoiceUsersFromServer = (incoming: VoiceUser[]) => {
    setVoiceUsers(prev => {
      const previous = new Map(
        prev.map(u => [peerKey(u.channelId, u.userId), u]),
      );
      return incoming.map(u => {
        const old = previous.get(peerKey(u.channelId, u.userId));
        if (!old) return u;
        return {
          ...u,
          peer: old.peer,
          connected: old.connected,
          videoStreams: old.videoStreams,
        };
      });
    });
  };

  const removeRemoteVideo = (voiceUser: VoiceUser, url: string) => {
    setVoiceUsers(prev =>
      prev.map(u =>
        u.userId === voiceUser.userId && u.channelId === voiceUser.channelId
          ? {
              ...u,
              videoStreams: (u.videoStreams || []).filter(s => s.url !== url),
            }
          : u,
      ),
    );
  };

  const attachRemoteVideo = (voiceUser: VoiceUser, stream: MediaStream) => {
    const videoTracks = stream.getVideoTracks?.() || [];
    if (!videoTracks.length) return;

    const url = stream.toURL();
    const audioTrack = stream.getAudioTracks?.()[0];
    console.log('Remote video stream received from', voiceUser.userId);

    // The site only sends one video stream per person. Replace the previous
    // one instead of leaving a duplicate with the same name behind when
    // someone stops sharing and starts a new transmission.
    setVoiceUsers(prev =>
      prev.map(u =>
        u.userId === voiceUser.userId && u.channelId === voiceUser.channelId
          ? {
              ...u,
              videoStreams: [
                {
                  url,
                  label: `Transmissão de ${u.userId}`,
                  audioTrack,
                  muted: false,
                },
              ],
            }
          : u,
      ),
    );

    const remove = () => removeRemoteVideo(voiceUser, url);
    videoTracks.forEach(track => {
      (track as any).onended = remove;
    });
    (stream as any).onremovetrack = (event: any) => {
      if (event?.track?.kind === 'video') remove();
    };
  };

  const toggleStreamAudio = (url: string) => {
    setVoiceUsers(prev =>
      prev.map(u => ({
        ...u,
        videoStreams: (u.videoStreams || []).map(s => {
          if (s.url !== url) return s;
          const nextMuted = !s.muted;
          s.audioTrack?._setVolume?.(nextMuted ? 0 : 1);
          return { ...s, muted: nextMuted };
        }),
      })),
    );
  };

  useSocketListener(
    'voice:user_left',
    async (data: { channelId: string; userId: string }) => {
      if ((await getUserId()) === data.userId) {
        if (joinedChannelId === data.channelId) {
          leaveCall();
        }
      }

      const key = peerKey(data.channelId, data.userId);

      peersRef.current.get(key)?.destroy();
      peersRef.current.delete(key);
      setVoiceUsers(prev =>
        prev.filter(
          u => u.userId !== data.userId || u.channelId !== data.channelId,
        ),
      );
    },
  );

  useSocketListener('voice:user_joined', async (data: UserJoinPayload) => {
    setVoiceChannelUser(data.channelId, data.userId, data);

    if ((await getUserId()) === data.userId) return;
    if (joinedChannelId === data.channelId) {
      createPeer(data);
    }
  });

  const createPeer = (voiceUser: VoiceUser, signal?: any) => {
    const key = peerKey(voiceUser.channelId, voiceUser.userId);
    const existingPeer = peersRef.current.get(key);

    console.log(micStreamRef.current);
    const peer =
      existingPeer ||
      new SimplePeer({
        trickle: true,
        initiator: !signal,
        wrtc: {
          RTCPeerConnection,
          RTCIceCandidate,
          RTCSessionDescription,
        },
        streams: [
          micStreamRef.current,
          screenStreamRef.current,
        ].filter(Boolean) as MediaStream[],
        config: {
          iceServers: [
            {
              urls: 'stun:stun.l.google.com:19302',
            },
          ],
        },
      });
    if (!existingPeer) {
      peersRef.current.set(key, peer);

      setVoiceChannelUser(voiceUser.channelId, voiceUser.userId, {
        ...voiceUser,
        peer,
      });

      peer.on('error', (error: any) => {
        console.error('Peer error:', error);
      });
      peer.on('connect', () => {
        console.log('CONNECTED');
        // Patch instead of replacing the whole user object: a video stream may
        // have arrived before the connection was established.
        patchVoiceUser(voiceUser.channelId, voiceUser.userId, {
          connected: true,
        });
      });
      peer.on('stream', (stream: MediaStream) => {
        attachRemoteVideo(voiceUser, stream);
      });
      peer.on('track', (track: any, stream: MediaStream) => {
        if (track?.kind === 'video' && stream) {
          attachRemoteVideo(voiceUser, stream);
        }
      });
      peer.on('close', () => {
        console.log('CLOSED');
        patchVoiceUser(voiceUser.channelId, voiceUser.userId, {
          connected: false,
          videoStreams: [],
        });
      });

      peer.on('signal', (newSignal: any) => {
        socket?.emit('voice:signal_send', {
          channelId: voiceUser.channelId,
          toUserId: voiceUser.userId,
          signal: newSignal,
        });
      });
    }
    if (signal) {
      peer.signal(signal);
    }
  };

  useSocketListener('voice:signal_received', (data: SignalPayload) => {
    if (!joinedChannelId) return;
    const key = peerKey(data.channelId, data.fromUserId);
    const existingPeer = peersRef.current.get(key);

    const voiceUser = voiceUsers.find(
      u => u.userId === data.fromUserId && u.channelId === data.channelId,
    );

    if (existingPeer) {
      existingPeer.signal(data.signal);
      return;
    }
    if (voiceUser) {
      createPeer(voiceUser, data.signal);
    }
  });

  const leaveCall = useCallback(() => {
    stopScreenShare();
    BackgroundTimer.clearInterval(interval.current);
    stopCallNotification();
    peersRef.current.forEach(peer => peer.destroy());
    peersRef.current.clear();

    setVoiceUsers(prev => {
      return prev.map(u => {
        return {
          ...u,
          connected: false,
          peer: undefined,
          videoStreams: [],
        };
      });
    });
    setJoinedChannelId(null);
    inCallManager.stop();
    audioDeviceRef.current = '';
    setCallAudioState(false, '');
    inCallManager.setMicrophoneMute(false);
    setIsMicMuted(false);
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
  }, [stopScreenShare]);

  const joinCall = useCallback(
    async (channelId: string) => {
      leaveCall();

      // Android 12+ needs this runtime permission before InCallManager can
      // query the connected Bluetooth headset and open the SCO audio route.
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          );
        } catch (error) {
          console.warn('BLUETOOTH_CONNECT permission request failed:', error);
        }
      }

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      micStreamRef.current = stream;
      inCallManager.start({ media: 'audio' });
      // start() already enables KEEP_SCREEN_ON and the proximity sensor. The
      // sensor is then adjusted whenever the audio output changes.
      inCallManager.setKeepScreenOn(true);

      setIsMicMuted(false);
      inCallManager.setMicrophoneMute(false);
      // null = automatic route. Passing false forces the earpiece and blocks
      // the Bluetooth headset.
      inCallManager.setForceSpeakerphoneOn(undefined as any);
      setCallAudioState(true, audioDeviceRef.current);
      const token = await getUserToken();
      fetch(`https://nerimity.com/api/channels/${channelId}/voice/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token || '',
        },
        body: JSON.stringify({
          socketId: socket?.id,
        }),
      }).then(res => {
        if (res.ok) {
          setJoinedChannelId(channelId);
          startCallNotification();
        }
      });
    },
    [leaveCall, socket?.id],
  );

  const endCall = useCallback(async () => {
    if (!joinedChannelId) return;
    leaveCall();

    const token = await getUserToken();
    fetch(`https://nerimity.com/api/channels/${joinedChannelId}/voice/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token || '',
      },
      body: JSON.stringify({
        socketId: socket?.id,
      }),
    });
  }, [joinedChannelId, leaveCall, socket?.id]);

  const value = {
    joinCall,
    setVoiceUsers: setVoiceUsersFromServer,
    voiceUsers,
    joinedChannelId,
    endCall,
    cycleAudioRoute,
    audioDevice,
    toggleMic,
    isMicMuted,
    toggleStreamAudio,
    shareScreen,
    stopScreenShare,
    isScreenSharing,
    screenStreamUrl,
  } as CallContextValue;

  return (
    <CallContext.Provider value={value}>{props.children}</CallContext.Provider>
  );
};
export const useCall = () => {
  const call = useContext(CallContext);
  if (!call) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return call;
};

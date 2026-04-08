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
import { AppState, AppStateStatus } from 'react-native';

type CallContextValue = {
  joinCall: (channelId: string) => Promise<void>;
  endCall: () => void;
  setVoiceUsers: (users: VoiceUser[]) => void;
  toggleSpeaker: () => void;
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

export interface VoiceUser {
  userId: string;
  channelId: string;
  serverId: null | string;
  peer?: any;
  connected?: boolean;
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

  const [isSpeaker, setIsSpeaker] = useState(false);

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

  const toggleSpeaker = () => {
    const next = !isSpeaker;
    inCallManager.setForceSpeakerphoneOn(next);
    setIsSpeaker(next);
  };

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
        stream: micStreamRef.current ?? undefined,
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

      peer.on('error', error => {
        console.error('Peer error:', error);
      });
      peer.on('connect', () => {
        console.log('CONNECTED');
        setVoiceChannelUser(voiceUser.channelId, voiceUser.userId, {
          ...voiceUser,
          connected: true,
        });
      });
      peer.on('close', () => {
        console.log('CLOSED');
        if (!voiceUsers.find(v => v.peer === peer)) return;
        setVoiceChannelUser(voiceUser.channelId, voiceUser.userId, {
          ...voiceUser,
          connected: false,
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
    BackgroundTimer.clearInterval(interval.current);
    stopCallNotification();
    peersRef.current.forEach(peer => peer.destroy());
    peersRef.current.clear();

    setVoiceUsers(prev => {
      return prev.map(u => {
        return { ...u, connected: false, peer: undefined };
      });
    });
    setJoinedChannelId(null);
    inCallManager.stop();
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
  }, []);

  const joinCall = useCallback(
    async (channelId: string) => {
      leaveCall();
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      console.log('stream tracks:', stream.getTracks());
      console.log('track enabled:', stream.getTracks()[0]?.enabled);
      console.log('track muted:', stream.getTracks()[0]?.muted);
      micStreamRef.current = stream;
      inCallManager.start({ media: 'audio' });

      setIsSpeaker(false);
      inCallManager.setForceSpeakerphoneOn(false);
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
    setVoiceUsers,
    voiceUsers,
    joinedChannelId,
    endCall,
    toggleSpeaker,
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
